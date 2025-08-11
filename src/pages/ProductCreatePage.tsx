import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { AuthContext } from '../context/AuthContext';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Grid,
  Switch,
  FormControlLabel,
  Chip,
  Autocomplete,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add,
  LocationOn,
  Public,
  Assignment,
  AutoAwesome,
  Edit,
  CloudUpload,
  Layers,
  ExpandMore,
  MyLocation,
  GetApp,
  FileUpload,
} from '@mui/icons-material';

import CoordinateSystemInput from '../components/CoordinateSystemInput';
import GeometryInput from '../components/GeometryInputSimple';
import InteractiveMap from '../components/InteractiveMap';
import { generateSiteId } from '../utils/serialGenerator';

interface ProductType {
  id: number;
  name: string;
  acronym: string;
}

interface TaskOrder {
  id: number;
  name: string;
  contract_title?: string;
}

interface NewProductType {
  name: string;
  acronym: string;
}

const SUPPORTED_FORMATS = [
  { ext: '.geojson', name: 'GeoJSON', description: 'JSON-based geospatial data format' },
  { ext: '.shp', name: 'Shapefile', description: 'ESRI Shapefile (with .dbf, .shx)' },
  { ext: '.kml', name: 'KML', description: 'Keyhole Markup Language' },
  { ext: '.gpx', name: 'GPX', description: 'GPS Exchange Format' },
  { ext: '.csv', name: 'CSV with coordinates', description: 'Comma-separated values with lat/lon' },
];

const ProductCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [taskOrders, setTaskOrders] = useState<TaskOrder[]>([]);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Get task order context from URL params
  const taskOrderId = searchParams.get('taskOrderId');
  const taskOrderName = searchParams.get('taskOrderName');

  // Form data
  const [formData, setFormData] = useState({
    // Basic Info
    site_id: '',
    item_id: '',
    product_type_id: '',
    status: 'In Progress',
    
    // Location & Geometry
    coordinate_system: 'EPSG:4326',
    geometry_type: 'Polygon' as 'Polygon' | 'MultiPolygon',
    geometry: null as any,
    coordinates: { lat: '', lon: '' },
    
    // Assignment & Metadata
    taskorder_id: taskOrderId || '',
    classification: 'Unclassified',
    notes: '',
    
    // Auto-generation settings
    auto_generate_ids: true,
  });

  // UI State
  const [newProductTypeDialogOpen, setNewProductTypeDialogOpen] = useState(false);
  const [newProductType, setNewProductType] = useState<NewProductType>({ name: '', acronym: '' });
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);

  // Authentication context
  const auth = useContext(AuthContext);
  if (!auth) return null;
  const { authToken, getAuthHeaders, userRole } = auth;

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load product types
        const typesResponse = await invoke<string>('get_all_product_types');
        const typesData = JSON.parse(typesResponse);
        if (typesData.success && typesData.data) {
          setProductTypes(typesData.data);
        }

        // Load task orders
        const ordersResponse = await invoke<string>('get_all_taskorders');
        const ordersData = JSON.parse(ordersResponse);
        if (ordersData.success && ordersData.data) {
          setTaskOrders(ordersData.data);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setMessage({ 
          text: 'Failed to load form data. Please refresh the page.', 
          severity: 'error' 
        });
      }
    };

    loadInitialData();
  }, []);

  // Auto-generate IDs when enabled
  useEffect(() => {
    if (!formData.auto_generate_ids || !formData.product_type_id) return;

    const productType = productTypes.find(p => p.id.toString() === formData.product_type_id);
    if (!productType) return;

    // Generate Site ID: fyYY-productAcronym-serial (sequential per product type per fiscal year)
    if (!formData.site_id) {
      generateSiteId(productType.acronym, productType.id).then(generatedSiteId => {
        setFormData(prev => ({ ...prev, site_id: generatedSiteId }));
      }).catch(error => {
        console.error('Failed to generate site ID:', error);
        // Fallback to random if generation fails
        const currentYear = new Date().getFullYear();
        const fiscalYear = (currentYear % 100).toString().padStart(2, '0');
        const randomSerial = Math.floor(Math.random() * 999) + 1;
        const fallbackSerial = 'A' + randomSerial.toString().padStart(3, '0');
        const fallbackSiteId = `fy${fiscalYear}-${productType.acronym}-${fallbackSerial}`;
        setFormData(prev => ({ ...prev, site_id: fallbackSiteId }));
      });
    }

    // Generate Item ID based on geometry/coordinates
    if (!formData.item_id && (formData.geometry || (formData.coordinates.lat && formData.coordinates.lon))) {
      let generatedItemId = '';
      
      // Determine precision based on coordinate system
      let precision = 10000;
      let northingDigits = 4;
      let eastingDigits = 4;
      
      if (formData.coordinate_system.startsWith('WGS84-GRID:')) {
        const gridSize = parseFloat(formData.coordinate_system.split(':')[1]) || 1.0;
        if (gridSize >= 1.0) {
          precision = 100;
          northingDigits = 2;
          eastingDigits = 3;
        } else if (gridSize >= 0.5) {
          precision = 1000;
          northingDigits = 3;
          eastingDigits = 4;
        }
      }

      if (formData.geometry) {
        // Extract lower left corner from geometry
        let minLat = Infinity, minLon = Infinity;
        
        if (formData.geometry.type === 'Polygon' && formData.geometry.coordinates?.[0]) {
          formData.geometry.coordinates[0].forEach((coord: number[]) => {
            if (coord[0] < minLon) minLon = coord[0];
            if (coord[1] < minLat) minLat = coord[1];
          });
        }
        
        if (minLat !== Infinity && minLon !== Infinity) {
          const northing = Math.abs(minLat * precision).toString().padStart(northingDigits, '0');
          const easting = Math.abs(minLon * precision).toString().padStart(eastingDigits, '0');
          generatedItemId = `n${northing}e${easting}`;
        }
      } else if (formData.coordinates.lat && formData.coordinates.lon) {
        const lat = parseFloat(formData.coordinates.lat);
        const lon = parseFloat(formData.coordinates.lon);
        const northing = Math.abs(lat * precision).toString().padStart(northingDigits, '0');
        const easting = Math.abs(lon * precision).toString().padStart(eastingDigits, '0');
        generatedItemId = `n${northing}e${easting}`;
      }
      
      if (generatedItemId) {
        setFormData(prev => ({ ...prev, item_id: generatedItemId }));
      }
    }
  }, [formData.auto_generate_ids, formData.product_type_id, formData.geometry, formData.coordinates, formData.coordinate_system, formData.site_id, formData.item_id, productTypes]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validation
    if (!formData.site_id.trim()) {
      setMessage({ text: 'Site ID is required', severity: 'error' });
      return;
    }
    if (!formData.item_id.trim()) {
      setMessage({ text: 'Item ID is required', severity: 'error' });
      return;
    }
    if (!formData.product_type_id) {
      setMessage({ text: 'Product Type is required', severity: 'error' });
      return;
    }

    setLoading(true);

    try {
      const response = await invoke<string>('create_product', {
        item_id: formData.item_id,
        site_id: formData.site_id,
        product_type_id: parseInt(formData.product_type_id),
        status: formData.status,
        status_date: new Date().toISOString().split('T')[0],
        taskorder_id: formData.taskorder_id ? parseInt(formData.taskorder_id) : null,
        file_path: null,
        s2_index: null,
        classification: formData.classification,
        geometry: formData.geometry,
        coordinate_system: formData.coordinate_system,
        srid: (() => {
          const match = /^EPSG:(\d+)$/.exec(formData.coordinate_system);
          return match ? parseInt(match[1]) : null;
        })(),
      });

      const result = JSON.parse(response);
      
      if (result.success) {
        setMessage({ text: 'Product created successfully!', severity: 'success' });
        setTimeout(() => {
          if (taskOrderId) {
            navigate(`/task-orders/${taskOrderId}`);
          } else {
            navigate(`/products/${result.data}`);
          }
        }, 1500);
      } else {
        setMessage({ text: result.message || 'Failed to create product', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      setMessage({ text: 'Failed to create product. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (taskOrderId) {
      navigate(`/task-orders/${taskOrderId}`);
    } else {
      navigate('/products');
    }
  };

  const handleCreateProductType = async () => {
    if (!newProductType.name.trim() || !newProductType.acronym.trim()) {
      setMessage({ text: 'Product type name and acronym are required', severity: 'error' });
      return;
    }

    setLoading(true);

    try {
      const response = await invoke<string>('create_product_type', {
        name: newProductType.name.trim(),
        acronym: newProductType.acronym.trim(),
      });

      const result = JSON.parse(response);
      
      if (result.success) {
        // Reload product types
        const typesResponse = await invoke<string>('get_all_product_types');
        const typesData = JSON.parse(typesResponse);
        if (typesData.success && typesData.data) {
          setProductTypes(typesData.data);
          // Select the newly created product type
          const newType = typesData.data.find((type: ProductType) => 
            type.name === newProductType.name.trim()
          );
          if (newType) {
            setFormData(prev => ({ ...prev, product_type_id: newType.id.toString() }));
          }
        }

        setMessage({ text: 'Product type created successfully!', severity: 'success' });
        setNewProductTypeDialogOpen(false);
        setNewProductType({ name: '', acronym: '' });
      } else {
        setMessage({ text: result.message || 'Failed to create product type', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to create product type:', error);
      setMessage({ text: 'Failed to create product type. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoGenerate = () => {
    if (!formData.auto_generate_ids) {
      // Clear IDs when enabling auto-generation
      setFormData(prev => ({ 
        ...prev, 
        auto_generate_ids: true,
        site_id: '',
        item_id: ''
      }));
    } else {
      setFormData(prev => ({ ...prev, auto_generate_ids: false }));
    }
  };

  const renderProductForm = () => (
    <form onSubmit={handleSubmit}>
      <Stack spacing={4}>
        {/* Product Information Section */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Assignment color="primary" />
                <Typography variant="h6">Product Information</Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Product Type</InputLabel>
                    <Select
                      value={formData.product_type_id}
                      onChange={(e) => handleInputChange('product_type_id', e.target.value)}
                      label="Product Type"
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
                    sx={{ mt: 1 }}
                  >
                    Create New Product Type
                  </Button>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="On Hold">On Hold</MenuItem>
                      <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* ID Generation Section */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AutoAwesome color="primary" />
                <Typography variant="h6">Identification</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.auto_generate_ids}
                      onChange={toggleAutoGenerate}
                      color="primary"
                    />
                  }
                  label="Auto-generate IDs"
                />
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Site ID"
                    value={formData.site_id}
                    onChange={(e) => handleInputChange('site_id', e.target.value)}
                    required
                    helperText={formData.auto_generate_ids ? 'Auto-generated as fyYY-ACRONYM-A### format (sequential per product type per fiscal year)' : 'Enter unique site identifier'}
                    InputProps={{
                      endAdornment: formData.auto_generate_ids && formData.site_id ? (
                        <Tooltip title="Auto-generated">
                          <AutoAwesome color="primary" />
                        </Tooltip>
                      ) : null,
                      readOnly: formData.auto_generate_ids && !!formData.site_id
                    }}
                  />
                  {formData.auto_generate_ids && formData.site_id && (
                    <Button
                      size="small"
                      onClick={() => handleInputChange('site_id', '')}
                      sx={{ mt: 0.5 }}
                    >
                      Regenerate
                    </Button>
                  )}
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Item ID"
                    value={formData.item_id}
                    onChange={(e) => handleInputChange('item_id', e.target.value)}
                    required
                    helperText={formData.auto_generate_ids ? 'Auto-generated from lower left corner (precision matches grid size)' : 'Enter unique item identifier'}
                    InputProps={{
                      endAdornment: formData.auto_generate_ids && formData.item_id ? (
                        <Tooltip title="Auto-generated">
                          <AutoAwesome color="primary" />
                        </Tooltip>
                      ) : null,
                      readOnly: formData.auto_generate_ids && !!formData.item_id
                    }}
                  />
                  {formData.auto_generate_ids && formData.item_id && (
                    <Button
                      size="small"
                      onClick={() => handleInputChange('item_id', '')}
                      sx={{ mt: 0.5 }}
                    >
                      Regenerate
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* Location & Geometry Section */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LocationOn color="primary" />
                <Typography variant="h6">Location & Coverage Area</Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <CoordinateSystemInput
                    value={formData.coordinate_system}
                    onChange={(value) => handleInputChange('coordinate_system', value)}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Coverage Area Type</InputLabel>
                    <Select
                      value={formData.geometry_type}
                      onChange={(e) => handleInputChange('geometry_type', e.target.value)}
                      label="Coverage Area Type"
                    >
                      <MenuItem value="Polygon">Single Coverage Area (Polygon)</MenuItem>
                      <MenuItem value="MultiPolygon">Multiple Coverage Areas (MultiPolygon)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <GeometryInput
                geometryType={formData.geometry_type}
                coordinateSystem={formData.coordinate_system}
                onGeometryChange={(geometry) => handleInputChange('geometry', geometry)}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Assignment & Metadata Section */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Public color="primary" />
                <Typography variant="h6">Assignment & Metadata</Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  {taskOrderId ? (
                    <Alert severity="info">
                      Product will be assigned to task order: <strong>{taskOrderName}</strong>
                    </Alert>
                  ) : (
                    <Autocomplete
                      options={taskOrders}
                      getOptionLabel={(option) => option.name}
                      value={taskOrders.find(to => to.id.toString() === formData.taskorder_id) || null}
                      onChange={(_, value) => handleInputChange('taskorder_id', value?.id.toString() || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Task Order (Optional)"
                          helperText="Select a task order to assign this product to"
                        />
                      )}
                    />
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Classification</InputLabel>
                    <Select
                      value={formData.classification}
                      onChange={(e) => handleInputChange('classification', e.target.value)}
                      label="Classification"
                    >
                      <MenuItem value="Unclassified">Unclassified</MenuItem>
                      <MenuItem value="CUI">CUI (Controlled Unclassified Information)</MenuItem>
                      <MenuItem value="Confidential">Confidential</MenuItem>
                      <MenuItem value="Secret">Secret</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Additional notes or special instructions..."
                  />
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            onClick={handleCancel}
            startIcon={<ArrowBack />}
            variant="outlined"
          >
            {taskOrderName ? `Back to ${taskOrderName}` : 'Back to Products'}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          >
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </Box>
      </Stack>
    </form>
  );

  const renderBulkUpload = () => (
    <Stack spacing={4}>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CloudUpload color="primary" />
              <Typography variant="h6">Bulk Product Upload</Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CloudUpload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Upload Spatial Files
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Drag & drop files here or click to browse
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<FileUpload />}
              >
                Choose Files
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".geojson,.json,.shp,.kml,.gpx,.csv,.gml,.gpkg"
                />
              </Button>
            </Box>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Supported File Formats</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {SUPPORTED_FORMATS.map((format) => (
                    <ListItem key={format.ext}>
                      <ListItemIcon>
                        <GetApp />
                      </ListItemIcon>
                      <ListItemText
                        primary={format.name}
                        secondary={format.description}
                      />
                      <Chip label={format.ext} size="small" />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Products
        </Typography>
        {taskOrderName && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Creating product for Task Order: <strong>{taskOrderName}</strong>
          </Alert>
        )}
      </Box>

      {/* Mode Toggle */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Single Product" />
          <Tab label="Bulk Upload" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && renderProductForm()}
          {activeTab === 1 && renderBulkUpload()}
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
          <Button onClick={() => setNewProductTypeDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateProductType}
            disabled={loading || !newProductType.name.trim() || !newProductType.acronym.trim()}
          >
            Create Product Type
          </Button>
        </DialogActions>
      </Dialog>

      {/* Messages */}
      {message && (
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage(null)}
        >
          <Alert severity={message.severity} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
};

export default ProductCreatePage;