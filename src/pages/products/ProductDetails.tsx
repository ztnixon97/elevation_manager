// src/pages/products/ProductDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid2,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  ArrowBack,
  Map as MapIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  RateReview as ReviewIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  MoreVert as MoreVertIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import InteractiveMap from '../../components/InteractiveMap';

interface Product {
  id: number;
  item_id: string;
  site_id: string;
  product_type: string;
  status: string;
  classification: string;
  assigned_user?: string;
  assigned_team?: string;
  created_at: string;
  updated_at: string;
  taskorder_name?: string;
  geometry?: any;
  progress?: number;
}

interface Review {
  id: number;
  product_id: number;
  reviewer_id: number;
  review_status: string;
  product_status: string;
  created_at: string;
  updated_at: string;
}

const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  
  // Additional data for editing
  const [productTypes, setProductTypes] = useState<Array<{id: number; name: string}>>([]);
  const [taskOrders, setTaskOrders] = useState<Array<{id: number; name: string}>>([]);

  useEffect(() => {
    if (productId) {
      loadProductDetails(parseInt(productId));
      loadEditingData();
    }
  }, [productId]);

  const loadEditingData = async () => {
    try {
      // Load product types for dropdown
      const typesResponse = await invoke<string>('get_all_product_types');
      const typesData = JSON.parse(typesResponse);
      if (typesData.success && typesData.data) {
        setProductTypes(typesData.data);
      }

      // Load task orders for dropdown
      const ordersResponse = await invoke<string>('get_all_taskorders');
      const ordersData = JSON.parse(ordersResponse);
      if (ordersData.success && ordersData.data) {
        setTaskOrders(ordersData.data);
      }
    } catch (err) {
      console.warn('Could not load editing data:', err);
    }
  };

  const loadProductDetails = async (productId: number) => {
    try {
      setLoading(true);
      
      // Load product details
      const productResponse = await invoke<string>('get_product_details', { product_id: productId });
      const productData = JSON.parse(productResponse);
      
      if (productData.success && productData.data) {
        setProduct(productData.data.product);
      } else {
        throw new Error('Product not found');
      }

      // Load product reviews
      try {
        const reviewsResponse = await invoke<string>('get_product_reviews', { product_id: productId });
        const reviewsData = JSON.parse(reviewsResponse);
        
        if (reviewsData.success && reviewsData.data) {
          setReviews(reviewsData.data);
        }
      } catch (err) {
        console.warn('Could not load reviews:', err);
        setReviews([]);
      }

    } catch (error) {
      console.error('Failed to load product details:', error);
      setMessage({ text: 'Failed to load product details', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'created': return 'default';
      case 'assigned': return 'info';
      case 'in progress': return 'warning';
      case 'in review': return 'secondary';
      case 'completed': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'created': return <ScheduleIcon />;
      case 'assigned': return <PersonIcon />;
      case 'in progress': return <ScheduleIcon />;
      case 'in review': return <ReviewIcon />;
      case 'completed': return <CheckCircleIcon />;
      case 'rejected': return <ErrorIcon />;
      default: return <ScheduleIcon />;
    }
  };

  // Edit functions
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false);
      setEditForm({});
      setEditError(null);
    } else {
      // Start editing
      setIsEditing(true);
      setEditForm({
        site_id: product?.site_id || '',
        item_id: product?.item_id || '',
        status: product?.status || '',
        classification: product?.classification || '',
        product_type: product?.product_type || '',
      });
    }
  };

  const handleEditFormChange = (field: keyof Product, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    if (!product || !productId) return;
    
    try {
      setEditLoading(true);
      setEditError(null);
      
      const productIdNum = parseInt(productId);
      
      // Find product type ID if product type name changed
      let productTypeId = undefined;
      if (editForm.product_type && editForm.product_type !== product.product_type) {
        const selectedType = productTypes.find(t => t.name === editForm.product_type);
        productTypeId = selectedType?.id;
      }
      
      const response = await invoke<string>('update_product', {
        product_id: productIdNum,
        site_id: editForm.site_id !== product.site_id ? editForm.site_id : undefined,
        item_id: editForm.item_id !== product.item_id ? editForm.item_id : undefined,
        status: editForm.status !== product.status ? editForm.status : undefined,
        classification: editForm.classification !== product.classification ? editForm.classification : undefined,
        product_type_id: productTypeId,
        taskorder_id: undefined, // We'll add this later when implementing task order linking
      });
      
      const data = JSON.parse(response);
      
      if (data.success) {
        // Update local state
        setProduct(prev => prev ? {
          ...prev,
          ...editForm
        } : null);
        
        setIsEditing(false);
        setEditForm({});
        setEditSuccess(true);
        
        // Auto-hide success message
        setTimeout(() => setEditSuccess(false), 3000);
      } else {
        throw new Error(data.message || 'Failed to update product');
      }
    } catch (err) {
      console.error('Failed to update product:', err);
      setEditError(
        typeof err === 'string' ? err : 
        err instanceof Error ? err.message : 
        'An error occurred while updating the product'
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateReview = () => {
    if (product) {
      navigate(`/reviews/create?productId=${product.id}`);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!product) return;

    try {
      await invoke('update_product_status', {
        product_id: product.id,
        status: newStatus
      });
      
      setProduct({ ...product, status: newStatus });
      setMessage({ text: 'Product status updated successfully', severity: 'success' });
      setStatusUpdateDialog(false);
    } catch (error) {
      console.error('Failed to update product status:', error);
      setMessage({ text: 'Failed to update product status', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!product) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Product not found.
          <Button 
            variant="outlined" 
            sx={{ ml: 2 }}
            onClick={() => navigate('/products')}
          >
            Back to Products
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/products')}
            sx={{ mr: 2 }}
          >
            Back to Products
          </Button>
          <Typography variant="h4" component="h1">
            Product Details
          </Typography>
        </Box>
        
        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={isEditing ? "contained" : "outlined"}
            startIcon={isEditing ? <CancelIcon /> : <EditIcon />}
            onClick={handleEditToggle}
            disabled={editLoading}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ReviewIcon />}
            onClick={handleCreateReview}
          >
            Create Review
          </Button>
        </Box>
      </Box>

      {/* Edit Form */}
      {isEditing && (
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Edit Product</Typography>
          
          <Grid2 container spacing={2}>
            <Grid2 xs={12} md={6}>
              <TextField
                label="Site ID"
                value={editForm.site_id || ''}
                onChange={(e) => handleEditFormChange('site_id', e.target.value)}
                fullWidth
              />
            </Grid2>
            
            <Grid2 xs={12} md={6}>
              <TextField
                label="Item ID"
                value={editForm.item_id || ''}
                onChange={(e) => handleEditFormChange('item_id', e.target.value)}
                fullWidth
              />
            </Grid2>
            
            <Grid2 xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editForm.status || ''}
                  onChange={(e) => handleEditFormChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="created">Created</MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="in progress">In Progress</MenuItem>
                  <MenuItem value="in review">In Review</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            
            <Grid2 xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Classification</InputLabel>
                <Select
                  value={editForm.classification || ''}
                  onChange={(e) => handleEditFormChange('classification', e.target.value)}
                  label="Classification"
                >
                  <MenuItem value="Unclassified">Unclassified</MenuItem>
                  <MenuItem value="Confidential">Confidential</MenuItem>
                  <MenuItem value="Secret">Secret</MenuItem>
                  <MenuItem value="Top Secret">Top Secret</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            
            <Grid2 xs={12}>
              <FormControl fullWidth>
                <InputLabel>Product Type</InputLabel>
                <Select
                  value={editForm.product_type || ''}
                  onChange={(e) => handleEditFormChange('product_type', e.target.value)}
                  label="Product Type"
                >
                  {productTypes.map((type) => (
                    <MenuItem key={type.id} value={type.name}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
          </Grid2>
          
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveChanges}
              disabled={editLoading}
            >
              {editLoading ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleEditToggle}
              disabled={editLoading}
            >
              Cancel
            </Button>
          </Box>
          
          {editError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {editError}
            </Alert>
          )}
        </Paper>
      )}

      <Grid2 container spacing={3}>
        {/* Product Information */}
        <Grid2 xs={12} md={6}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom>
              Product Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Item ID
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {product.item_id}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Site ID
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {product.site_id}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Product Type
              </Typography>
              <Typography variant="body1">
                {product.product_type || 'Unknown'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Chip
                icon={getStatusIcon(product.status)}
                label={product.status}
                color={getStatusColor(product.status) as any}
                sx={{ mt: 0.5 }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Classification
              </Typography>
              <Typography variant="body1">
                {product.classification}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Assignment
              </Typography>
              {product.assigned_user ? (
                <Chip
                  icon={<PersonIcon />}
                  label={product.assigned_user}
                  variant="outlined"
                />
              ) : product.assigned_team ? (
                <Chip
                  icon={<GroupIcon />}
                  label={product.assigned_team}
                  variant="outlined"
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Unassigned
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Task Order
              </Typography>
              <Typography variant="body1">
                {product.taskorder_name || 'No Task Order'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body1">
                {new Date(product.created_at).toLocaleDateString()}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {new Date(product.updated_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Paper>

          {/* Actions */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<ReviewIcon />}
                onClick={handleCreateReview}
              >
                Create Review
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/products/edit/${product.id}`)}
              >
                Edit Product
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => setStatusUpdateDialog(true)}
              >
                Update Status
              </Button>
            </Box>
          </Paper>
        </Grid2>

        {/* Map and Reviews */}
        <Grid2 xs={12} md={6}>
          {/* Geographic Coverage Map */}
          {product.geometry && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Geographic Coverage
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ height: 300, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <InteractiveMap 
                  initialGeometry={product.geometry}
                  showDrawingTools={false}
                />
              </Box>
            </Paper>
          )}

          {/* Reviews */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reviews ({reviews.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {reviews.length > 0 ? (
              <List>
                {reviews.map((review) => (
                  <ListItem key={review.id}>
                    <ListItemIcon>
                      <ReviewIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Review #${review.id}`}
                      secondary={
                        <Box>
                          <Chip
                            label={review.review_status}
                            size="small"
                            color={getStatusColor(review.review_status) as any}
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Created: {new Date(review.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton
                      onClick={() => navigate(`/reviews/${review.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No reviews found for this product.
              </Typography>
            )}
          </Paper>
        </Grid2>
      </Grid2>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateDialog} onClose={() => setStatusUpdateDialog(false)}>
        <DialogTitle>Update Product Status</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            {['Created', 'Assigned', 'In Progress', 'In Review', 'Completed', 'Rejected'].map((status) => (
              <Button
                key={status}
                variant={product.status === status ? 'contained' : 'outlined'}
                onClick={() => handleUpdateStatus(status)}
                disabled={product.status === status}
              >
                {status}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Message Snackbar */}
      {message && (
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={message.severity} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </Snackbar>
      )}

      {/* Edit Success Notification */}
      <Snackbar
        open={editSuccess}
        autoHideDuration={3000}
        onClose={() => setEditSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setEditSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Product updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductDetails;