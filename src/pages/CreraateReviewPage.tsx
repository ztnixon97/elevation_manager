// src/pages/CreateReviewPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Container,
  Paper,
  Divider,
  Tooltip,
  IconButton,
  Stack,
  Snackbar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReviewEditor from '../components/ReviewEditor';
import { format } from 'date-fns';

interface DraftInfo {
  title: string;
  last_saved: string;
  product_id: number;
}

interface MessageState {
  text: string;
  severity: 'success' | 'error';
}

const CreateReviewPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [message, setMessage] = useState<MessageState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load product details and draft data
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productId) return;
      
      try {
        setLoading(true);
        const response = await invoke<string>('get_product_details', {
          product_id: parseInt(productId, 10)
        });
        
        const data = JSON.parse(response);
        if (data.success && data.data) {
          setProduct(data.data.product);
          
          // Try to load draft from filesystem first
          await loadDraftFromFilesystem();
        } else {
          throw new Error(data.message || 'Failed to load product details');
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        setError(typeof err === 'string' ? err : 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId]);

  // Load draft from filesystem
  const loadDraftFromFilesystem = async () => {
    if (!productId) return;
    
    try {
      const content = await invoke<string>('load_review_draft', {
        product_id: parseInt(productId, 10)
      });
      setDraftContent(content);
      setHasDraft(true);
      
      // Create draftInfo for UI notification
      const now = new Date();
      setDraftInfo({
        title: 'Draft Review',
        last_saved: now.toISOString(),
        product_id: parseInt(productId, 10)
      });
      
      setMessage({
        text: 'Loaded existing draft from filesystem',
        severity: 'success'
      });
      
      return true;
    } catch (err) {
      // If no draft exists or other error, check localStorage as fallback
      const draftKey = `review_draft_${productId}`;
      const draftData = localStorage.getItem(draftKey);
      if (draftData) {
        try {
          const parsedDraft = JSON.parse(draftData);
          setHasDraft(true);
          setDraftInfo({
            title: parsedDraft.title || 'Untitled Review',
            last_saved: parsedDraft.last_saved,
            product_id: parseInt(productId, 10)
          });
          
          // Don't set draftContent here - the ReviewEditor will handle this
          // from localStorage directly if filesystem draft isn't available
          
          return true;
        } catch (e) {
          console.error('Error parsing localStorage draft:', e);
        }
      }
      return false;
    }
  };

  // Handle successful review update/creation
  const handleReviewUpdated = () => {
    // Clear local draft from localStorage
    if (productId) {
      const draftKey = `review_draft_${productId}`;
      localStorage.removeItem(draftKey);
    }
    
    // Navigate back to product details after successful update
    if (productId) {
      navigate(`/products/${productId}`);
    } else {
      navigate('/products');
    }
  };
  
  // Handle saving draft to filesystem
  const handleSaveDraft = async (content: string) => {
    if (!productId) return;
    
    try {
      await invoke('save_review_draft', {
        product_id: parseInt(productId, 10),
        content: content
      });
      
      setMessage({
        text: 'Draft saved to filesystem',
        severity: 'success'
      });
      
      // Update draft info for UI
      setHasDraft(true);
      setDraftInfo({
        title: 'Draft Review',
        last_saved: new Date().toISOString(),
        product_id: parseInt(productId, 10)
      });
    } catch (err) {
      console.error('Failed to save draft to filesystem:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to save draft',
        severity: 'error'
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !files.length) return;

    setImageUploading(true);
    try {
      // Convert to base64 for direct embedding in the editor
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          // Add to uploaded images array - this could be used by the editor
          const base64 = e.target.result.toString();
          setUploadedImages([...uploadedImages, base64]);
          
          // You could add logic here to notify the editor about the new image
          // e.g., through a context or by passing a callback
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to process image:", err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to process image',
        severity: 'error'
      });
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error">{error || 'Product not found'}</Alert>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/products')}>
            Back to Products
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4">
              Review for {product.site_id}
            </Typography>
          </Stack>
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImageUpload}
          />
          <Tooltip title="Upload external image">
            <IconButton 
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
            >
              <UploadFileIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {hasDraft && draftInfo && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You have a draft review from {format(new Date(draftInfo.last_saved), 'MMM d, yyyy h:mm a')}
          </Alert>
        )}
        
        <Divider sx={{ mb: 3 }} />
        
        <ReviewEditor 
          productId={parseInt(productId!, 10)}
          productName={product.site_id}
          initialContent={draftContent}
          onReviewUpdated={handleReviewUpdated}
          onSaveDraft={handleSaveDraft}
        />
      </Paper>
      
      {/* Message Snackbar */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setMessage(null)} 
          severity={message?.severity || 'info'} 
          variant="filled"
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateReviewPage;
