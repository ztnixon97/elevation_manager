// src/pages/ReviewsPage.tsx
import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Tabs, 
  Tab, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  SelectChangeEvent,
  AlertColor
} from '@mui/material';
import { 
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ViewList as ViewListIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { format, parseISO } from 'date-fns';
import { AuthContext } from '../context/AuthContext';
import ReviewEditor from '../components/ReviewEditor';
import { useNavigate } from 'react-router-dom';

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

// Review status colors
const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  switch (status) {
    case 'draft': return 'default';
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

const ReviewsPage: React.FC = () => {
  const { userRole } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState<boolean>(false);
  const [reviewContent, setReviewContent] = useState<string>('');
  const [isTeamLead, setIsTeamLead] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Set isTeamLead based on user role
    setIsTeamLead(userRole === 'admin' || userRole === 'team_lead');
    
    // Load data on component mount
    fetchData();
  }, [userRole]);

  const fetchData = async (): Promise<void> => {
    setLoading(true);
    try {
      // Fetch user's reviews
      const myReviewsResponse = await invoke<string | object>('get_user_reviews');
      const myReviewsData = typeof myReviewsResponse === 'string' 
        ? JSON.parse(myReviewsResponse) 
        : myReviewsResponse;
        
      if (myReviewsData.data) {
        // Fetch associated product names
        const enrichedReviews = await enrichReviewsWithProductNames(myReviewsData.data);
        setMyReviews(enrichedReviews);
      }

      // If user is team lead or admin, fetch pending reviews
      if (isTeamLead) {
        // This would typically fetch reviews where status is 'pending'
        // For now, we'll just use a filter on allReviews
        const allReviewsResponse = await invoke<string | object>('get_all_reviews');
        const allReviewsData = typeof allReviewsResponse === 'string' 
          ? JSON.parse(allReviewsResponse) 
          : allReviewsResponse;
        
        if (allReviewsData.data) {
          const enrichedAllReviews = await enrichReviewsWithProductNames(allReviewsData.data);
          setAllReviews(enrichedAllReviews);
          
          const pendingOnly = enrichedAllReviews.filter(
            (review: Review) => review.review_status === 'pending'
          );
          setPendingReviews(pendingOnly);
        }
      }

      // Fetch available products for creating new reviews
      const productsResponse = await invoke<string | object>('get_all_products');
      const productsData = typeof productsResponse === 'string' 
        ? JSON.parse(productsResponse) 
        : productsResponse;
        
      if (productsData.data) {
        setProducts(productsData.data.products || []);
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

  // Helper to fetch product names for reviews
  const enrichReviewsWithProductNames = async (reviews: Review[]): Promise<Review[]> => {
    const enriched = await Promise.all(
      reviews.map(async (review) => {
        try {
          // Fetch product details
          const productResponse = await invoke<string | object>('get_product', { 
            product_id: review.product_id 
          });
          const productData = typeof productResponse === 'string'
            ? JSON.parse(productResponse)
            : productResponse;
            
          const productName = productData.data?.product?.site_id || `Product #${review.product_id}`;
          
          return {
            ...review,
            product_name: productName,
          };
        } catch (err) {
          console.error(`Failed to fetch product details for review ${review.id}:`, err);
          return {
            ...review,
            product_name: `Product #${review.product_id}`,
          };
        }
      })
    );
    
    return enriched;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  const handleCreateReview = () => {
    if (!selectedProduct) {
      setIsCreateDialogOpen(true);
      return;
    }
  
    navigate(`/reviews/create/${selectedProduct}`);
  };

  const saveDraftLocally = async (productId: number, content: string) => {
    try {
      // Save to filesystem
      await invoke('save_review_draft', {
        product_id: productId,
        content: content
      });
      
      setMessage({
        text: 'Draft saved locally',
        severity: 'success'
      });
    } catch (err) {
      console.error('Failed to save draft locally:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to save draft locally',
        severity: 'error'
      });
    }
  };

  const loadDraftLocally = async (productId: number) => {
    try {
      const content = await invoke<string | object>('load_review_draft', {
        product_id: productId
      });
      
      if (typeof content === 'string') {
        setDraftContent(content);
        return content;
      }
      
      // If it's an object with an error message about no draft
      return null;
    } catch (err) {
      // If no draft exists, this isn't necessarily an error
      if (typeof err === 'string' && err.includes('No draft exists')) {
        return null;
      }
      
      console.error('Failed to load draft:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to load draft',
        severity: 'error'
      });
      return null;
    }
  };
  
  const handleStartNewReview = async (): Promise<void> => {
    if (!selectedProduct) return;
    
    // Get product name for display
    const product = products.find(p => p.id === selectedProduct);
    const productName = product ? product.site_id : `Product #${selectedProduct}`;
    
    // Check for local draft
    const draftContent = await loadDraftLocally(selectedProduct);
    
    setSelectedReview({
      product_id: selectedProduct,
      product_name: productName,
      // Default values for required fields
      id: 0, // This will be assigned by the server
      reviewer_id: 0, // This will be assigned by the server
      review_status: 'draft',
      product_status: 'pending_review',
      review_path: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    setIsCreateDialogOpen(false);
    setIsEditorOpen(true);
  };

  const handleEditReview = async (review: Review): Promise<void> => {
    // Try to load any draft content first
    await loadDraftLocally(review.product_id);
    setSelectedReview(review);
    setIsEditorOpen(true);
  };

  const handleViewReview = async (review: Review): Promise<void> => {
    setSelectedReview(review);
    setLoading(true);
    
    try {
      const response = await invoke<string | object>('get_review', { review_id: review.id });
      const data = typeof response === 'string'
        ? JSON.parse(response)
        : response;
      
      if (data.data && data.data.content) {
        setReviewContent(data.data.content);
      } else {
        setReviewContent('No content available');
      }
      setIsDetailDialogOpen(true);
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

  const handleDeleteReview = (review: Review): void => {
    setSelectedReview(review);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteReview = async (): Promise<void> => {
    if (!selectedReview) return;
    
    setLoading(true);
    try {
      await invoke('delete_review', { review_id: selectedReview.id });
      
      // Update local state
      setMyReviews(myReviews.filter(r => r.id !== selectedReview.id));
      if (isTeamLead) {
        setAllReviews(allReviews.filter(r => r.id !== selectedReview.id));
        setPendingReviews(pendingReviews.filter(r => r.id !== selectedReview.id));
      }
      
      setMessage({
        text: 'Review deleted successfully',
        severity: 'success',
      });
      
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to delete review:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to delete review',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async (review: Review): Promise<void> => {
    setLoading(true);
    try {
      await invoke('approve_review', { review_id: review.id });
      
      // Update local state
      const updatedReview = { ...review, review_status: 'approved' };
      
      setAllReviews(allReviews.map(r => 
        r.id === review.id ? updatedReview : r
      ));
      
      setPendingReviews(pendingReviews.filter(r => r.id !== review.id));
      
      // If it's one of our reviews, update that too
      setMyReviews(myReviews.map(r => 
        r.id === review.id ? updatedReview : r
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
    setLoading(true);
    try {
      await invoke('reject_review', { review_id: review.id });
      
      // Update local state
      const updatedReview = { ...review, review_status: 'rejected' };
      
      setAllReviews(allReviews.map(r => 
        r.id === review.id ? updatedReview : r
      ));
      
      setPendingReviews(pendingReviews.filter(r => r.id !== review.id));
      
      // If it's one of our reviews, update that too
      setMyReviews(myReviews.map(r => 
        r.id === review.id ? updatedReview : r
      ));
      
      setMessage({
        text: 'Review rejected successfully',
        severity: 'success',
      });
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

  const handleEditorClose = (updated = false): void => {
    setIsEditorOpen(false);
    setSelectedReview(null);
    setDraftContent(null);
    
    if (updated) {
      fetchData(); // Refresh data if review was updated
    }
  };

  const handleProductSelectChange = (event: SelectChangeEvent<number | string>): void => {
    setSelectedProduct(event.target.value as number);
  };

  const handleSaveDraft = (content: string): void => {
    if (!selectedReview) return;
    saveDraftLocally(selectedReview.product_id, content);
  };

  const renderReviewList = (reviews: Review[]): React.ReactNode => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (reviews.length === 0) {
      return (
        <Box textAlign="center" p={3}>
          <Typography color="text.secondary">
            No reviews found
          </Typography>
        </Box>
      );
    }
    
    return (
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
                      {review.product_name || `Product #${review.product_id}`}
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
                  <ViewListIcon />
                </IconButton>
                
                {/* Only show edit button for draft or rejected reviews */}
                {(review.review_status === 'draft' || review.review_status === 'rejected') && (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleEditReview(review)}
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                )}
                
                {/* Only show delete button for draft reviews */}
                {review.review_status === 'draft' && (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDeleteReview(review)}
                    title="Delete"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
                
                {/* Only show approve/reject buttons for pending reviews if user is team lead */}
                {isTeamLead && review.review_status === 'pending' && (
                  <>
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
                  </>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Product Reviews
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateDialogOpen(true)}
          >
            Create Review
          </Button>
        </Box>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="My Reviews" />
          {isTeamLead && <Tab label="Pending Approval" />}
          {isTeamLead && <Tab label="All Reviews" />}
        </Tabs>
        
        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && renderReviewList(myReviews)}
          {activeTab === 1 && isTeamLead && renderReviewList(pendingReviews)}
          {activeTab === 2 && isTeamLead && renderReviewList(allReviews)}
        </Box>
      </Paper>
      
      {/* Create Review Dialog */}
      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Review</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Product</InputLabel>
            <Select
              value={selectedProduct || ''}
              onChange={handleProductSelectChange}
              label="Select Product"
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.site_id || `Product #${product.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStartNewReview}
            variant="contained"
            color="primary"
            disabled={!selectedProduct}
          >
            Start Review
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Delete Review</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this review?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteReview}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Review Details Dialog */}
      <Dialog open={isDetailDialogOpen} onClose={() => setIsDetailDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Review Details
          {selectedReview && (
            <Typography variant="subtitle1" color="text.secondary">
              {selectedReview.product_name || `Product #${selectedReview.product_id}`}
              {' - '}
              <Chip 
                label={selectedReview?.review_status} 
                size="small"
                color={getStatusColor(selectedReview?.review_status)}
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
            <Box sx={{ mt: 2 }}>
              <div dangerouslySetInnerHTML={{ __html: reviewContent }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetailDialogOpen(false)}>Close</Button>
          {isTeamLead && selectedReview?.review_status === 'pending' && (
            <>
              <Button
                onClick={() => {
                  setIsDetailDialogOpen(false);
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
                  setIsDetailDialogOpen(false);
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
      
      {/* Review Editor Dialog */}
      <Dialog open={isEditorOpen} onClose={() => handleEditorClose()} maxWidth="lg" fullWidth>
        <DialogContent>
          {selectedReview && (
            <ReviewEditor
              productId={selectedReview.product_id}
              productName={selectedReview.product_name}
              initialReview={selectedReview}
              initialContent={draftContent}
              onReviewUpdated={() => handleEditorClose(true)}
              onSaveDraft={handleSaveDraft}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleEditorClose()}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Message Snackbar */}
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
    </Container>
  );
};

export default ReviewsPage;
