// src/components/ProductSelector.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  Avatar,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stack,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Public as PublicIcon,
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';

export interface Product {
  id: number;
  site_id: string;
  item_id: string;
  status: string;
  product_type_id: number;
  product_type_name?: string;
  product_type_acronym?: string;
  classification: string;
  notes?: string;
  created_at: string;
  coordinate_system?: string;
  assigned_team_names?: string[];
}

interface ProductSelectorProps {
  value: Product | null;
  onChange: (product: Product | null) => void;
  excludeTeamId?: number; // Exclude products already assigned to this team
  placeholder?: string;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  maxResults?: number;
}

interface ProductFilters {
  productTypes: number[];
  statuses: string[];
  classifications: string[];
  unassignedOnly: boolean;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  value,
  onChange,
  excludeTeamId,
  placeholder = "Search by Site ID, Item ID, or Product Type...",
  label = "Select Product",
  error = false,
  helperText,
  disabled = false,
  maxResults = 1000,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    productTypes: [],
    statuses: [],
    classifications: [],
    unassignedOnly: false,
  });

  // Available filter options (these could be loaded from the backend)
  const [productTypes, setProductTypes] = useState<Array<{id: number, name: string, acronym: string}>>([]);
  const availableStatuses = ['In Progress', 'Completed', 'On Hold', 'Cancelled', 'Pending Review'];
  const availableClassifications = ['Unclassified', 'CUI', 'Confidential', 'Secret'];

  // Load initial data
  useEffect(() => {
    loadProductTypes();
    loadProducts();
  }, []);

  // Reload products when filters change or excludeTeamId changes
  useEffect(() => {
    loadProducts();
  }, [filters, excludeTeamId]);

  const loadProductTypes = async () => {
    try {
      const response = await invoke<string>('get_all_product_types');
      const data = JSON.parse(response);
      if (data.success && data.data) {
        setProductTypes(data.data);
      }
    } catch (error) {
      console.error('Failed to load product types:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Use existing get_all_products command since search_products doesn't exist
      const response = await invoke<string>('get_all_products');
      const data = JSON.parse(response);
      
      if (data.success && data.data) {
        // Handle different response structures
        const products = Array.isArray(data.data) ? data.data : (data.data.products || []);
        
        // Enrich products with product type information
        let enrichedProducts = products.map((product: Product) => ({
          ...product,
          product_type_name: productTypes.find(pt => pt.id === product.product_type_id)?.name || 'Unknown',
          product_type_acronym: productTypes.find(pt => pt.id === product.product_type_id)?.acronym || 'N/A',
        }));

        // Apply client-side filtering since backend doesn't support advanced search
        if (excludeTeamId) {
          // Filter out products already assigned to the current team
          // This would need team assignment data - for now we'll skip this filter
        }

        // Apply other filters
        if (filters.productTypes.length > 0) {
          enrichedProducts = enrichedProducts.filter((product: Product) => 
            filters.productTypes.includes(product.product_type_id)
          );
        }

        if (filters.statuses.length > 0) {
          enrichedProducts = enrichedProducts.filter((product: Product) => 
            filters.statuses.includes(product.status)
          );
        }

        if (filters.classifications.length > 0) {
          enrichedProducts = enrichedProducts.filter((product: Product) => 
            filters.classifications.includes(product.classification)
          );
        }

        // Limit results for performance
        if (enrichedProducts.length > maxResults) {
          enrichedProducts = enrichedProducts.slice(0, maxResults);
        }

        setProducts(enrichedProducts);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText.length >= 2 || searchText.length === 0) {
        loadProducts();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Filter products based on search text
  const filteredProducts = useMemo(() => {
    if (!searchText && filters.productTypes.length === 0 && filters.statuses.length === 0 && 
        filters.classifications.length === 0 && !filters.unassignedOnly) {
      return products;
    }

    return products.filter(product => {
      const searchMatch = !searchText || 
        product.site_id.toLowerCase().includes(searchText.toLowerCase()) ||
        product.item_id.toLowerCase().includes(searchText.toLowerCase()) ||
        (product.product_type_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (product.product_type_acronym || '').toLowerCase().includes(searchText.toLowerCase());

      return searchMatch;
    });
  }, [products, searchText]);

  const handleFilterToggle = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const clearAllFilters = () => {
    setFilters({
      productTypes: [],
      statuses: [],
      classifications: [],
      unassignedOnly: false,
    });
    setSearchText('');
  };

  const getOptionLabel = (option: Product) => {
    return `${option.site_id} - ${option.product_type_acronym || 'N/A'}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'in progress': return 'info';
      case 'on hold': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'unclassified': return 'success';
      case 'cui': return 'info';
      case 'confidential': return 'warning';
      case 'secret': return 'error';
      default: return 'default';
    }
  };

  const activeFiltersCount = filters.productTypes.length + filters.statuses.length + 
                            filters.classifications.length + (filters.unassignedOnly ? 1 : 0);

  return (
    <Box>
      <Autocomplete
        options={filteredProducts}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        getOptionLabel={getOptionLabel}
        loading={loading}
        disabled={disabled}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        filterOptions={(options) => options} // We handle filtering ourselves
        noOptionsText={
          searchText.length > 0 && searchText.length < 2 
            ? "Type at least 2 characters to search" 
            : filteredProducts.length === 0 
              ? "No products found" 
              : "No products match your search"
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {loading && <CircularProgress size={20} />}
                  <Button
                    size="small"
                    onClick={handleFilterToggle}
                    startIcon={<FilterListIcon />}
                    color={activeFiltersCount > 0 ? 'primary' : 'inherit'}
                  >
                    {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                  </Button>
                  {params.InputProps.endAdornment}
                </Box>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 12 }}>
                {option.product_type_acronym || 'N/A'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" noWrap>
                  <strong>{option.site_id}</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary" noWrap>
                  {option.item_id} • {option.product_type_name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip 
                    label={option.status} 
                    size="small" 
                    color={getStatusColor(option.status) as any}
                  />
                  <Chip 
                    label={option.classification} 
                    size="small" 
                    variant="outlined"
                    color={getClassificationColor(option.classification) as any}
                  />
                  {option.assigned_team_names && option.assigned_team_names.length > 0 && (
                    <Chip 
                      label={`${option.assigned_team_names.length} team(s)`} 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="caption" color="textSecondary">
                  {option.coordinate_system || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </li>
        )}
        PaperComponent={({ children }) => (
          <Paper elevation={8} sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredProducts.length > 50 && (
              <Alert severity="info" sx={{ m: 1 }}>
                Showing first {Math.min(filteredProducts.length, maxResults)} results. Use filters to narrow down.
              </Alert>
            )}
            {children}
          </Paper>
        )}
      />

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={handleFilterClose}
        PaperProps={{
          sx: { minWidth: 300, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filters</Typography>
            <Button size="small" onClick={clearAllFilters}>
              Clear All
            </Button>
          </Box>

          <Stack spacing={2}>
            {/* Unassigned Only Filter */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.unassignedOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, unassignedOnly: e.target.checked }))}
                />
              }
              label="Unassigned products only"
            />

            <Divider />

            {/* Product Types Filter */}
            <Typography variant="subtitle2">Product Types:</Typography>
            <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
              {productTypes.map((type) => (
                <FormControlLabel
                  key={type.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={filters.productTypes.includes(type.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, productTypes: [...prev.productTypes, type.id] }));
                        } else {
                          setFilters(prev => ({ ...prev, productTypes: prev.productTypes.filter(id => id !== type.id) }));
                        }
                      }}
                    />
                  }
                  label={`${type.name} (${type.acronym})`}
                />
              ))}
            </Box>

            <Divider />

            {/* Status Filter */}
            <Typography variant="subtitle2">Status:</Typography>
            {availableStatuses.map((status) => (
              <FormControlLabel
                key={status}
                control={
                  <Checkbox
                    size="small"
                    checked={filters.statuses.includes(status)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({ ...prev, statuses: [...prev.statuses, status] }));
                      } else {
                        setFilters(prev => ({ ...prev, statuses: prev.statuses.filter(s => s !== status) }));
                      }
                    }}
                  />
                }
                label={status}
              />
            ))}

            <Divider />

            {/* Classification Filter */}
            <Typography variant="subtitle2">Classification:</Typography>
            {availableClassifications.map((classification) => (
              <FormControlLabel
                key={classification}
                control={
                  <Checkbox
                    size="small"
                    checked={filters.classifications.includes(classification)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({ ...prev, classifications: [...prev.classifications, classification] }));
                      } else {
                        setFilters(prev => ({ ...prev, classifications: prev.classifications.filter(c => c !== classification) }));
                      }
                    }}
                  />
                }
                label={classification}
              />
            ))}
          </Stack>
        </Box>
      </Menu>
    </Box>
  );
};

export default ProductSelector;