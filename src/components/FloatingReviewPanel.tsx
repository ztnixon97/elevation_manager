// src/components/FloatingReviewPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  Maximize as MaximizeIcon,
  RateReview as ReviewIcon,
  Assignment as ProductIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

interface Review {
  id: number;
  product_id: number;
  review_status: string;
  product_status: string;
  created_at: string;
  updated_at: string;
  product_name?: string;
  reviewer_name?: string;
  content?: string;
}

interface FloatingReviewPanelProps {
  review: Review | null;
  open: boolean;
  onClose: () => void;
  onViewFull?: (review: Review) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  minimizable?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'draft': return 'default';
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

const FloatingReviewPanel: React.FC<FloatingReviewPanelProps> = ({
  review,
  open,
  onClose,
  onViewFull,
  position = 'bottom-right',
  minimizable = true,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullDialog, setIsFullDialog] = useState(false);

  useEffect(() => {
    if (open && review) {
      setIsMinimized(false);
    }
  }, [open, review]);

  if (!review || !open) return null;

  const positionStyles = {
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'top-left': { top: 16, left: 16 },
  };

  const handleViewFull = () => {
    if (onViewFull) {
      onViewFull(review);
    } else {
      setIsFullDialog(true);
    }
  };

  return (
    <>
      {/* Floating Panel */}
      <Zoom in={open}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            ...positionStyles[position],
            width: isMinimized ? 280 : 400,
            maxHeight: isMinimized ? 60 : 500,
            zIndex: 1300,
            overflow: 'hidden',
            transition: 'all 0.3s ease-in-out',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              cursor: isMinimized ? 'pointer' : 'default',
            }}
            onClick={isMinimized ? () => setIsMinimized(false) : undefined}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <ReviewIcon fontSize="small" />
              <Typography variant="subtitle2" noWrap>
                Review #{review.id}
              </Typography>
              <Chip
                label={review.review_status}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'inherit',
                  height: 20,
                  fontSize: '0.7rem',
                }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {minimizable && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                  sx={{ color: 'inherit', p: 0.5 }}
                >
                  {isMinimized ? <MaximizeIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ color: 'inherit', p: 0.5, ml: 0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          <Fade in={!isMinimized}>
            <Box sx={{ p: 2, display: isMinimized ? 'none' : 'block' }}>
              {/* Product Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ProductIcon color="action" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  {review.product_name || `Product #${review.product_id}`}
                </Typography>
              </Box>

              {/* Review Info */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Status: {review.review_status} • Product: {review.product_status}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Created: {format(parseISO(review.created_at), 'MMM d, h:mm a')}
                </Typography>
                {review.updated_at !== review.created_at && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Updated: {format(parseISO(review.updated_at), 'MMM d, h:mm a')}
                  </Typography>
                )}
              </Box>

              {/* Content Preview */}
              {review.content && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Content Preview:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      maxHeight: 60,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: review.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
                    }}
                  />
                </Box>
              )}

              <Divider sx={{ my: 1 }} />

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleViewFull}
                >
                  View Full
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={onClose}
                >
                  Close
                </Button>
              </Box>
            </Box>
          </Fade>
        </Paper>
      </Zoom>

      {/* Full Review Dialog (fallback if no onViewFull prop) */}
      {!onViewFull && (
        <Dialog open={isFullDialog} onClose={() => setIsFullDialog(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            Review #{review.id} - {review.product_name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Chip 
                label={review.review_status} 
                color={getStatusColor(review.review_status) as any}
                sx={{ mr: 1 }} 
              />
              <Chip 
                label={`Product: ${review.product_status}`} 
                variant="outlined"
                size="small"
              />
            </Box>
            
            {review.content && (
              <Box
                sx={{
                  '& img': { maxWidth: '100%' },
                  '& table': { width: '100%', borderCollapse: 'collapse' },
                  '& td, & th': { border: '1px solid #ddd', padding: '8px' },
                }}
                dangerouslySetInnerHTML={{ __html: review.content }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsFullDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default FloatingReviewPanel;