import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import InteractiveMap, { InteractiveMapRef } from '../components/InteractiveMap';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Container,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

// Import icons
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import MoneyIcon from '@mui/icons-material/Money';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InventoryIcon from '@mui/icons-material/Inventory';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { Add } from '@mui/icons-material';

import { format, parseISO } from 'date-fns';
import { AuthContext } from '../context/AuthContext';

// Types
interface TaskOrderDetails {
  id: number;
  contract_id: number | null;
  name: string;
  task_order_type?: string; // "Contract" or "Internal"
  producer: string;
  cor: string;
  period_of_performance: string;
  price: string | number; // Updated to accept number or string
  status: string;
  created_at: string;
}

interface ProductDetails {
  id: number;
  site_id: string;
  item_id: string;
  status: string;
  product_type_id: number;
  product_type_name?: string;
  team_id?: number;
  team_name?: string;
  geom?: string; // EWKT WKT string
  classification?: string;
  acceptance_date?: string;
  publish_date?: string;
  created_at: string;
  updated_at: string;
}

const TaskOrderPage: React.FC = () => {
  const { taskOrderId } = useParams<{ taskOrderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [taskOrder, setTaskOrder] = useState<TaskOrderDetails | null>(null);
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TaskOrderDetails>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  
  // Get user context for permissions
  const { userRole } = useContext(AuthContext);
  
  const mapRef = useRef<InteractiveMapRef>(null);

  useEffect(() => {
    const fetchTaskOrderDetails = async () => {
      try {
        setLoading(true);
        
        // Validate taskOrderId
        if (!taskOrderId) {
          throw new Error("Task Order ID is missing from the URL");
        }
        
        const taskOrderIdNum = parseInt(taskOrderId, 10);
        
        if (isNaN(taskOrderIdNum)) {
          throw new Error("Invalid Task Order ID");
        }
        
        // Fetch task order details
        const response = await invoke<string | object>('get_task_order', {
          taskorder_id: taskOrderIdNum,
        });
        
        const data = typeof response === 'string' ? JSON.parse(response) : response;

        if (data.success && data.data) {
          console.log("Task Order Data:", data.data);
          setTaskOrder({
            id: data.data.id,
            contract_id: data.data.contract_id,
            name: data.data.name,
            task_order_type: data.data.task_order_type,
            producer: data.data.producer || '',
            cor: data.data.cor || '',
            period_of_performance: data.data.pop || '',
            price: data.data.price || '',
            status: data.data.status || '',
            created_at: data.data.created_at,
          });
          
          // Fetch products for this task order
          const productResponse = await invoke<string | object>('get_taskorder_products', {
            taskorder_id: taskOrderIdNum,
          });
          
          const productData = typeof productResponse === 'string' 
            ? JSON.parse(productResponse) 
            : productResponse;
            
          if (productData.success && productData.data && productData.data.products) {
            setProducts(productData.data.products);
          } else {
            setProducts([]);
          }
          
          // Check edit permissions for this task order
          try {
            const permissionResponse = await invoke<string>('check_task_order_edit_permission', {
              taskorder_id: taskOrderIdNum,
            });
            
            const permissionData = JSON.parse(permissionResponse);
            if (permissionData.success && permissionData.data) {
              setCanEdit(permissionData.data.can_edit);
            } else {
              setCanEdit(false);
            }
          } catch (permissionErr) {
            console.error("Failed to check edit permissions:", permissionErr);
            setCanEdit(false);
          }
        } else {
          throw new Error(data.message || "Failed to load task order details");
        }
      } catch (err) {
        console.error("Failed to load task order details:", err);
        setError(
          typeof err === 'string' ? err : 
          err instanceof Error ? err.message : 
          "An error occurred while loading task order details"
        );
      } finally {
        setLoading(false);
        setPermissionLoading(false);
      }
    };

    fetchTaskOrderDetails();
  }, [taskOrderId]);

  // Function to get status color based on status string
  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'info';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  // Format currency string - FIXED function to handle different types
  const formatCurrency = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return '$0.00';
    
    // Handle string values
    if (typeof value === 'string') {
      // Check if already formatted
      if (value.trim().startsWith('$')) return value;
      
      // Try to parse the string as a number
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) return '$0.00';
      
      return parsedValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    }
    
    // Handle numeric values
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  // Check if user can edit task order - will be set by permission check
  const [canEdit, setCanEdit] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  
  // Handle edit mode toggle
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
        name: taskOrder?.name || '',
        status: taskOrder?.status || '',
        producer: taskOrder?.producer || '',
        cor: taskOrder?.cor || '',
        period_of_performance: taskOrder?.period_of_performance || '',
        price: taskOrder?.price || '',
      });
    }
  };
  
  // Handle form field changes
  const handleEditFormChange = (field: keyof TaskOrderDetails, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Helper function to convert plain text to PostgreSQL range format
  const convertToRangeFormat = (text: string): string | undefined => {
    if (!text || text.trim() === '') return undefined;
    
    const trimmedText = text.trim();
    
    // If it's already in range format, return as is
    if (trimmedText.includes(',') && (trimmedText.startsWith('[') || trimmedText.startsWith('('))) {
      return trimmedText;
    }
    
    // Try to parse as a simple date range (e.g., "2023-01-01 to 2023-12-31")
    const parts = trimmedText.split(/\s+to\s+/);
    if (parts.length === 2) {
      const startDate = parts[0].trim();
      const endDate = parts[1].trim();
      
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(startDate) && dateRegex.test(endDate)) {
        return `[${startDate}, ${endDate})`;
      }
    }
    
    // Try to parse as a single date (treat as start date)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedText)) {
      return `[${trimmedText}, )`;
    }
    
    // If it doesn't match any pattern, return undefined to skip this field
    console.warn(`Invalid date format for Period of Performance: "${text}". Skipping this field.`);
    return undefined;
  };

  // Helper function to clean form data before submission
  const cleanFormData = (value: any): any => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    
    // Handle string values
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed === 'Not Assigned' || trimmed === 'Not Specified' || trimmed === 'Unknown' || trimmed === '0') {
        return undefined;
      }
      return trimmed;
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      if (value === 0) {
        return undefined;
      }
      return value;
    }
    
    return value;
  };

  // Helper function to display empty values nicely
  const displayValue = (value: any, defaultValue: string = 'Not Specified'): string => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return String(value);
  };
  
  // Handle save changes
  const handleSaveChanges = async () => {
    if (!taskOrder || !taskOrderId) return;
    
    try {
      setEditLoading(true);
      setEditError(null);
      
      const taskOrderIdNum = parseInt(taskOrderId, 10);
      
      // Clean form data and convert period of performance to proper format
      const popValue = convertToRangeFormat(editForm.period_of_performance || '');
      
      const response = await invoke<string>('update_task_order', {
        taskorder_id: taskOrderIdNum,
        name: cleanFormData(editForm.name),
        status: cleanFormData(editForm.status),
        producer: cleanFormData(editForm.producer),
        cor: cleanFormData(editForm.cor),
        pop: popValue,
        price: editForm.price && editForm.price !== '' ? parseFloat(editForm.price.toString()) : undefined,
      });
      
      const data = JSON.parse(response);
      
      if (data.success) {
        // Update local state
        setTaskOrder(prev => prev ? {
          ...prev,
          ...editForm
        } : null);
        
        setIsEditing(false);
        setEditForm({});
        setEditSuccess(true);
        
        // Auto-hide success message
        setTimeout(() => setEditSuccess(false), 3000);
      } else {
        throw new Error(data.message || 'Failed to update task order');
      }
    } catch (err) {
      console.error('Failed to update task order:', err);
      setEditError(
        typeof err === 'string' ? err : 
        err instanceof Error ? err.message : 
        'An error occurred while updating the task order'
      );
    } finally {
      setEditLoading(false);
    }
  };
  
  const handleViewProduct = (productId: number) => {
    navigate(`/products/${productId}`);
  };

  // Calculate map center based on products with geometry
  const getMapCenter = () => {
    const productsWithGeometry = products.filter(p => p.geom);
    if (productsWithGeometry.length === 0) {
      return { lat: 39.8283, lon: -98.5795 }; // Default center (US)
    }

    // For now, return a default center - in the future we could parse WKT
    // and calculate actual bounds
    return { lat: 39.8283, lon: -98.5795 };
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => navigate('/task-orders')}
            sx={{ ml: 2 }}
          >
            Return to Task Orders
          </Button>
        </Alert>
      ) : taskOrder ? (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1">
                {taskOrder.name}
                <Chip
                  label={taskOrder.status}
                  color={getStatusColor(taskOrder.status)}
                  sx={{ ml: 2 }}
                  size="medium"
                />
                {taskOrder.task_order_type && (
                  <Chip
                    label={taskOrder.task_order_type}
                    color={taskOrder.task_order_type === 'Internal' ? 'secondary' : 'primary'}
                    sx={{ ml: 1 }}
                    size="small"
                  />
                )}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!permissionLoading && canEdit && (
                  <Button
                    variant={isEditing ? "contained" : "outlined"}
                    startIcon={isEditing ? <CancelIcon /> : <EditIcon />}
                    onClick={handleEditToggle}
                    disabled={editLoading}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                )}
                {permissionLoading && (
                  <Button
                    variant="outlined"
                    disabled
                    startIcon={<CircularProgress size={16} />}
                  >
                    Checking Permissions...
                  </Button>
                )}
                
                <Button 
                  variant="outlined" 
                  disabled={!taskOrder.contract_id}
                  onClick={() => taskOrder.contract_id && navigate(`/contracts/${taskOrder.contract_id}`)}
                  title={!taskOrder.contract_id ? 'This is an independent task order with no associated contract' : 'View associated contract'}
                >
                  View Contract
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            {/* Edit Form */}
            {isEditing && (
              <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Edit Task Order</Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <TextField
                    label="Name"
                    value={editForm.name || ''}
                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                    fullWidth
                    sx={{ minWidth: 250 }}
                  />
                  
                  <FormControl fullWidth sx={{ minWidth: 200 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editForm.status || ''}
                      onChange={(e) => handleEditFormChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="Expired">Expired</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="Producer"
                    value={editForm.producer || ''}
                    onChange={(e) => handleEditFormChange('producer', e.target.value)}
                    fullWidth
                    sx={{ minWidth: 250 }}
                  />
                  
                  <TextField
                    label="Contracting Officer Representative"
                    value={editForm.cor || ''}
                    onChange={(e) => handleEditFormChange('cor', e.target.value)}
                    fullWidth
                    sx={{ minWidth: 250 }}
                  />
                  
                  <TextField
                    label="Period of Performance"
                    value={editForm.period_of_performance || ''}
                    onChange={(e) => handleEditFormChange('period_of_performance', e.target.value)}
                    fullWidth
                    sx={{ minWidth: 250 }}
                    placeholder="e.g., 2023-01-01 to 2023-12-31"
                    helperText="Enter date range in format: YYYY-MM-DD to YYYY-MM-DD"
                  />
                  
                  <TextField
                    label="Price"
                    type="number"
                    value={editForm.price || ''}
                    onChange={(e) => handleEditFormChange('price', e.target.value)}
                    fullWidth
                    sx={{ minWidth: 200 }}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                    }}
                  />
                </Box>
                
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
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <BusinessIcon sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Producer</Typography>
                    <Typography variant="body1">{displayValue(taskOrder.producer, 'Not Assigned')}</Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <AssignmentIcon sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Contracting Officer Representative</Typography>
                    <Typography variant="body1">{displayValue(taskOrder.cor, 'Not Assigned')}</Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <MoneyIcon sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Price</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">
                      {formatCurrency(taskOrder.price)}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Period of Performance</Typography>
                    <Typography variant="body1">{displayValue(taskOrder.period_of_performance, 'Not Specified')}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
          
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Associated Products
              <Chip label={products.length} sx={{ ml: 2 }} size="small" />
            </Typography>
            
            {products.length > 0 ? (
              <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                {products.map((product) => (
                  <ListItem 
                    key={product.id}
                    sx={{ 
                      border: '1px solid #eee', 
                      borderRadius: 1, 
                      mb: 1,
                      '&:hover': { bgcolor: 'action.hover' } 
                    }}
                  >
                    <ListItemIcon>
                      <InventoryIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{product.site_id}</Typography>
                          <Chip 
                            label={product.status} 
                            size="small"
                            color={getStatusColor(product.status)}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            Item ID: {product.item_id || 'N/A'} • 
                            Type: {product.product_type_name || `Type ${product.product_type_id}`} •
                            Team: {product.team_name || 'Unassigned'}
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleViewProduct(product.id)}>
                        <VisibilityIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Card variant="outlined" sx={{ bgcolor: 'grey.100' }}>
                <CardContent>
                  <Typography color="text.secondary" align="center">
                    No products associated with this task order
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Product Locations & Management
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate(`/products/create?taskOrderId=${taskOrder.id}&taskOrderName=${encodeURIComponent(taskOrder.name)}`)}
                >
                  Create Product
                </Button>
              </Box>
              
              <InteractiveMap
                height={400}
                geometryType="Point"
                showDrawingTools={false}
                baseLayer="satellite"
                initialLat={products.length > 0 ? getMapCenter().lat : 39.8283}
                initialLon={products.length > 0 ? getMapCenter().lon : -98.5795}
                ref={mapRef}
              />
            </Box>
          </Paper>
        </>
      ) : (
        <Alert severity="info">No task order found with the given ID.</Alert>
      )}
      
      {/* Success Notification */}
      <Snackbar
        open={editSuccess}
        autoHideDuration={3000}
        onClose={() => setEditSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setEditSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Task order updated successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TaskOrderPage;
