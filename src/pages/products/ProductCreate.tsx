// src/pages/products/ProductCreate.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid2,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Snackbar,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Map as MapIcon,
  Assignment as AssignmentIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import InteractiveMap from '../../components/InteractiveMap';

interface ProductFormData {
  item_id: string;
  site_id: string;
  product_type_id: number;
  status: string;
  taskorder_id: number | null;
  classification: string;
  geometry: any;
  coordinate_system: string;
}

interface TaskOrder {
  id: number;
  name: string;
  status: string;
}

interface ProductType {
  id: number;
  name: string;
  description: string;
}

const ProductCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [taskOrders, setTaskOrders] = useState<TaskOrder[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  
  const taskOrderId = searchParams.get('taskOrderId');
  
  const [formData, setFormData] = useState<ProductFormData>({
    item_id: '',
    site_id: '',
    product_type_id: 0,
    status: 'Created',
    taskorder_id: taskOrderId ? parseInt(taskOrderId) : null,
    classification: 'Unclassified',
    geometry: null,
    coordinate_system: 'EPSG:4326',
  });

  const steps = [
    'Basic Information',
    'Task Order & Type',
    'Geographic Coverage',
    'Review & Create'
  ];

  useEffect(() => {
    loadTaskOrders();
    loadProductTypes();
  }, []);

  const loadTaskOrders = async () => {
    try {
      const response = await invoke<string>('get_all_taskorders');
      const data = JSON.parse(response);
      if (data.data && Array.isArray(data.data)) {
        setTaskOrders(data.data);
      } else if (Array.isArray(data)) {
        setTaskOrders(data);
      } else {
        console.warn('Unexpected task orders data format:', data);
        setTaskOrders([]);
      }
    } catch (error) {
      console.error('Failed to load task orders:', error);
      setTaskOrders([]);
    }
  };

  const loadProductTypes = async () => {
    try {
      const response = await invoke<string>('get_product_types');
      const data = JSON.parse(response);
      if (data.data && Array.isArray(data.data)) {
        setProductTypes(data.data);
      } else if (Array.isArray(data)) {
        setProductTypes(data);
      } else {
        // Fallback to default types if backend doesn't have any
        setProductTypes([
          { id: 1, name: 'Digital Elevation Model (DEM)', description: 'High-resolution elevation data' },
          { id: 2, name: 'Orthoimagery', description: 'Geometrically corrected aerial imagery' },
          { id: 3, name: 'Topographic Map', description: 'Traditional topographic mapping products' },
          { id: 4, name: 'Satellite Imagery', description: 'Commercial satellite imagery products' },
          { id: 5, name: 'LiDAR Point Cloud', description: 'Raw or processed LiDAR datasets' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load product types:', error);
      // Fallback to default types on error
      setProductTypes([
        { id: 1, name: 'Digital Elevation Model (DEM)', description: 'High-resolution elevation data' },
        { id: 2, name: 'Orthoimagery', description: 'Geometrically corrected aerial imagery' },
        { id: 3, name: 'Topographic Map', description: 'Traditional topographic mapping products' },
        { id: 4, name: 'Satellite Imagery', description: 'Commercial satellite imagery products' },
        { id: 5, name: 'LiDAR Point Cloud', description: 'Raw or processed LiDAR datasets' },
      ]);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleGeometryChange = (geometry: any) => {
    setFormData(prev => ({
      ...prev,
      geometry
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const response = await invoke<string>('create_product', formData);
      const data = JSON.parse(response);

      if (data.success || data.id) {
        setMessage({ text: 'Product created successfully!', severity: 'success' });
        setTimeout(() => {
          navigate('/products');
        }, 1500);
      } else {
        throw new Error(data.message || 'Failed to create product');
      }
    } catch (err) {
      console.error('Error creating product:', err);
      setMessage({ 
        text: typeof err === 'string' ? err : 'Failed to create product', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid2 container spacing={3}>
            <Grid2 xs={12} md={6}>
              <TextField
                fullWidth
                label="Item ID"
                value={formData.item_id}
                onChange={(e) => handleInputChange('item_id', e.target.value)}
                required
                helperText="Unique identifier for this product"
              />
            </Grid2>
            <Grid2 xs={12} md={6}>
              <TextField
                fullWidth
                label="Site ID"
                value={formData.site_id}
                onChange={(e) => handleInputChange('site_id', e.target.value)}
                required
                helperText="Geographic site or area identifier"
              />
            </Grid2>
            <Grid2 xs={12}>
              <FormControl fullWidth>
                <InputLabel>Classification</InputLabel>
                <Select
                  value={formData.classification}
                  label="Classification"
                  onChange={(e) => handleInputChange('classification', e.target.value)}
                >
                  <MenuItem value="Unclassified">Unclassified</MenuItem>
                  <MenuItem value="Confidential">Confidential</MenuItem>
                  <MenuItem value="Secret">Secret</MenuItem>
                  <MenuItem value="Top Secret">Top Secret</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
          </Grid2>
        );

      case 1:
        return (
          <Grid2 container spacing={3}>
            <Grid2 xs={12}>
              <FormControl fullWidth>
                <InputLabel>Task Order</InputLabel>
                <Select
                  value={formData.taskorder_id || ''}
                  label="Task Order"
                  onChange={(e) => handleInputChange('taskorder_id', e.target.value ? parseInt(e.target.value as string) : null)}
                >
                  <MenuItem value="">No Task Order</MenuItem>
                  {taskOrders.map((taskOrder) => (
                    <MenuItem key={taskOrder.id} value={taskOrder.id}>
                      {taskOrder.name} ({taskOrder.status})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 xs={12}>
              <FormControl fullWidth>
                <InputLabel>Product Type</InputLabel>
                <Select
                  value={formData.product_type_id || ''}
                  label="Product Type"
                  onChange={(e) => handleInputChange('product_type_id', parseInt(e.target.value as string))}
                  required
                >
                  {productTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      <Box>
                        <Typography variant="body1">{type.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 xs={12}>
              <TextField
                fullWidth
                label="Coordinate System"
                value={formData.coordinate_system}
                onChange={(e) => handleInputChange('coordinate_system', e.target.value)}
                helperText="EPSG code for the coordinate reference system"
              />
            </Grid2>
          </Grid2>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Define Geographic Coverage
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click on the map to define the geographic area for this product
            </Typography>
            <Box sx={{ height: 400, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <InteractiveMap onGeometryChange={handleGeometryChange} />
            </Box>
            {formData.geometry && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Geographic coverage defined successfully!
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Product Details
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Basic Information
                    </Typography>
                    <Typography variant="body2">Item ID: {formData.item_id}</Typography>
                    <Typography variant="body2">Site ID: {formData.site_id}</Typography>
                    <Typography variant="body2">Classification: {formData.classification}</Typography>
                  </CardContent>
                </Card>
              </Grid2>
              <Grid2 xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Assignment
                    </Typography>
                    <Typography variant="body2">
                      Task Order: {formData.taskorder_id ? 
                        taskOrders.find(t => t.id === formData.taskorder_id)?.name || 'Unknown' : 
                        'None'
                      }
                    </Typography>
                    <Typography variant="body2">
                      Product Type: {productTypes.find(t => t.id === formData.product_type_id)?.name || 'None'}
                    </Typography>
                    <Typography variant="body2">Coordinate System: {formData.coordinate_system}</Typography>
                  </CardContent>
                </Card>
              </Grid2>
              <Grid2 xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Geographic Coverage
                    </Typography>
                    {formData.geometry ? (
                      <Chip label="Geographic area defined" color="success" />
                    ) : (
                      <Chip label="No geographic area defined" color="warning" />
                    )}
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/products')}
          sx={{ mr: 2 }}
        >
          Back to Products
        </Button>
        <Typography variant="h4" component="h1">
          Create New Product
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              >
                {loading ? 'Creating...' : 'Create Product'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={
                  (activeStep === 0 && (!formData.item_id || !formData.site_id)) ||
                  (activeStep === 1 && !formData.product_type_id)
                }
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

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
    </Box>
  );
};

export default ProductCreate;