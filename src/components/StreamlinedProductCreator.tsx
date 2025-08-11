// src/components/StreamlinedProductCreator.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Fade,
  LinearProgress,
  Divider,
  Stack,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  ArrowForward,
  ArrowBack,
  LocationOn,
  Public,
  Assignment,
  Save,
  MyLocation,
  AutoAwesome,
  Add
} from '@mui/icons-material';
import CoordinateSystemInput from './CoordinateSystemInput';
import GeometryInput from './GeometryInputSimple';
import { generateSiteId } from '../utils/serialGenerator';

interface ProductType {
  id: number;
  name: string;
  acronym: string;
  description?: string;
}

interface TaskOrder {
  id: number;
  name: string;
}

interface StreamlinedProductCreatorProps {
  productTypes: ProductType[];
  taskOrders: TaskOrder[];
  onSubmit: (productData: any) => Promise<void>;
  onCancel: () => void;
  defaultTaskOrder?: { id: number; name: string };
  isLoading?: boolean;
  onCreateProductType?: (name: string, acronym: string) => Promise<ProductType>;
}

const StreamlinedProductCreator: React.FC<StreamlinedProductCreatorProps> = ({
  productTypes,
  taskOrders,
  onSubmit,
  onCancel,
  defaultTaskOrder,
  isLoading = false,
  onCreateProductType
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    itemId: '',
    siteId: '', 
    productTypeId: '',
    status: 'In Progress',
    
    // Step 2: Location
    coordinateSystem: 'EPSG:4326',
    geometry: null as any,
    useCurrentLocation: false,
    coordinates: { lat: '', lon: '' },
    
    // Step 3: Assignment
    taskOrderId: defaultTaskOrder?.id?.toString() || '',
    classification: 'Unclassified',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // New product type dialog state
  const [newProductTypeDialogOpen, setNewProductTypeDialogOpen] = useState(false);
  const [newProductType, setNewProductType] = useState({ name: '', acronym: '' });
  const [creatingProductType, setCreatingProductType] = useState(false);

  const steps = [
    {
      label: 'Product Details',
      description: 'Basic product information',
      icon: <Assignment />,
      fields: ['itemId', 'siteId', 'productTypeId', 'status']
    },
    {
      label: 'Location & Coverage',
      description: 'Define the geographic area',
      icon: <LocationOn />,
      fields: ['coordinateSystem', 'geometry', 'coordinates']
    },
    {
      label: 'Assignment & Metadata',
      description: 'Task order and classification',
      icon: <Public />,
      fields: ['taskOrderId', 'classification', 'notes']
    }
  ];

  // Auto-generate IDs based on product type and location
  useEffect(() => {
    if (formData.productTypeId && (formData.coordinates.lat && formData.coordinates.lon || formData.geometry)) {
      const productType = productTypes.find(p => p.id.toString() === formData.productTypeId);
      if (productType) {
        // Generate Site ID: fyYY-productAcronym-serial (sequential per product type per fiscal year)
        if (!formData.siteId) {
          generateSiteId(productType.acronym, productType.id).then(generatedSiteId => {
            setFormData(prev => ({
              ...prev,
              siteId: prev.siteId || generatedSiteId
            }));
          }).catch(error => {
            console.error('Failed to generate site ID:', error);
            // Fallback to random if generation fails
            const currentYear = new Date().getFullYear();
            const fiscalYear = (currentYear % 100).toString().padStart(2, '0');
            const randomSerial = Math.floor(Math.random() * 999) + 1;
            const alphanumericSerial = 'A' + randomSerial.toString().padStart(3, '0');
            const fallbackSiteId = `fy${fiscalYear}-${productType.acronym}-${alphanumericSerial}`;
            setFormData(prev => ({
              ...prev,
              siteId: prev.siteId || fallbackSiteId
            }));
          });
        }
        
        // Generate Item ID based on lower left corner coordinates with precision based on grid size
        let generatedItemId = '';
        
        // Determine precision based on coordinate system/grid size
        let precision = 10000; // Default for fine grids
        let northingDigits = 4;
        let eastingDigits = 4;
        
        if (formData.coordinateSystem.startsWith('WGS84-GRID:')) {
          const gridSize = parseFloat(formData.coordinateSystem.split(':')[1]) || 1.0;
          if (gridSize >= 1.0) {
            // 1 degree grid: nXXeYYY format (less precision needed)
            precision = 100;
            northingDigits = 2;
            eastingDigits = 3;
          } else if (gridSize >= 0.5) {
            // 0.5 degree grid: nXXXeYYYY format
            precision = 1000;
            northingDigits = 3;
            eastingDigits = 4;
          } else {
            // Finer grids: nXXXXeYYYY format
            precision = 10000;
            northingDigits = 4;
            eastingDigits = 4;
          }
        }
        
        if (formData.geometry) {
          // Extract lower left corner from geometry
          let minLat = Infinity, minLon = Infinity;
          
          if (formData.geometry.type === 'Polygon' && formData.geometry.coordinates?.[0]) {
            formData.geometry.coordinates[0].forEach((coord: number[]) => {
              if (coord[0] < minLon) minLon = coord[0]; // longitude
              if (coord[1] < minLat) minLat = coord[1]; // latitude
            });
          }
          
          if (minLat !== Infinity && minLon !== Infinity) {
            // Convert to grid-appropriate precision format
            const northing = Math.abs(minLat * precision).toString().padStart(northingDigits, '0');
            const easting = Math.abs(minLon * precision).toString().padStart(eastingDigits, '0');
            generatedItemId = `n${northing}e${easting}`;
          } else {
            generatedItemId = `${productType.acronym}_A001`; // Use A001 as fallback
          }
        } else if (formData.coordinates.lat && formData.coordinates.lon) {
          // Generate based on coordinates (treat as lower left corner)
          const lat = parseFloat(formData.coordinates.lat);
          const lon = parseFloat(formData.coordinates.lon);
          const northing = Math.abs(lat * precision).toString().padStart(northingDigits, '0');
          const easting = Math.abs(lon * precision).toString().padStart(eastingDigits, '0');
          generatedItemId = `n${northing}e${easting}`;
        } else {
          // Fallback
          generatedItemId = `${productType.acronym}_A001`; // Use A001 as fallback
        }
        
        setFormData(prev => ({
          ...prev,
          itemId: prev.itemId || generatedItemId
        }));
      }
    }
  }, [formData.productTypeId, formData.coordinates, formData.geometry, formData.coordinateSystem, productTypes]);

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep >= 0) {
      if (!formData.itemId.trim()) newErrors.itemId = 'Item ID is required';
      if (!formData.siteId.trim()) newErrors.siteId = 'Site ID is required';
      if (!formData.productTypeId) newErrors.productTypeId = 'Product type is required';
    }
    
    if (currentStep >= 1) {
      if (!formData.geometry && (!formData.coordinates.lat || !formData.coordinates.lon)) {
        newErrors.geometry = 'Location is required - use map or enter coordinates';
      }
    }

    setErrors(newErrors);
    
    // Mark step as completed if no errors
    const stepFields = steps[currentStep]?.fields || [];
    const hasStepErrors = stepFields.some(field => newErrors[field]);
    if (!hasStepErrors && currentStep >= 0) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
  }, [formData, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            coordinates: {
              lat: position.coords.latitude.toFixed(6),
              lon: position.coords.longitude.toFixed(6)
            },
            useCurrentLocation: true
          }));
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  const isStepValid = (step: number) => {
    const stepFields = steps[step]?.fields || [];
    return stepFields.every(field => !errors[field]) && stepFields.some(field => {
      if (field === 'geometry') return formData.geometry || (formData.coordinates.lat && formData.coordinates.lon);
      return formData[field as keyof typeof formData];
    });
  };

  const getStepProgress = () => {
    return ((currentStep + 1) / steps.length) * 100;
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment color="primary" />
              Product Information
            </Typography>
            
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Product Type *</InputLabel>
                <Select
                  value={formData.productTypeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, productTypeId: e.target.value }))}
                  label="Product Type *"
                  error={!!errors.productTypeId}
                >
                  {productTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id.toString()}>
                      <Box>
                        <Typography variant="body1">{type.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {type.acronym}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => setNewProductTypeDialogOpen(true)}
                fullWidth
                sx={{ mt: 1 }}
              >
                Create New Product Type
              </Button>

              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Item ID"
                  value={formData.itemId}
                  onChange={(e) => setFormData(prev => ({ ...prev, itemId: e.target.value }))}
                  error={!!errors.itemId}
                  helperText={errors.itemId || 'Auto-generated from lower left corner (precision matches grid size)'}
                  InputProps={{
                    endAdornment: formData.itemId ? (
                      <Tooltip title="Auto-generated">
                        <AutoAwesome color="primary" />
                      </Tooltip>
                    ) : null
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Site ID"
                  value={formData.siteId}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
                  error={!!errors.siteId}
                  helperText={errors.siteId || 'Auto-generated as fyYY-ACRONYM-A### format (sequential per product type per fiscal year)'}
                  InputProps={{
                    endAdornment: formData.siteId ? (
                      <Tooltip title="Auto-generated">
                        <AutoAwesome color="primary" />
                      </Tooltip>
                    ) : null
                  }}
                />
              </Stack>

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="On Hold">On Hold</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOn color="primary" />
              Location & Coverage Area
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Quick Location Options</Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<MyLocation />}
                      onClick={handleCurrentLocation}
                    >
                      Use My Location
                    </Button>
                  </Box>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Latitude"
                      value={formData.coordinates.lat}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, lat: e.target.value }
                      }))}
                      type="number"
                      size="small"
                    />
                    <TextField
                      label="Longitude"
                      value={formData.coordinates.lon}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, lon: e.target.value }
                      }))}
                      type="number"
                      size="small"
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <CoordinateSystemInput
              value={formData.coordinateSystem}
              onChange={(value) => setFormData(prev => ({ ...prev, coordinateSystem: value }))}
            />

            <GeometryInput
              geometryType="Polygon"
              coordinateSystem={formData.coordinateSystem}
              onGeometryChange={(geometry) => setFormData(prev => ({ ...prev, geometry }))}
            />

            {errors.geometry && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {errors.geometry}
              </Alert>
            )}
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Public color="primary" />
              Assignment & Classification
            </Typography>

            <Stack spacing={2}>
              {defaultTaskOrder ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This product will be assigned to task order: <strong>{defaultTaskOrder.name}</strong>
                </Alert>
              ) : (
                <Autocomplete
                  options={taskOrders}
                  getOptionLabel={(option) => option.name}
                  value={taskOrders.find(to => to.id.toString() === formData.taskOrderId) || null}
                  onChange={(_, value) => 
                    setFormData(prev => ({ ...prev, taskOrderId: value?.id.toString() || '' }))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Task Order (Optional)"
                      helperText="Select a task order to assign this product to"
                    />
                  )}
                />
              )}

              <FormControl fullWidth>
                <InputLabel>Classification</InputLabel>
                <Select
                  value={formData.classification}
                  onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value }))}
                  label="Classification"
                >
                  <MenuItem value="Unclassified">Unclassified</MenuItem>
                  <MenuItem value="CUI">CUI (Controlled Unclassified Information)</MenuItem>
                  <MenuItem value="Confidential">Confidential</MenuItem>
                  <MenuItem value="Secret">Secret</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                placeholder="Additional notes or special instructions..."
              />
            </Stack>
          </Stack>
        );

      default:
        return null;
    }
  };

  const handleCreateProductType = async () => {
    if (!newProductType.name.trim() || !newProductType.acronym.trim()) {
      return;
    }
    
    if (!onCreateProductType) {
      console.warn('onCreateProductType handler not provided');
      return;
    }

    setCreatingProductType(true);
    
    try {
      const createdType = await onCreateProductType(
        newProductType.name.trim(),
        newProductType.acronym.trim()
      );
      
      // Auto-select the newly created product type
      setFormData(prev => ({ ...prev, productTypeId: createdType.id.toString() }));
      
      // Close dialog and reset form
      setNewProductTypeDialogOpen(false);
      setNewProductType({ name: '', acronym: '' });
    } catch (error) {
      console.error('Failed to create product type:', error);
    } finally {
      setCreatingProductType(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
    <Paper elevation={1} sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Progress Header */}
      <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h5" gutterBottom>
          Create New Product
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={getStepProgress()} 
          sx={{ 
            mt: 1, 
            bgcolor: 'rgba(255,255,255,0.3)',
            '& .MuiLinearProgress-bar': { bgcolor: 'white' }
          }} 
        />
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.description}
        </Typography>
      </Box>

      {/* Step Content */}
      <Box sx={{ p: 3 }}>
        <Fade in={true} key={currentStep}>
          <Box>
            {renderStepContent(currentStep)}
          </Box>
        </Fade>
      </Box>

      {/* Navigation */}
      <Divider />
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          onClick={currentStep === 0 ? onCancel : handleBack}
          startIcon={<ArrowBack />}
          variant="outlined"
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {steps.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: index <= currentStep ? 'primary.main' : 'grey.300',
                border: completedSteps.has(index) ? '2px solid green' : 'none'
              }}
            />
          ))}
        </Box>

        {currentStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            startIcon={<Save />}
            variant="contained"
            disabled={isLoading || Object.keys(errors).length > 0}
          >
            {isLoading ? 'Creating...' : 'Create Product'}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            endIcon={<ArrowForward />}
            variant="contained"
            disabled={!isStepValid(currentStep)}
          >
            Next
          </Button>
        )}
      </Box>
    </Paper>
      
      {/* New Product Type Dialog */}
      <Dialog
        open={newProductTypeDialogOpen}
        onClose={() => setNewProductTypeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Product Type</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Product Type Name"
              value={newProductType.name}
              onChange={(e) => setNewProductType(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Digital Elevation Model"
              required
            />
            <TextField
              fullWidth
              label="Acronym"
              value={newProductType.acronym}
              onChange={(e) => setNewProductType(prev => ({ ...prev, acronym: e.target.value.toUpperCase() }))}
              placeholder="e.g., DEM"
              required
              inputProps={{ maxLength: 10 }}
              helperText="Short abbreviation (max 10 characters)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setNewProductTypeDialogOpen(false);
              setNewProductType({ name: '', acronym: '' });
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateProductType}
            disabled={creatingProductType || !newProductType.name.trim() || !newProductType.acronym.trim()}
            startIcon={creatingProductType ? <CircularProgress size={16} /> : undefined}
          >
            {creatingProductType ? 'Creating...' : 'Create Product Type'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StreamlinedProductCreator;