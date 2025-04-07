// src/pages/TeamDashboard/components/ReviewsPanel.tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  Chip,
  IconButton,
  Paper,
  Divider,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from 'date-fns';

interface ReviewsPanelProps {
  teamId: number;
  isTeamLead: boolean;
}

interface Review {
  id: number;
  product_id: number;
  reviewer_id: number;
  review_status: string;
  product_status: string;
  review_path: string;
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
  product_name?: string;
}

const ReviewsPanel: React.FC<ReviewsPanelProps> = ({ teamId, isTeamLead }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewContent, setReviewContent] = useState<string>('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [teamId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Fetch team reviews
      const response = await invoke<string>('get_team_reviews', { team_id: teamId });
      const data = JSON.parse(response);
      
      if (data.data && Array.isArray(data.data)) {
        // Add reviewer and product names if available
        const reviewsWithNames = await Promise.all(
          data.data.map(async (review: Review) => {
            try {
              // Get reviewer name
              const userResponse = await invoke<string>('get_user', { id: review.reviewer_id });
              const userData = JSON.parse(userResponse);
              const reviewerName = userData.data?.username || 'Unknown';
              
              // Get product name
              const productResponse = await invoke<string>('get_product', { product_id: review.product_id });
              const productData = JSON.parse(productResponse);
              const productName = productData.data?.product?.site_id || 'Unknown';
              
              return {
                ...review,
                reviewer_name: reviewerName,
                product_name: productName,
              };
            } catch (err) {
              console.error('Failed to get name data:', err);
              return {
                ...review,
                reviewer_name: 'Unknown',
                product_name: 'Unknown',
              };
            }
          })
        );
        
        setReviews(reviewsWithNames);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch reviews',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'product_name', 
      headerName: 'Product', 
      flex: 1,
      valueGetter: (params :{ row: Review} ) => params.row.product_name || `Product #${params.row.product_id}`,
    },
    { 
      field: 'reviewer_name', 
      headerName: 'Reviewer', 
      flex: 1,
      valueGetter: (params: { row: Review}) => params.row.reviewer_name || `User #${params.row.reviewer_id}`,
    },
    { 
      field: 'review_status', 
      headerName: 'Status', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'approved' ? 'success' : 
            params.value === 'pending' ? 'warning' : 
            params.value === 'rejected' ? 'error' : 
            'default'
          }
        />
      )
    },
    { 
      field: 'created_at', 
      headerName: 'Submitted', 
      flex: 1,
      valueFormatter: (params: {row: Review}) => {
        return format(new Date(params.row.created_at as string), 'MMM d, yyyy');
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleViewClick(params.row)}
            title="View Review"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          
          {isTeamLead && params.row.review_status === 'pending' && (
            <>
              <IconButton
                size="small"
                onClick={() => handleApproveClick(params.row)}
                title="Approve Review"
                color="success"
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
              
              <IconButton
                size="small"
                onClick={() => handleRejectClick(params.row)}
                title="Reject Review"
                color="error"
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      ),
    },
  ];

  const handleViewClick = async (review: Review) => {
    setSelectedReview(review);
    setLoading(true);
    
    try {
      // Fetch review content
      const response = await invoke<string>('get_review', { review_id: review.id });
      const data = JSON.parse(response);
      
      if (data.data && data.data.content) {
        setReviewContent(data.data.content);
      } else {
        setReviewContent('No content available');
      }
      
      setIsViewDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch review content:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch review content',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (review: Review) => {
    if (!isTeamLead) return;
    setSelectedReview(review);
    setIsApproveDialogOpen(true);
  };

  const handleRejectClick = (review: Review) => {
    if (!isTeamLead) return;
    setSelectedReview(review);
    setIsRejectDialogOpen(true);
  };

  const approveReview = async () => {
    if (!selectedReview) return;
    
    setLoading(true);
    try {
      // Approve the review
      await invoke('approve_review', { review_id: selectedReview.id });
      
      // Update local state
      setReviews(reviews.map(r => 
        r.id === selectedReview.id 
          ? { ...r, review_status: 'approved' } 
          : r
      ));
      
      setMessage({
        text: 'Review approved successfully',
        severity: 'success',
      });
      setIsApproveDialogOpen(false);
    } catch (err) {
      console.error('Failed to approve review:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to approve review',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const rejectReview = async () => {
    if (!selectedReview) return;
    
    setLoading(true);
    try {
      // Reject the review
      await invoke('reject_review', { review_id: selectedReview.id });
      
      // Update local state
      setReviews(reviews.map(r => 
        r.id === selectedReview.id 
          ? { ...r, review_status: 'rejected' } 
          : r
      ));
      
      setMessage({
        text: 'Review rejected successfully',
        severity: 'success',
      });
      setIsRejectDialogOpen(false);
    } catch (err) {
      console.error('Failed to reject review:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to reject review',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Product Reviews</Typography>
        <Button variant="outlined" onClick={fetchReviews} disabled={loading}>
          Refresh
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <DataGrid
          rows={reviews}
          columns={columns}
          loading={loading}
          pagination
          disableRowSelectionOnClick
          autoHeight
        />
      </Box>

      {/* View Review Dialog */}
      <Dialog 
        open={isViewDialogOpen} 
        onClose={() => setIsViewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Review Details
          {selectedReview && (
            <Typography variant="subtitle2" color="text.secondary">
              {selectedReview.product_name || `Product #${selectedReview.product_id}`} - 
              Submitted by {selectedReview.reviewer_name || `User #${selectedReview.reviewer_id}`}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper elevation={0} sx={{ p: 2, mt: 1 }}>
              <div dangerouslySetInnerHTML={{ __html: reviewContent }} />
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          {isTeamLead && selectedReview?.review_status === 'pending' && (
            <>
              <Button 
                onClick={() => {
                  setIsViewDialogOpen(false);
                  setIsApproveDialogOpen(true);
                }}
                color="success"
                variant="contained"
              >
                Approve
              </Button>
              <Button 
                onClick={() => {
                  setIsViewDialogOpen(false);
                  setIsRejectDialogOpen(true);
                }}
                color="error"
                variant="contained"
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Approve Review Dialog */}
      <Dialog open={isApproveDialogOpen} onClose={() => setIsApproveDialogOpen(false)}>
        <DialogTitle>Approve Review</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve this review?
            This will mark the product as reviewed and update its status.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={approveReview}
            variant="contained"
            color="success"
            disabled={loading}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Review Dialog */}
      <Dialog open={isRejectDialogOpen} onClose={() => setIsRejectDialogOpen(false)}>
        <DialogTitle>Reject Review</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reject this review?
            The reviewer will need to make changes and submit again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={rejectReview}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setMessage(null)} severity={message?.severity} variant="filled">
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReviewsPanel;