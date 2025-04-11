// src/components/ReviewEditor.tsx
import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import { invoke } from '@tauri-apps/api/core';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import TableChartIcon from '@mui/icons-material/TableChart';
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
  title?: string;
  content?: string;
  product_status?: string;
  review_status?: string;
  updated_at?: string;
  created_at?: string;
}

interface LocalDraft {
  title: string;
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
}

interface ReviewEditorProps {
  productId: number;
  productName?: string;
  onReviewUpdated?: () => void;
  initialReview?: Review | null;
  initialContent?: string;  // New prop for draft content
  onSaveDraft?: (content: string) => void;  // New prop for saving drafts
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!editor) {
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
  productId, 
  productName, 
  onReviewUpdated = () => {},
  initialReview = null,
  initialContent = null,
  onSaveDraft = null
}) => {
  // State for the review editor
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [productStatus, setProductStatus] = useState<string>('InReview');
  const [reviewStatus, setReviewStatus] = useState<string>(REVIEW_STATUS.DRAFT);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [dialogAction, setDialogAction] = useState<'load_draft' | 'submit' | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [reviewId, setReviewId] = useState<number | null>(null);
  
  // Reference to auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Configure the TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Exclude the default image extension
        image: false,
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
    onUpdate: ({ editor }) => {
      // Start auto-save timer when content changes
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraftLocally(editor.getHTML());
      }, 3000); // Auto-save after 3 seconds of inactivity
    },
  });

  // Load initial content on component mount
  useEffect(() => {
    const loadLocalDraftFromFilesystem = async () => {
      try {
        // Try to load from filesystem first
        const fsContent = await invoke<string>('load_review_draft', {
          product_id: productId
        }).catch(() => null); // Ignore errors if no draft exists
        
        if (fsContent && editor) {
          editor.commands.setContent(fsContent);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error loading draft from filesystem:', err);
        return false;
      }
    };
    
    const loadLocalDraftFromBrowser = () => {
      const draftKey = `review_draft_${productId}`;
      const savedDraft = localStorage.getItem(draftKey);
      
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft) as LocalDraft;
          setLocalDraft(parsedDraft);
          
          // Only load browser draft if we don't have a filesystem draft
          if (!initialContent && !initialReview && editor) {
            editor.commands.setContent(parsedDraft.content || '');
            setReviewTitle(parsedDraft.title || '');
            setProductStatus(parsedDraft.product_status || 'InReview');
            return true;
          }
        } catch (err) {
          console.error('Error parsing local draft:', err);
          localStorage.removeItem(draftKey);
        }
      }
      return false;
    };
    
    const initializeEditor = async () => {
      // Set from initialReview if available
      if (initialReview) {
        setReviewTitle(initialReview.title || '');
        setProductStatus(initialReview.product_status || 'InReview');
        setReviewStatus(initialReview.review_status || REVIEW_STATUS.DRAFT);
        setReviewId(initialReview.id || null);
        
        if (editor && initialReview.content) {
          editor.commands.setContent(initialReview.content);
          return;
        }
      }
      
      // Use initialContent if provided directly
      if (initialContent && editor) {
        editor.commands.setContent(initialContent);
        return;
      }
      
      // Otherwise try to load from filesystem
      const filesystemLoaded = await loadLocalDraftFromFilesystem();
      if (!filesystemLoaded) {
        // Finally try browser storage
        loadLocalDraftFromBrowser();
      }
    };
    
    if (editor) {
      initializeEditor();
    }
    
    // Cleanup timer when component unmounts
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [productId, initialReview, initialContent, editor]);

  // Function to save draft locally
  const saveDraftLocally = async (content: string) => {
    if (!editor || !content) return;
    
    try {
      // Save to localStorage for browser persistence
      const draftKey = `review_draft_${productId}`;
      const draft: LocalDraft = {
        title: reviewTitle,
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

  // Function to load local draft
  const loadLocalDraft = () => {
    if (!localDraft || !editor) return;
    
    setReviewTitle(localDraft.title || '');
    setProductStatus(localDraft.product_status || 'InReview');
    editor.commands.setContent(localDraft.content || '');
    
    setIsConfirmDialogOpen(false);
  };
  
  // Function to sync draft to server
  const syncToServer = async () => {
    if (!editor) return;

    setIsSyncing(true);

    try {
      const content = editor.getHTML();

      // Create/Update review with DRAFT status
      if (reviewId) {
        await invoke('update_review', {
          review_id: reviewId,
          review: {
            title: reviewTitle,
            content,
            product_status: productStatus,
            review_status: 'Draft',
          },
        });
      } else {
        const result = await invoke('create_review', {
          product_id: productId,
          review: {
            title: reviewTitle,
            content,
            product_id: productId,
            product_status: productStatus,
            review_status: 'Draft',
          },
        });
        setReviewId(result.data); // Backend returns the review ID
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
    if (!editor) return;

    setIsSubmitting(true);

    try {
      const content = editor.getHTML();

      if (reviewId) {
        await invoke('update_review', {
          review_id: reviewId,
          review: {
            title: reviewTitle,
            content,
            product_status: productStatus,
            review_status: 'Pending',
          },
        });
      } else {
        const result = await invoke('create_review', {
          product_id: productId,
          review: {
            title: reviewTitle,
            content,
            product_id: productId,
            product_status: productStatus,
            review_status: 'Pending',
          },
        });
        setReviewId(result.data); // Backend returns the review ID
      }

      setMessage({
        text: 'Review submitted for approval successfully',
        severity: 'success',
      });

      // Clear local draft after successful submission
      const draftKey = `review_draft_${productId}`;
      localStorage.removeItem(draftKey);
      setLocalDraft(null);

      onReviewUpdated();
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

  return (
    <Box sx={{ mb: 4 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          Review for: {productName || `Product #${productId}`}
        </Typography>
        
        <TextField
          label="Review Title"
          variant="outlined"
          fullWidth
          value={reviewTitle}
          onChange={(e) => setReviewTitle(e.target.value)}
          sx={{ mb: 3 }}
        />
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Product Status</InputLabel>
          <Select
            value={productStatus}
            label="Product Status"
            onChange={handleStatusChange}
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
          <MenuBar editor={editor} />
          <Box sx={{ p: 2, minHeight: 300 }}>
            <EditorContent editor={editor} />
          </Box>
        </Paper>
        
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
            Last auto-saved: {format(lastSaved, 'MMM d, yyyy h:mm a')}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => editor && saveDraftLocally(editor.getHTML())}
              sx={{ mr: 2 }}
            >
              Save Draft
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<CloudUploadIcon />}
              onClick={syncToServer}
              disabled={isSyncing}
            >
              {isSyncing ? <CircularProgress size={24} /> : 'Sync to Server'}
            </Button>
          </Box>
          
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={confirmSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Submit for Approval'}
          </Button>
        </Box>
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
