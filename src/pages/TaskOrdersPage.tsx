import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
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
  Container
} from '@mui/material';

// Import icons
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import MoneyIcon from '@mui/icons-material/Money';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InventoryIcon from '@mui/icons-material/Inventory';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { format, parseISO } from 'date-fns';

// Types
interface TaskOrderDetails {
  id: number;
  contract_id: number;
  name: string;
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
  
  const mapElement = useRef<HTMLDivElement>(null);

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
            producer: data.data.producer || 'Not Assigned',
            cor: data.data.cor || 'Not Assigned',
            period_of_performance: data.data.pop || 'Not Specified',
            price: data.data.price || '0',
            status: data.data.status || 'Unknown',
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

  const handleViewProduct = (productId: number) => {
    navigate(`/products/${productId}`);
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
              </Typography>
              
              <Button 
                variant="outlined" 
                onClick={() => navigate(`/contracts/${taskOrder.contract_id}`)}
              >
                View Contract
              </Button>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <BusinessIcon sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Producer</Typography>
                    <Typography variant="body1">{taskOrder.producer}</Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <AssignmentIcon sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Contracting Officer Representative</Typography>
                    <Typography variant="body1">{taskOrder.cor}</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
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
                    <Typography variant="body1">{taskOrder.period_of_performance}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
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
              <Typography variant="h6" gutterBottom>
                Product Locations
              </Typography>
              <Paper 
                variant="outlined"
                sx={{ 
                  width: '100%', 
                  height: '400px',
                  p: 0,
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <div ref={mapElement} style={{ width: '100%', height: '100%' }}>
                  {/* OpenLayers map will be rendered here */}
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography color="text.secondary">Map view will be implemented here</Typography>
                  </Box>
                </div>
              </Paper>
            </Box>
          </Paper>
        </>
      ) : (
        <Alert severity="info">No task order found with the given ID.</Alert>
      )}
    </Container>
  );
};

export default TaskOrderPage;
