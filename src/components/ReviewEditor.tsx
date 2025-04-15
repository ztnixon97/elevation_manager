// src/components/ReviewEditor.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  AlertColor,
  Divider,
  Chip,
} from '@mui/material';
import { invoke } from '@tauri-apps/api/core';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import TitleIcon from '@mui/icons-material/Title';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';

// TipTap imports
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

// Custom extensions
import { ResizableImage } from './ResizeableImageExtension'; 
// Custom toolbar styles
import './Tiptap.css';

import { mkdir, writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';

const REVIEW_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
];

const PRODUCT_STATUSES = [
  { value: 'InReview', label: 'In Review' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Accepted', label: 'Accepted' },
];

// Review statuses for internal use (not shown in UI)
const REVIEW_STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
};

interface Review {
  id?: number;
  product_id: number;
  content?: string;
  product_status?: string;
  review_status?: string;
  updated_at?: string;
  created_at?: string;
}

interface LocalDraft {
  content: string;
  product_status: string;
  last_saved: string;
}

interface MessageState {
  text: string;
  severity: AlertColor;
}

interface MenuBarProps {
  editor: Editor | null;
  readOnly?: boolean;
}

interface ReviewEditorProps {
  productId?: number;
  productName?: string;
  onReviewUpdated?: () => void;
  initialReview?: Review | null;
  initialContent?: string;
  onSaveDraft?: (content: string) => void;
  readOnly?: boolean;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor, readOnly = false }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!editor || readOnly) {
    return null;
  }

  const addImage = (url: string) => {
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setImageUrl('');
    setIsImageDialogOpen(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64Image = reader.result as string;
        addImage(base64Image);
      };
      reader.onerror = (error) => {
        console.error('Failed to read file:', error);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to convert image:', error);
    }
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <Box className="editor-menu" sx={{ mb: 2, p: 1, borderBottom: '1px solid #ddd' }}>
      <Button
        onClick={() => editor.chain().focus().toggleBold().run()}
        variant={editor.isActive('bold') ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
        title="Bold"
      >
        <FormatBoldIcon fontSize="small" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        variant={editor.isActive('italic') ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
        title="Italic"
      >
        <FormatItalicIcon fontSize="small" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        variant={editor.isActive('heading', { level: 2 }) ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
        title="Heading"
      >
        <TitleIcon fontSize="small" />
      </Button>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      <Button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        variant={editor.isActive('bulletList') ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
        title="Bullet List"
      >
        <FormatListBulletedIcon fontSize="small" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        variant={editor.isActive('orderedList') ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
        title="Numbered List"
      >
        <FormatListNumberedIcon fontSize="small" />
      </Button>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      {/* Image upload button that triggers file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileUpload}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outlined"
        size="small"
        sx={{ mr: 0.5 }}
        title="Upload Image"
      >
        <FileUploadIcon fontSize="small" />
      </Button>

      {/* Image URL button */}
      <Button
        onClick={() => setIsImageDialogOpen(true)}
        variant="outlined"
        size="small"
        sx={{ mr: 0.5 }}
        title="Insert Image URL"
      >
        <ImageIcon fontSize="small" />
      </Button>

      {/* Add Link Button */}
      <Button
        onClick={() => {
          const url = window.prompt('URL');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        variant={editor.isActive('link') ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
        title="Insert Link"
      >
        <LinkIcon fontSize="small" />
      </Button>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      {/* Table buttons */}
      <Button
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
        variant="outlined"
        size="small"
        sx={{ mr: 0.5 }}
        title="Insert Table"
      >
        <TableChartIcon fontSize="small" />
      </Button>
      
      {editor.isActive('table') && (
        <>
          <Button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            variant="outlined"
            size="small"
            sx={{ mr: 0.5 }}
            title="Add Column Before"
          >
            Col Before
          </Button>
          <Button
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            variant="outlined"
            size="small"
            sx={{ mr: 0.5 }}
            title="Add Column After"
          >
            Col After
          </Button>
          <Button
            onClick={() => editor.chain().focus().addRowBefore().run()}
            variant="outlined"
            size="small"
            sx={{ mr: 0.5 }}
            title="Add Row Before"
          >
            Row Before
          </Button>
          <Button
            onClick={() => editor.chain().focus().addRowAfter().run()}
            variant="outlined"
            size="small"
            sx={{ mr: 0.5 }}
            title="Add Row After"
          >
            Row After
          </Button>
          <Button
            onClick={() => editor.chain().focus().deleteTable().run()}
            variant="outlined"
            color="error"
            size="small"
            sx={{ mr: 0.5 }}
            title="Delete Table"
          >
            <DeleteIcon fontSize="small" />
          </Button>
        </>
      )}

      {/* Image URL Dialog */}
      <Dialog open={isImageDialogOpen} onClose={() => setIsImageDialogOpen(false)}>
        <DialogTitle>Insert Image URL</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Image URL"
            fullWidth
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsImageDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => addImage(imageUrl)}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const prepareDirectoryStructure = async (productId: number) => {
  console.log(`[Directory Setup] Starting directory preparation for product ${productId}`);
  try {
    // Create base reviews directory in AppData
    const reviewsPath = 'reviews';
    console.log(`[Directory Setup] Creating base directory at AppData/${reviewsPath}`);
    await mkdir(reviewsPath, { 
      baseDir: BaseDirectory.AppData,
      recursive: true 
    });
    console.log('[Directory Setup] Base directory created successfully');

    // Create product-specific directory
    const productPath = `reviews/${productId}`;
    console.log(`[Directory Setup] Creating product directory at AppData/${productPath}`);
    await mkdir(productPath, { 
      baseDir: BaseDirectory.AppData,
      recursive: true 
    });
    console.log('[Directory Setup] Product directory created successfully');

    // Return the product path for file operations
    return productPath;

  } catch (err) {
    const errorDetails = {
      productId,
      errorType: err instanceof Error ? err.constructor.name : 'Unknown',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    };
    
    console.error('[Directory Setup] Failed to create directory structure:', errorDetails);
    throw new Error(`Directory creation failed: ${errorDetails.message}`);
  }
};

const ReviewEditor: React.FC<ReviewEditorProps> = ({ 
  productId: propProductId, 
  productName: propProductName,
  onReviewUpdated = () => {},
  initialReview = null,
  initialContent = null,
  onSaveDraft = null,
  readOnly = false
}) => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  
  // State for loading
  const [loading, setLoading] = useState<boolean>(!!reviewId);
  
  // State for the review editor
  const [productId, setProductId] = useState<number | undefined>(
    propProductId || 
    (initialReview?.product_id) || 
    undefined
  );
  const [productName, setProductName] = useState<string | undefined>(propProductName);
  const [productStatus, setProductStatus] = useState<string>('InReview');
  const [reviewStatus, setReviewStatus] = useState<string>(REVIEW_STATUS.DRAFT);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [dialogAction, setDialogAction] = useState<'load_draft' | 'submit' | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [currentReviewId, setCurrentReviewId] = useState<number | null>(
    initialReview?.id || (reviewId ? parseInt(reviewId, 10) : null)
  );
  const [isReadOnly, setIsReadOnly] = useState<boolean>(readOnly);
  const [contentInitialized, setContentInitialized] = useState<boolean>(false);
  
  // Configure the TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Exclude the default image extension
      }),
      ResizableImage, // Use our custom resizable image extension
      Placeholder.configure({
        placeholder: 'Start writing your review here...',
      }),
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    editable: !isReadOnly,
  });

  // Fetch review details when reviewId is present
  useEffect(() => {
    const fetchReview = async () => {
      if (!reviewId) return;
      
      setLoading(true);
      try {
        console.log(`Fetching review with ID: ${reviewId}`);
        const response = await invoke<string | object>('get_review', { review_id: parseInt(reviewId, 10) });
        
        // Log the raw response for debugging
        console.log("API response:", response);
        
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        console.log("Parsed data:", data);
        
        // Handle different response formats
        let reviewDetails, content;
        
        if (data && data.review) {
          reviewDetails = data.review;
          content = data.content;
        } else if (data && data.data && data.data.review) {
          reviewDetails = data.data.review;
          content = data.data.content;
        } else {
          throw new Error("Invalid response format");
        }
        
        console.log("Review details:", reviewDetails);
        
        // Check for product_id
        if (!reviewDetails.product_id) {
          console.error("No product_id found in review:", reviewDetails);
          setMessage({
            text: 'Review data missing product ID. Try returning to products page.',
            severity: 'error'
          });
          setLoading(false);
          return;
        }
        
        // Update state with fetched review details
        setCurrentReviewId(reviewDetails.id);
        setProductId(reviewDetails.product_id);
        console.log(`Setting product ID to: ${reviewDetails.product_id}`);
        
        setProductStatus(reviewDetails.product_status || 'InReview');
        setReviewStatus(reviewDetails.review_status || REVIEW_STATUS.DRAFT);
        
        // Set read-only mode based on review status
        const statusLower = reviewDetails.review_status?.toLowerCase() || '';
        const isEditable = statusLower === 'draft' || statusLower === 'rejected';
        setIsReadOnly(!isEditable);
        
        // Update editor content
        if (editor && content) {
          console.log('Setting editor content from API route response');
          editor.commands.setContent(content);
          setContentInitialized(true);
        }
        
        // Fetch product details for the name
        try {
          const productResponse = await invoke<string | object>('get_product_details', {
            product_id: reviewDetails.product_id
          });
          const productData = typeof productResponse === 'string' 
            ? JSON.parse(productResponse) 
            : productResponse;
            
          if (productData.success && productData.data) {
            setProductName(productData.data.product.site_id || `Product #${reviewDetails.product_id}`);
          }
        } catch (err) {
          console.warn('Could not fetch product details:', err);
          setProductName(`Product #${reviewDetails.product_id}`);
        }
      } catch (err) {
        console.error('Error fetching review:', err);
        setMessage({
          text: typeof err === 'string' ? err : 'Failed to load review',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    // If review ID is in URL, fetch that review
    if (reviewId && editor) {
      fetchReview();
    }
  }, [reviewId, editor]);

  // Effect to handle initialContent changes
  useEffect(() => {
    if (editor && initialContent && !contentInitialized) {
      console.log('Setting editor content from initialContent prop');
      editor.commands.setContent(initialContent);
      setContentInitialized(true);
    }
  }, [initialContent, editor, contentInitialized]);

  // Effect to handle initialReview
  useEffect(() => {
    if (!initialReview || !editor || contentInitialized) return;
    
    console.log('Processing initialReview:', initialReview);
    const normalizeProductStatus = (status: string): string => {
      const normalized = status.replace(/\s+/g, '');
      return PRODUCT_STATUSES.find(ps => ps.value === normalized) ? normalized : 'InReview';
    };
    
    // Set basic review fields
    setProductStatus(normalizeProductStatus(initialReview.product_status || ''));
    setReviewStatus(initialReview.review_status || REVIEW_STATUS.DRAFT);
    
    // Check for content in initialReview
    if (initialReview.content) {
      console.log('Setting editor content from initialReview.content');
      editor.commands.setContent(initialReview.content);
      setContentInitialized(true);
    } 
    // If no content but has ID, fetch content
    else if (initialReview.id) {
      const fetchReviewContent = async () => {
        try {
          console.log(`Fetching content for review ID: ${initialReview.id}`);
          const response = await invoke<string | object>('get_review', { 
            review_id: initialReview.id 
          });
          
          const data = typeof response === 'string' 
            ? JSON.parse(response) 
            : response;
          
          console.log('Review content fetch response:', data);
          
          // Check different possible response formats
          let content = null;
          if (data.data && data.data.content) {
            content = data.data.content;
          } else if (data.content) {
            content = data.content;
          } else if (data.review && data.review.content) {
            content = data.review.content;
          }
          
          if (content) {
            console.log('Setting editor content from API fetch in initialReview effect');
            editor.commands.setContent(content);
            setContentInitialized(true);
          }
        } catch (err) {
          console.error('Error fetching review content:', err);
        }
      };
      
      fetchReviewContent();
    } 
    // This is a new review - check if we should load a browser draft
    else if (initialReview.product_id && !initialReview.id) {
      // For a new review, only load a browser draft if explicitly requested
      // We're NOT automatically loading the browser draft here anymore
      console.log('This appears to be a new review - not loading browser draft automatically');
      setContentInitialized(true); // Mark as initialized with empty content
    }
  }, [initialReview, editor, contentInitialized]);


  // Update editor's editable state when isReadOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [isReadOnly, editor]);

  // Function to save draft locally
  const saveDraftLocally = async (content: string) => {
    if (!editor || !content || !productId || isReadOnly) return;
    
    try {
      // Save to localStorage for browser persistence
      const draftKey = `review_draft_${productId}`;
      const draft: LocalDraft = {
        content: content,
        product_status: productStatus,
        last_saved: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      
      // Also save to filesystem via Tauri
      if (onSaveDraft) {
        onSaveDraft(content);
      } else {
        await invoke('save_review_draft', {
          product_id: productId,
          content: content,
        });
      }
      
      setLastSaved(new Date());
      setLocalDraft(draft);
      
      setMessage({
        text: 'Draft saved locally',
        severity: 'success',
      });
    } catch (err) {
      console.error('Failed to save draft locally:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to save draft locally',
        severity: 'error',
      });
    }
  };

  const checkForBrowserDraft = async (pid: number): Promise<boolean> => {
    const draftKey = `review_draft_${pid}`;
    const draftData = localStorage.getItem(draftKey);
    
    if (draftData) {
      try {
        const parsedDraft = JSON.parse(draftData);
        // Set up the dialog to ask user if they want to load it
        setLocalDraft(parsedDraft);
        setDialogAction('load_draft');
        setIsConfirmDialogOpen(true);
        return true;
      } catch (e) {
        console.error('Error parsing browser draft:', e);
        return false;
      }
    }
    return false;
  };
  // Function to load local draft
  const loadLocalDraft = () => {
    if (!localDraft || !editor) return;
    
    setProductStatus(localDraft.product_status || 'InReview');
    editor.commands.setContent(localDraft.content || '');
    
    setIsConfirmDialogOpen(false);
  };
  
  // Function to sync draft to server
  const syncToServer = async () => {
    if (!editor || !productId) return;

    setIsSyncing(true);

    try {
      const content = editor.getHTML();

      // Create/Update review with DRAFT status
      if (currentReviewId) {
        await invoke('update_review', {
          review_id: currentReviewId,
          review: {
            content,
            product_status: productStatus,
            review_status: 'Draft',
          },
        });
      } else {
        const result = await invoke('create_review', {
          product_id: productId,
          review: {
            content,
            product_id: productId,
            product_status: productStatus,
            review_status: 'Draft',
          },
        });
        const data = result as any;
        setCurrentReviewId(data.data); // Backend returns the review ID
      }

      setMessage({ text: 'Review synced successfully', severity: 'success' });
      onReviewUpdated();
    } catch (err) {
      console.error('Error syncing review:', err);
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to sync review',
        severity: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Function to submit review for approval
  const submitForApproval = async () => {
    if (!editor || !productId) return;

    setIsSubmitting(true);

    try {
      const content = editor.getHTML();

      if (currentReviewId) {
        await invoke('update_review', {
          review_id: currentReviewId,
          review: {
            content,
            product_status: productStatus,
            review_status: 'Pending',
          },
        });
      } else {
        const result = await invoke('create_review', {
          product_id: productId,
          review: {
            content,
            product_id: productId,
            product_status: productStatus,
            review_status: 'Pending',
          },
        });
        const data = result as any;
        setCurrentReviewId(data.data); // Backend returns the review ID
      }

      setMessage({
        text: 'Review submitted for approval successfully',
        severity: 'success',
      });

      // Clear local draft after successful submission
      if (productId) {
        const draftKey = `review_draft_${productId}`;
        localStorage.removeItem(draftKey);
        setLocalDraft(null);
      }

      // Set review to read-only after submission
      setIsReadOnly(true);
      if (editor) {
        editor.setEditable(false);
      }

      onReviewUpdated();
      
      // Navigate back to products after a short delay
      setTimeout(() => {
        if (productId) {
          navigate(`/products/${productId}`);
        } else {
          navigate('/products');
        }
      }, 2000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to submit review',
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show confirm dialog before submitting
  const confirmSubmit = () => {
    setDialogAction('submit');
    setIsConfirmDialogOpen(true);
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setProductStatus(event.target.value);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!productId && !loading) {
    console.error("Missing product ID for review", { 
      reviewId, 
      currentReviewId, 
      productId
    });
    return (
      <Box p={4}>
        <Alert severity="error">
          Missing product ID for review. 
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ ml: 2 }}
            onClick={() => navigate('/products')}
          >
            Return to Products
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>
      {/* Main Content */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          Review for: {productName || `Product #${productId}`}
          {isReadOnly && (
            <Chip 
              label="Read Only" 
              color="info" 
              size="small" 
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Product Status</InputLabel>
          <Select
            value={productStatus}
            label="Product Status"
            onChange={handleStatusChange}
            disabled={isReadOnly}
          >
            {PRODUCT_STATUSES.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                {status.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Review Content
        </Typography>
        
        <Paper 
          elevation={1} 
          sx={{ 
            mb: 3, 
            border: '1px solid #ddd', 
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          {!isReadOnly && <MenuBar editor={editor} readOnly={isReadOnly} />}
          <Box sx={{ p: 2, minHeight: 300 }}>
            <EditorContent editor={editor} />
          </Box>
        </Paper>
        
        {!isReadOnly && (
          <>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Tips:
              </Typography>
              <Typography variant="caption" color="text.secondary">
                • Paste or drag images directly into the editor
              </Typography>
              <Typography variant="caption" color="text.secondary">
                • Hover over an image to resize or align it
              </Typography>
              <Typography variant="caption" color="text.secondary">
                • Drag the corner handles to resize images
              </Typography>
            </Box>
            
            {lastSaved && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Last saved: {format(lastSaved, 'MMM d, yyyy h:mm a')}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={() => editor && saveDraftLocally(editor.getHTML())}
                  sx={{ mr: 2 }}
                  disabled={isReadOnly}
                >
                  Save Draft
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CloudUploadIcon />}
                  onClick={syncToServer}
                  disabled={isSyncing || isReadOnly}
                >
                  {isSyncing ? <CircularProgress size={24} /> : 'Sync to Server'}
                </Button>
              </Box>
              
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={confirmSubmit}
                disabled={isSubmitting || isReadOnly}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Submit for Approval'}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            {!isReadOnly && !contentInitialized && productId && (
              <Button 
                variant="text" 
                size="small"
                onClick={() => productId && checkForBrowserDraft(productId)}
              >
                Check for saved draft
              </Button>
            )}
          </Box>
          </>
        )}
        
        {isReadOnly && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (productId) {
                  navigate(`/products/${productId}`);
                } else {
                  navigate('/products');
                }
              }}
            >
              Back to Product
            </Button>
          </Box>
        )}
      </Paper>
      
      {/* Dialog for confirmations */}
      <Dialog open={isConfirmDialogOpen} onClose={() => setIsConfirmDialogOpen(false)}>
        <DialogTitle>
          {dialogAction === 'load_draft' ? 'Load Local Draft?' : 'Submit Review?'}
        </DialogTitle>
        <DialogContent>
          {dialogAction === 'load_draft' && localDraft && (
            <Typography>
              A local draft from {localDraft.last_saved && format(new Date(localDraft.last_saved), 'MMM d, yyyy h:mm a')} was found. 
              Would you like to load it?
            </Typography>
          )}
          {dialogAction === 'submit' && (
            <Typography>
              Are you sure you want to submit this review for approval? 
              Once submitted, it will be locked until approved or rejected by a team lead.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
          {dialogAction === 'load_draft' && (
            <Button onClick={loadLocalDraft} variant="contained" color="primary">
              Load Draft
            </Button>
          )}
          {dialogAction === 'submit' && (
            <Button onClick={submitForApproval} variant="contained" color="success">
              Submit
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Message snackbar */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setMessage(null)} severity={message?.severity || 'info'} variant="filled">
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReviewEditor;