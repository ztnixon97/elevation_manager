// src/pages/products/ProductsList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid2,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemIcon,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Assignment as AssignIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  Map as MapIcon,
  RateReview as ReviewIcon,
  Person as PersonIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

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

interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface Team {
  id: number;
  name: string;
}

const ProductsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignmentDialog, setAssignmentDialog] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadProducts();
    loadUsers();
    loadTeams();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await invoke<string>('get_all_products');
      const data = JSON.parse(response);
      if (data.data && Array.isArray(data.data)) {
        setProducts(data.data);
      } else if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.warn('Unexpected product data format:', data);
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setMessage({ text: 'Failed to load products', severity: 'error' });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await invoke<string>('get_all_users');
      const data = JSON.parse(response);
      if (data.data && Array.isArray(data.data)) {
        setUsers(data.data);
      } else if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // Keep empty array as fallback
      setUsers([]);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await invoke<string>('get_all_teams');
      const data = JSON.parse(response);
      if (data.data && Array.isArray(data.data)) {
        setTeams(data.data);
      } else if (Array.isArray(data)) {
        setTeams(data);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      setTeams([]);
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

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, product: Product) => {
    setAnchorEl(event.currentTarget);
    setSelectedProduct(product);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProduct(null);
  };

  const handleAssignProduct = () => {
    if (selectedProduct) {
      setAssignmentDialog({ open: true, product: selectedProduct });
    }
    handleMenuClose();
  };

  const handleCheckoutProduct = async () => {
    if (!selectedProduct) return;

    try {
      await invoke('checkout_product', { productId: selectedProduct.id });
      setMessage({ text: 'Product checked out successfully', severity: 'success' });
      loadProducts();
    } catch (error) {
      console.error('Failed to checkout product:', error);
      setMessage({ text: 'Failed to checkout product', severity: 'error' });
    }
    handleMenuClose();
  };

  const handleViewProduct = () => {
    if (selectedProduct) {
      navigate(`/products/${selectedProduct.id}`);
    }
    handleMenuClose();
  };

  const handleCreateReview = () => {
    if (selectedProduct) {
      navigate(`/reviews/create?productId=${selectedProduct.id}`);
    }
    handleMenuClose();
  };

  const assignProductToUser = async (userId: number) => {
    if (!assignmentDialog.product) return;

    try {
      await invoke('assign_product_to_user', {
        productId: assignmentDialog.product.id,
        userId,
        assignmentType: 'assigned'
      });
      setMessage({ text: 'Product assigned successfully', severity: 'success' });
      setAssignmentDialog({ open: false, product: null });
      loadProducts();
    } catch (error) {
      console.error('Failed to assign product:', error);
      setMessage({ text: 'Failed to assign product', severity: 'error' });
    }
  };

  const assignProductToTeam = async (teamId: number) => {
    if (!assignmentDialog.product) return;

    try {
      await invoke('assign_product_to_team', {
        teamId,
        siteId: assignmentDialog.product.site_id
      });
      setMessage({ text: 'Product assigned to team successfully', severity: 'success' });
      setAssignmentDialog({ open: false, product: null });
      loadProducts();
    } catch (error) {
      console.error('Failed to assign product to team:', error);
      setMessage({ text: 'Failed to assign product to team', severity: 'error' });
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.item_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.site_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.product_type && product.product_type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || product.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Products
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/products/create')}
        >
          Create Product
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid2 container spacing={3} sx={{ mb: 3 }}>
        <Grid2 xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Total Products
                  </Typography>
                  <Typography variant="h4">
                    {products.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <MapIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    In Progress
                  </Typography>
                  <Typography variant="h4">
                    {products.filter(p => p.status === 'In Progress').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <ScheduleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Completed
                  </Typography>
                  <Typography variant="h4">
                    {products.filter(p => p.status === 'Completed').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    My Products
                  </Typography>
                  <Typography variant="h4">
                    {products.filter(p => p.assigned_user === user?.username).length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid2 container spacing={2} alignItems="center">
          <Grid2 xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search products..."
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
          </Grid2>
          <Grid2 xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="Created">Created</MenuItem>
                <MenuItem value="Assigned">Assigned</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="In Review">In Review</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
            >
              More Filters
            </Button>
          </Grid2>
        </Grid2>
      </Paper>

      {/* Products Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assignment</TableCell>
              <TableCell>Task Order</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {product.item_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Site: {product.site_id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{product.product_type || 'Unknown'}</TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(product.status)}
                    label={product.status}
                    color={getStatusColor(product.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {product.assigned_user ? (
                    <Chip
                      icon={<PersonIcon />}
                      label={product.assigned_user}
                      variant="outlined"
                      size="small"
                    />
                  ) : product.assigned_team ? (
                    <Chip
                      icon={<GroupIcon />}
                      label={product.assigned_team}
                      variant="outlined"
                      size="small"
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {product.taskorder_name || (
                    <Typography variant="caption" color="text.secondary">
                      No Task Order
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(product.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={(e) => handleMenuClick(e, product)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredProducts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No products found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {products.length === 0 ? 'Create your first product to get started' : 'Try adjusting your filters'}
          </Typography>
        </Box>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemComponent onClick={handleViewProduct}>
          <ListItemIcon>
            <MapIcon />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItemComponent>
        <MenuItemComponent onClick={handleAssignProduct}>
          <ListItemIcon>
            <AssignIcon />
          </ListItemIcon>
          <ListItemText>Assign</ListItemText>
        </MenuItemComponent>
        <MenuItemComponent onClick={handleCheckoutProduct}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Checkout</ListItemText>
        </MenuItemComponent>
        <MenuItemComponent onClick={handleCreateReview}>
          <ListItemIcon>
            <ReviewIcon />
          </ListItemIcon>
          <ListItemText>Create Review</ListItemText>
        </MenuItemComponent>
      </Menu>

      {/* Assignment Dialog */}
      <Dialog
        open={assignmentDialog.open}
        onClose={() => setAssignmentDialog({ open: false, product: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Assign Product: {assignmentDialog.product?.item_id}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Assign to User
            </Typography>
            {users.length > 0 ? (
              users.map((user) => (
                <Button
                  key={user.id}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 1, justifyContent: 'flex-start' }}
                  onClick={() => assignProductToUser(user.id)}
                >
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name} (${user.username})`
                    : user.username
                  }
                </Button>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No users available for assignment
              </Typography>
            )}

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Assign to Team
            </Typography>
            {teams.map((team) => (
              <Button
                key={team.id}
                fullWidth
                variant="outlined"
                sx={{ mb: 1, justifyContent: 'flex-start' }}
                onClick={() => assignProductToTeam(team.id)}
              >
                {team.name}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignmentDialog({ open: false, product: null })}>
            Cancel
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

export default ProductsList;