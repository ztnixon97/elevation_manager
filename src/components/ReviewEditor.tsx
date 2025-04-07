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
  AlertColor
} from '@mui/material';
import { invoke } from '@tauri-apps/api/core';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { format } from 'date-fns';

// TipTap imports
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

// Custom toolbar styles
import './Tiptap.css';

// Available review statuses for products
const PRODUCT_STATUSES = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_revision', label: 'Needs Revision' },
];

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
      // Call a Tauri command to handle file reading and conversion to base64
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
      // You can add error handling here
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
      >
        Bold
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        variant={editor.isActive('italic') ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
      >
        Italic
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        variant={editor.isActive('heading', { level: 2 }) ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
      >
        H2
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        variant={editor.isActive('bulletList') ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
      >
        Bullet List
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        variant={editor.isActive('orderedList') ? 'contained' : 'outlined'}
        size="small"
        sx={{ mr: 0.5 }}
      >
        Numbered List
      </Button>
      
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
        startIcon={<FileUploadIcon />}
        sx={{ mr: 0.5 }}
      >
        Upload Image
      </Button>

      {/* Image URL button */}
      <Button
        onClick={() => setIsImageDialogOpen(true)}
        variant="outlined"
        size="small"
        sx={{ mr: 0.5 }}
      >
        Image URL
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
      >
        Link
      </Button>

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

const ReviewEditor: React.FC<ReviewEditorProps> = ({ 
  productId, 
  productName, 
  onReviewUpdated = () => {},
  initialReview = null 
}) => {
  // State for the review editor
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [productStatus, setProductStatus] = useState<string>('reviewed');
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
      StarterKit,
      Image,
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

  // Load any existing draft from localStorage on component mount
  useEffect(() => {
    const loadLocalDraft = () => {
      const draftKey = `review_draft_${productId}`;
      const savedDraft = localStorage.getItem(draftKey);
      
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft) as LocalDraft;
          setLocalDraft(parsedDraft);
          
          // If no server review, offer to load the local draft
          if (!initialReview) {
            setIsConfirmDialogOpen(true);
            setDialogAction('load_draft');
          }
        } catch (err) {
          console.error('Error parsing local draft:', err);
          localStorage.removeItem(draftKey);
        }
      }
    };

    // Load initial review if provided
    if (initialReview) {
      setReviewTitle(initialReview.title || '');
      setProductStatus(initialReview.product_status || 'reviewed');
      setReviewId(initialReview.id || null);
      
      if (editor) {
        editor.commands.setContent(initialReview.content || '');
      }
    }
    
    loadLocalDraft();
    
    // Cleanup timer when component unmounts
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [productId, initialReview, editor]);

  // Function to save draft locally
  const saveDraftLocally = (content: string) => {
    if (!editor || !content) return;
    
    const draftKey = `review_draft_${productId}`;
    const draft: LocalDraft = {
      title: reviewTitle,
      content: content,
      product_status: productStatus,
      last_saved: new Date().toISOString(),
    };
    
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLastSaved(new Date());
    setLocalDraft(draft);
  };

  // Function to load local draft
  const loadLocalDraft = () => {
    if (!localDraft || !editor) return;
    
    setReviewTitle(localDraft.title || '');
    setProductStatus(localDraft.product_status || 'reviewed');
    editor.commands.setContent(localDraft.content || '');
    
    setIsConfirmDialogOpen(false);
  };

  // Function to sync draft to server
  const syncToServer = async () => {
    if (!editor) return;
    
    setIsSyncing(true);
    const content = editor.getHTML();
    
    try {
      // Check if we're updating an existing review or creating a new one
      if (reviewId) {
        await invoke('update_review', {
          reviewId,
          review: {
            title: reviewTitle,
            content,
            product_status: productStatus,
          },
        });
      } else {
        const result = await invoke<{ data: number }>('create_review', {
          productId,
          review: {
            title: reviewTitle,
            content,
            product_status: productStatus,
            review_status: 'draft',
          },
        });
        
        setReviewId(result.data);
      }
      
      setMessage({
        text: 'Review synced to server successfully',
        severity: 'success',
      });
      
      // Notify parent component
      onReviewUpdated();
      
    } catch (err) {
      console.error('Error syncing review to server:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to sync review to server',
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
    const content = editor.getHTML();
    
    try {
      // First sync to make sure content is saved
      if (!reviewId) {
        const result = await invoke<{ data: number }>('create_review', {
          productId,
          review: {
            title: reviewTitle,
            content,
            product_status: productStatus,
            review_status: 'pending',
          },
        });
        
        setReviewId(result.data);
      } else {
        // Update the existing review and change status to pending
        await invoke('update_review', {
          reviewId,
          review: {
            title: reviewTitle,
            content,
            product_status: productStatus,
            review_status: 'pending',
          },
        });
      }
      
      setMessage({
        text: 'Review submitted for approval successfully',
        severity: 'success',
      });
      
      // Clear local draft after successful submission
      const draftKey = `review_draft_${productId}`;
      localStorage.removeItem(draftKey);
      setLocalDraft(null);
      
      // Notify parent component
      onReviewUpdated();
      
    } catch (err) {
      console.error('Error submitting review:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to submit review',
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