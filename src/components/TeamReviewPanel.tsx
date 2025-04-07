// src/components/TeamReviewsPanel.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  AlertColor
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon, 
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { format, parseISO } from 'date-fns';
import ReviewViewer from './ReviewViewer';

interface Review {
  id: number;
  product_id: number;
  reviewer_id: number;
  review_status: string;
  product_status: string;
  review_path: string;
  title?: string;
  created_at: string;
  updated_at: string;
  product_name?: string;
}

interface Product {
  id: number;
  site_id: string;
  status: string;
  product_type_id: number;
}

interface MessageState {
  text: string;
  severity: AlertColor;
}

interface TeamReviewsPanelProps {
  teamId: number;
  isTeamLead: boolean;
}

const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  switch (status) {
    case 'draft': return 'default';
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

const TeamReviewsPanel: React.FC<TeamReviewsPanelProps> = ({ teamId, isTeamLead }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewContent, setReviewContent] = useState<string>('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchTeamReviews();
  }, [teamId]);

  const fetchTeamReviews = async (): Promise<void> => {
    setLoading(true);
    try {
      // First, get all products assigned to this team
      const productsResponse = await invoke<string>('get_team_products', { team_id: teamId });
      const productsData = JSON.parse(productsResponse);
      
      if (productsData.data && productsData.data.products) {
        const teamProducts = productsData.data.products as Product[];
        setProducts(teamProducts);
        
        // For each product, get its reviews
        const allReviews: Review[] = [];
        for (const product of teamProducts) {
          try {
            const reviewsResponse = await invoke<string>('get_product_reviews', { 
              product_id: product.id 
            });
            const reviewsData = JSON.parse(reviewsResponse);
            
            if (reviewsData.data) {
              const reviewsWithProduct = reviewsData.data.map((review: Review) => ({
                ...review,
                product_name: product.site_id || `Product #${product.id}`
              }));
              
              allReviews.push(...reviewsWithProduct);
            }
          } catch (error) {
            console.error(`Error fetching reviews for product ${product.id}:`, error);
          }
        }
        
        setReviews(allReviews);
      }
    } catch (err) {
      console.error('Failed to fetch team reviews:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch team reviews',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReview = async (review: Review): Promise<void> => {
    setSelectedReview(review);
    setLoading(true);
    
    try {
      const response = await invoke<string>('get_review', { review_id: review.id });
      const data = JSON.parse(response);
      
      setReviewContent(data.content || 'No content available');
      setIsViewDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch review details:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch review details',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async (review: Review): Promise<void> => {
    if (!isTeamLead) return;
    
    setLoading(true);
    try {
      await invoke('approve_review', { review_id: review.id });
      
      // Update local state
      setReviews(reviews.map(r => 
        r.id === review.id ? { ...r, review_status: 'approved' } : r
      ));
      
      setMessage({
        text: 'Review approved successfully',
        severity: 'success',
      });
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

  const handleRejectReview = async (review: Review): Promise<void> => {
    if (!isTeamLead) return;
    
    setLoading(true);
    try {
      await invoke('reject_review', { review_id: review.id });
      
      // Update local state
      setReviews(reviews.map(r => 
        r.id === review.id ? { ...r, review_status: 'rejected' } : r
      ));
      
      setMessage({
        text: 'Review rejected successfully',
        severity: 'success',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get pending reviews only
  const pendingReviews = reviews.filter(r => r.review_status === 'pending');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Team Reviews</Typography>
        <Button 
          variant="outlined" 
          onClick={fetchTeamReviews}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {isTeamLead && pendingReviews.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Pending Approval ({pendingReviews.length})
          </Typography>
          
          <List>
            {pendingReviews.map((review) => (
              <React.Fragment key={review.id}>
                <ListItem>
                  <ListItemIcon>
                    <AssignmentIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">
                          {review.product_name}
                        </Typography>
                        <Chip
                          label="Pending"
                          size="small"
                          color="warning"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption">
                        Submitted: {format(parseISO(review.updated_at), 'MMM d, yyyy h:mm a')}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleViewReview(review)}
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleApproveReview(review)}
                      title="Approve"
                      color="success"
                    >
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleRejectReview(review)}
                      title="Reject"
                      color="error"
                    >
                      <CloseIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}
      
      <Typography variant="subtitle1" gutterBottom>
        All Reviews ({reviews.length})
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Box textAlign="center" p={3}>
          <Typography color="text.secondary">
            No reviews found for this team's products
          </Typography>
        </Box>
      ) : (
        <List>
          {reviews.map((review) => (
            <React.Fragment key={review.id}>
              <ListItem>
                <ListItemIcon>
                  <AssignmentIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">
                        {review.product_name}
                      </Typography>
                      <Chip
                        label={review.review_status}
                        size="small"
                        color={getStatusColor(review.review_status)}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption">
                      Last updated: {format(parseISO(review.updated_at), 'MMM d, yyyy h:mm a')}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleViewReview(review)}
                    title="View"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
      
      {/* Review View Dialog */}
      <Dialog 
        open={isViewDialogOpen} 
        onClose={() => setIsViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Review Details
          {selectedReview && (
            <Typography variant="subtitle1" color="text.secondary">
              {selectedReview.product_name}
              {' - '}
              <Chip
                label={selectedReview.review_status}
                size="small"
                color={getStatusColor(selectedReview.review_status)}
              />
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            selectedReview && (
              <ReviewViewer 
                review={selectedReview} 
                content={reviewContent} 
              />
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          {isTeamLead && selectedReview?.review_status === 'pending' && (
            <>
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  if (selectedReview) {
                    handleApproveReview(selectedReview);
                  }
                }}
                variant="contained"
                color="success"
              >
                Approve
              </Button>
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  if (selectedReview) {
                    handleRejectReview(selectedReview);
                  }
                }}
                variant="contained"
                color="error"
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Message Snackbar */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setMessage(null)} severity={message?.severity || 'info'}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamReviewsPanel;