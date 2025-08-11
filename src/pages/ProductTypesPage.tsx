// src/pages/ProductTypesPage.tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Category as CategoryIcon,
  Map as MapIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface ProductType {
  id: number;
  name: string;
  description?: string;
  category: string;
  geometry_type: 'point' | 'polygon' | 'multipolygon' | 's2_cell' | 'any';
  default_classification: string;
  requires_review: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

interface ProductCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

const GEOMETRY_TYPES = [
  { value: 'point', label: 'Point' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'multipolygon', label: 'Multi-Polygon' },
  { value: 's2_cell', label: 'S2 Cell' },
  { value: 'any', label: 'Any Geometry' },
];

const CLASSIFICATION_LEVELS = [
  'Unclassified',
  'Confidential',
  'Secret',
  'Top Secret',
];

const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'elevation', name: 'Elevation Products', description: 'Digital elevation models and terrain data', color: '#2E7D32' },
  { id: 'imagery', name: 'Imagery Products', description: 'Satellite and aerial imagery', color: '#1976D2' },
  { id: 'vector', name: 'Vector Products', description: 'Feature extraction and vector datasets', color: '#7B1FA2' },
  { id: 'analysis', name: 'Analysis Products', description: 'Analytical and derived products', color: '#F57C00' },
  { id: 'custom', name: 'Custom Products', description: 'Customer-specific product types', color: '#5D4037' },
];

const ProductTypesPage: React.FC = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [categories] = useState<ProductCategory[]>(DEFAULT_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    geometry_type: 'any' as ProductType['geometry_type'],
    default_classification: 'Unclassified',
    requires_review: true,
    enabled: true,
  });

  useEffect(() => {
    loadProductTypes();
  }, []);

  const loadProductTypes = async () => {
    try {
      setLoading(true);
      const response = await invoke<string>('get_all_product_types');
      const data = JSON.parse(response);
      
      if (data.success && Array.isArray(data.data)) {
        // Enrich with product counts
        const enrichedTypes = await Promise.all(
          data.data.map(async (type: ProductType) => {
            try {
              const countResponse = await invoke<string>('get_product_type_usage', { 
                product_type_id: type.id 
              });
              const countData = JSON.parse(countResponse);
              return {
                ...type,
                product_count: countData.count || 0,
              };
            } catch {
              return { ...type, product_count: 0 };
            }
          })
        );
        setProductTypes(enrichedTypes);
      }
    } catch (error) {
      console.error('Failed to load product types:', error);
      setMessage({ text: 'Failed to load product types', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, productType: ProductType) => {
    setAnchorEl(event.currentTarget);
    setSelectedProductType(productType);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProductType(null);
  };

  const handleCreateNew = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      geometry_type: 'any',
      default_classification: 'Unclassified',
      requires_review: true,
      enabled: true,
    });
    setCreateDialog(true);
  };

  const handleEdit = () => {
    if (selectedProductType) {
      setFormData({
        name: selectedProductType.name,
        description: selectedProductType.description || '',
        category: selectedProductType.category,
        geometry_type: selectedProductType.geometry_type,
        default_classification: selectedProductType.default_classification,
        requires_review: selectedProductType.requires_review,
        enabled: selectedProductType.enabled,
      });
      setEditDialog(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialog(true);
    handleMenuClose();
  };

  const handleFormSubmit = async (isEdit: boolean) => {
    try {
      const command = isEdit ? 'update_product_type' : 'create_product_type';
      const params = isEdit 
        ? { product_type_id: selectedProductType!.id, product_type: formData }
        : { product_type: formData };

      const response = await invoke<string>(command, params);
      const data = JSON.parse(response);

      if (data.success) {
        setMessage({ 
          text: `Product type ${isEdit ? 'updated' : 'created'} successfully`, 
          severity: 'success' 
        });
        loadProductTypes();
        setCreateDialog(false);
        setEditDialog(false);
      } else {
        throw new Error(data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Failed to save product type:', error);
      setMessage({ 
        text: `Failed to ${isEdit ? 'update' : 'create'} product type`, 
        severity: 'error' 
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedProductType) return;

    try {
      const response = await invoke<string>('delete_product_type', {
        product_type_id: selectedProductType.id
      });
      const data = JSON.parse(response);

      if (data.success) {
        setMessage({ text: 'Product type deleted successfully', severity: 'success' });
        loadProductTypes();
        setDeleteDialog(false);
        setSelectedProductType(null);
      } else {
        throw new Error(data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Failed to delete product type:', error);
      setMessage({ text: 'Failed to delete product type', severity: 'error' });
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  const filteredProductTypes = productTypes.filter(type => {
    const matchesSearch = searchTerm === '' || 
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === '' || type.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const canManageProductTypes = userRole === 'admin';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Product Types
        </Typography>
        {canManageProductTypes && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
          >
            Create Product Type
          </Button>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Total Types
                  </Typography>
                  <Typography variant="h4">
                    {productTypes.length}
                  </Typography>
                </Box>
                <CategoryIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Active Types
                  </Typography>
                  <Typography variant="h4">
                    {productTypes.filter(t => t.enabled).length}
                  </Typography>
                </Box>
                <SettingsIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Require Review
                  </Typography>
                  <Typography variant="h4">
                    {productTypes.filter(t => t.requires_review).length}
                  </Typography>
                </Box>
                <EditIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Total Products
                  </Typography>
                  <Typography variant="h4">
                    {productTypes.reduce((sum, type) => sum + (type.product_count || 0), 0)}
                  </Typography>
                </Box>
                <MapIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search product types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category Filter</InputLabel>
              <Select
                value={categoryFilter}
                label="Category Filter"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Product Types Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Geometry Type</TableCell>
              <TableCell>Classification</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Products</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProductTypes.map((type) => {
              const categoryInfo = getCategoryInfo(type.category);
              return (
                <TableRow key={type.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {type.name}
                      </Typography>
                      {type.description && (
                        <Typography variant="caption" color="text.secondary">
                          {type.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={categoryInfo.name}
                      size="small"
                      sx={{ 
                        backgroundColor: categoryInfo.color + '20',
                        color: categoryInfo.color,
                        borderColor: categoryInfo.color,
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={GEOMETRY_TYPES.find(g => g.value === type.geometry_type)?.label || 'Unknown'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{type.default_classification}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={type.enabled ? 'Active' : 'Disabled'}
                        color={type.enabled ? 'success' : 'default'}
                        size="small"
                      />
                      {type.requires_review && (
                        <Chip
                          label="Review Required"
                          color="warning"
                          size="small"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{type.product_count || 0}</TableCell>
                  <TableCell>
                    {new Date(type.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    {canManageProductTypes && (
                      <IconButton
                        onClick={(e) => handleMenuClick(e, type)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} disabled={(selectedProductType?.product_count || 0) > 0}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Product Type</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Geometry Type</InputLabel>
                <Select
                  value={formData.geometry_type}
                  label="Geometry Type"
                  onChange={(e) => setFormData({ ...formData, geometry_type: e.target.value as ProductType['geometry_type'] })}
                >
                  {GEOMETRY_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Default Classification</InputLabel>
                <Select
                  value={formData.default_classification}
                  label="Default Classification"
                  onChange={(e) => setFormData({ ...formData, default_classification: e.target.value })}
                >
                  {CLASSIFICATION_LEVELS.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requires_review}
                    onChange={(e) => setFormData({ ...formData, requires_review: e.target.checked })}
                  />
                }
                label="Requires Review"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                }
                label="Enabled"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={() => handleFormSubmit(false)}
            variant="contained"
            disabled={!formData.name || !formData.category}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Product Type</DialogTitle>
        <DialogContent>
          {/* Same form as create dialog */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Geometry Type</InputLabel>
                <Select
                  value={formData.geometry_type}
                  label="Geometry Type"
                  onChange={(e) => setFormData({ ...formData, geometry_type: e.target.value as ProductType['geometry_type'] })}
                >
                  {GEOMETRY_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Default Classification</InputLabel>
                <Select
                  value={formData.default_classification}
                  label="Default Classification"
                  onChange={(e) => setFormData({ ...formData, default_classification: e.target.value })}
                >
                  {CLASSIFICATION_LEVELS.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requires_review}
                    onChange={(e) => setFormData({ ...formData, requires_review: e.target.checked })}
                  />
                }
                label="Requires Review"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                }
                label="Enabled"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button
            onClick={() => handleFormSubmit(true)}
            variant="contained"
            disabled={!formData.name || !formData.category}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Product Type</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedProductType?.name}"?
            {(selectedProductType?.product_count || 0) > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This product type is used by {selectedProductType?.product_count} products. 
                You cannot delete it while it's in use.
              </Alert>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={(selectedProductType?.product_count || 0) > 0}
          >
            Delete
          </Button>
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
    </Box>
  );
};

export default ProductTypesPage;