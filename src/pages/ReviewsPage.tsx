// src/pages/ReviewsPage.tsx
import React, { useState, useEffect, useContext, useRef } from 'react';
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
import ReviewViewer from '../components/ReviewViewer';
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
  switch (status.toLowerCase()) {
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
  const [draftVersion, setDraftVersion] = useState<number>(0);
  const dataLoadedRef = useRef<Boolean>(false); // Track if data has been loaded

  const navigate = useNavigate();
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
      console.log('userRole:', userRole);
      if (userRole === 'admin' || userRole === 'team_lead') {

        try {
          const pendingReviewsResponse = await invoke<string | object>('get_pending_reviews_for_team_lead');
          console.log('Pending Reviews Response:', pendingReviewsResponse);
          
          // Parse the response if it's a string
          const pendingReviewsData = typeof pendingReviewsResponse === 'string' 
            ? JSON.parse(pendingReviewsResponse) 
            : pendingReviewsResponse;
          
          // Check if we have data and it's an array
          if (pendingReviewsData && Array.isArray(pendingReviewsData)) {
            // Use the array directly
            const enrichedPendingReviews = await enrichReviewsWithProductNames(pendingReviewsData);
            setPendingReviews(enrichedPendingReviews);
          }
          // Also check for the common API response format with data property
          else if (pendingReviewsData && pendingReviewsData.data && Array.isArray(pendingReviewsData.data)) {
            const enrichedPendingReviews = await enrichReviewsWithProductNames(pendingReviewsData.data);
            setPendingReviews(enrichedPendingReviews);
          }
          else {
            console.warn('Unexpected format for pending reviews', pendingReviewsData);
            setPendingReviews([]);
          }
        } catch (err) {
          console.error('Error fetching pending reviews:', err);
          setPendingReviews([]);
        }
      }

      // Fetch available products for creating new reviews
      const productsResponse = await invoke<string | object>('get_user_products');
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

  useEffect(() => {
    setIsTeamLead(userRole === 'admin' || userRole === 'team_lead');
    if (!dataLoadedRef.current) {
      console.log('Fetching data (first time only)');
      fetchData();
      dataLoadedRef.current = true;
    }
  }, [userRole]);
  

  // Add debug logging for active tab and pending reviews
  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
    console.log('pendingReviews count:', pendingReviews.length);
  }, [activeTab, pendingReviews]);

  

  // Helper to fetch product names for reviews
  const enrichReviewsWithProductNames = async (reviews: Review[]): Promise<Review[]> => {
    const enriched = await Promise.all(
      reviews.map(async (review) => {
        try {
          const productResponse = await invoke<string | object>('get_product_details', {
            product_id: review.product_id
          });
          const productData = typeof productResponse === 'string'
            ? JSON.parse(productResponse)
            : productResponse;
  
          const productName = productData.data?.product?.site_id || `Product #${review.product_id}`;
  
          return {
            ...review,
            product_name: productName,
            review_status: review.review_status.toLowerCase(),  // <- normalize here
          };
        } catch (err) {
          console.error(`Failed to fetch product details for review ${review.id}:`, err);
          return {
            ...review,
            product_name: `Product #${review.product_id}`,
            review_status: review.review_status.toLowerCase(),  // <- normalize here too
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
  
  // First, modify the handleStartNewReview function:
const handleStartNewReview = async (): Promise<void> => {
  if (!selectedProduct) return;
  
  // Get product name for display
  const product = products.find(p => p.id === selectedProduct);
  const productName = product ? product.site_id : `Product #${selectedProduct}`;
  
  // Check for local draft
  const content = await loadDraftLocally(selectedProduct);
  setDraftContent(content || ''); // Ensure draftContent is at least an empty string, not null
  
  // Set the selected review with default values
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
  
  // Close the product selection dialog and open the editor
  setIsCreateDialogOpen(false);
  setIsEditorOpen(true);
  
  console.log('Review editor should open with:', {
    productId: selectedProduct,
    productName,
    draftContent: content ? 'Content loaded' : 'No content',
  });
};

  const handleEditReview = async (review: Review): Promise<void> => {
    try {
      setLoading(true);
      
      // Fetch the review content first
      console.log('Fetching review content for ID:', review.id);
      const response = await invoke<string | object>('get_review', { review_id: review.id });
      console.log('Raw response type:', typeof response);
      console.log('Raw response:', response);
      
      // Parse the response if it's a string
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      console.log('Parsed data:', data);
      
      // Check for different possible response structures
      let content = null;
      if (data.data && data.data.content) {
        content = data.data.content;
        console.log('Found content in data.data.content');
      } else if (data.content) {
        content = data.content;
        console.log('Found content in data.content');
      } else if (data.review && data.review.content) {
        content = data.review.content;
        console.log('Found content in data.review.content');
      } else {
        console.warn('Could not find content in response:', data);
        // Try to load any draft content from local storage
        await loadDraftLocally(review.product_id);
      }
      
      if (content) {
        console.log('Content length:', content.length);
        console.log('Content preview:', content.substring(0, 100));
        setDraftContent(content);
      }
      
      // Set the selected review
      setSelectedReview(review);
      
      // Open the editor
      setIsEditorOpen(true);
    } catch (err) {
      console.error('Failed to load review for editing:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to load review for editing',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReview = async (review: Review): Promise<void> => {
    try {
      setLoading(true);
      setSelectedReview(review);
      
      // Fetch the review content
      const response = await invoke<string | object>('get_review', { review_id: review.id });
      
      // Parse the response if it's a string
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      
      console.log('View review data:', data); // Debug log
      
      // Check for different possible response structures
      if (data.data && data.data.content) {
        setReviewContent(data.data.content);
      } else if (data.content) {
        setReviewContent(data.content);
      } else if (data.review && data.review.content) {
        setReviewContent(data.review.content);
      } else {
        console.warn('Could not find content in response:', data);
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
      dataLoadedRef.current = false; // Reset data loaded flag
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
                {(review.review_status === 'draft' || review.review_status === 'rejected') && (
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
          {activeTab === 1 && isTeamLead && (
            <>
              {console.log('Rendering pending reviews tab. Reviews:', pendingReviews)}
              {renderReviewList(pendingReviews)}
            </>
          )}
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
              {selectedReview && (
                <ReviewViewer 
                  review={selectedReview} 
                  content={reviewContent} 
                />
              )}
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
        <DialogTitle>
          {selectedReview ? 
            `Editing Review for ${selectedReview.product_name}` : 
            'Create New Review'}
        </DialogTitle>
        <DialogContent>
          {selectedReview && (
            <ReviewEditor
              key={`editor-${selectedReview.product_id}-${Date.now()}`} // Add unique key to force re-render
              productId={selectedReview.product_id}
              productName={selectedReview.product_name}
              initialReview={selectedReview}
              initialContent={draftContent || ''} // Ensure we never pass null
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