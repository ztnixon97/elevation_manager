// src/pages/TeamDashboard/components/ProductsPanel.tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  Tooltip,
  } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridToolbarQuickFilter,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RateReviewIcon from '@mui/icons-material/RateReview';

interface ProductsPanelProps {
  teamId: number;
  isTeamLead: boolean;
}

interface Product {
  id: number;
  site_id: string;
  status: string;
  product_type_id: number;
  assigned_to?: string;
}

interface ProductType {
  id: number;
  name: string;
}

interface TeamMember {
  user_id: number;
  username: string;
  role: string;
}

const ProductsPanel: React.FC<ProductsPanelProps> = ({ teamId, isTeamLead }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Form states
  const [siteId, setSiteId] = useState('');
  const [productTypeId, setProductTypeId] = useState<number | ''>('');
  const [assigneeId, setAssigneeId] = useState<number>(0); // Initialize as a number
  const [checkedOutReason, setCheckedOutReason] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetchData();
  }, [teamId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch team products
      const productsResponse = await invoke<string>('get_team_products', { team_id: teamId });
      const productsData = JSON.parse(productsResponse);
      if (productsData.data && productsData.data.products) {
        setProducts(productsData.data.products);
      }
      
      // Fetch product types
      const typesResponse = await invoke<string>('get_all_product_types');
      const typesData = JSON.parse(typesResponse);
      if (typesData.data) {
        setProductTypes(typesData.data);
      }
      
      // Fetch team members
      const membersResponse = await invoke<string>('get_team_users', { team_id: teamId });
      const membersData = JSON.parse(membersResponse);
      if (membersData.data && membersData.data.members) {
        setTeamMembers(membersData.data.members);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch data',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Columns for the products DataGrid
  const columns: GridColDef[] = [
    { field: 'site_id', headerName: 'Site ID', flex: 1 },
    { 
      field: 'product_type', 
      headerName: 'Type', 
      flex: 1,
      valueGetter: (_, row: Product) => {
        const productType = productTypes.find(type => type.id === row.product_type_id);
        return productType ? productType.name : 'N/A';
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'completed' ? 'success' : 
            params.value === 'in_progress' ? 'warning' : 
            params.value === 'pending' ? 'info' : 
            params.value === 'rejected' ? 'error' : 
            'default'
          }
        />
      )
    },
    { 
      field: 'assigned_to', 
      headerName: 'Assigned To', 
      flex: 1,
      renderCell: (params) => {
        return params.value ? params.value : 'Unassigned';
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      renderCell: (params) => (
        <Box>
          {isTeamLead && (
            <Tooltip title="Assign Product">
              <IconButton
                size="small"
                onClick={() => handleAssignClick(params.row)}
              >
                <AssignmentIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Check Out Product">
            <IconButton
              size="small"
              onClick={() => handleCheckoutClick(params.row)}
            >
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Submit Review">
            <IconButton
              size="small"
              onClick={() => handleReviewClick(params.row)}
            >
              <RateReviewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isTeamLead && (
            <Tooltip title="Remove Product">
              <IconButton
                size="small"
                onClick={() => handleRemoveClick(params.row)}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];
  
  // Handle opening the add product dialog
  const handleAddClick = () => {
    if (!isTeamLead) return;
    setIsAddDialogOpen(true);
  };
  
  // Handle assigning a product
  const handleAssignClick = (product: Product) => {
    if (!isTeamLead) return;
    setSelectedProduct(product);

    // Set the first team member as the default assignee
    if (teamMembers.length > 0) {
      setAssigneeId(teamMembers[0].user_id);
    } else {
      setAssigneeId(0); // Fallback to 0 if no team members
    }

    setIsAssignDialogOpen(true);
  };

  // Handle checkout workflow
  const handleCheckoutClick = (product: Product) => {
    setSelectedProduct(product);
    setCheckedOutReason('');
    setIsCheckoutDialogOpen(true);
  };
  
  // Handle review workflow
  const handleReviewClick = (product: Product) => {
    setSelectedProduct(product);
    setReviewComment('');
    setIsReviewDialogOpen(true);
  };
  
  // Handle removing a product from team
  const handleRemoveClick = (product: Product) => {
    if (!isTeamLead || !window.confirm(`Are you sure you want to remove ${product.site_id}?`)) return;
    
    setLoading(true);
    invoke('remove_product_from_team', { team_id: teamId, product_id: product.id })
      .then(() => {
        setProducts(products.filter(p => p.id !== product.id));
        setMessage({
          text: 'Product removed successfully',
          severity: 'success',
        });
      })
      .catch(err => {
        console.error('Failed to remove product:', err);
        setMessage({
          text: typeof err === 'string' ? err : 'Failed to remove product',
          severity: 'error',
        });
      })
      .finally(() => setLoading(false));
  };
  
  // Add product to team
  const handleAddProduct = async () => {
    if (!siteId || productTypeId === '') return;
    
    setLoading(true);
    try {
      // First add the product type if needed
      await invoke('assign_product_type_to_team', {
        team_id: teamId,
        product_type_id: productTypeId,
      });
      
      // Then add the product
      await invoke('assign_product_to_team', {
        team_id: teamId,
        site_id: siteId,
      });
      
      // Refresh products
      fetchData();
      
      setMessage({
        text: 'Product added successfully',
        severity: 'success',
      });
      setIsAddDialogOpen(false);
      setSiteId('');
      setProductTypeId('');
    } catch (err) {
      console.error('Failed to add product:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to add product',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Assign product to team member
   // In handleAssignProduct function - update to pass the team_id
  const handleAssignProduct = async () => {
    if (!selectedProduct || assigneeId === 0) return;
  
    setLoading(true);
    try {
      // Verify the selected user exists in team members
      const selectedMember = teamMembers.find(m => m.user_id === assigneeId);
    
      if (!selectedMember) {
        setMessage({
          text: 'Invalid team member selected',
          severity: 'error',
        });
        return;
      }

      // Call the updated Tauri command with team_id parameter
      await invoke('assign_product_to_user', {
        product_id: selectedProduct.id,
        user_id: assigneeId,
        team_id: teamId,
        assignment_type: "assigned"
      });
    
      // Update local state to reflect assignment
      const assigneeName = selectedMember.username;
      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, assigned_to: assigneeName } 
          : p
      ));
    
      setMessage({
        text: 'Product assigned successfully',
        severity: 'success',
      });
      setIsAssignDialogOpen(false);
    } catch (err) {
      console.error('Failed to assign product:', err);
      setMessage({
        text: typeof err === 'string' 
          ? err 
          : 'Failed to assign product to user',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // In handleCheckoutProduct function - update to use the correct endpoint
  const handleCheckoutProduct = async () => {
    if (!selectedProduct || !checkedOutReason) return;
  
    setLoading(true);
    try {
      // Call the fixed checkout_product command with team_id
      await invoke('checkout_product', {
        product_id: selectedProduct.id,
        team_id: teamId,
        reason: checkedOutReason
      });
    
      // Update local state
      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, status: 'in_progress' } 
          : p
      ));
    
      setMessage({
        text: 'Product checked out successfully',
        severity: 'success',
      });
      setIsCheckoutDialogOpen(false);
    } catch (err) {
      console.error('Failed to check out product:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to check out product',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }; 
  // Submit review
  const handleSubmitReview = async () => {
    if (!selectedProduct || !reviewComment) return;
    
    setLoading(true);
    try {
      // This would be your actual implementation
      await invoke('submit_product_review', {
        product_id: selectedProduct.id,
        comment: reviewComment
      });
      
      // Update local state to show product as in review
      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, status: 'in_review' } 
          : p
      ));
      
      setMessage({
        text: 'Review submitted successfully',
        severity: 'success',
      });
      setIsReviewDialogOpen(false);
    } catch (err) {
      console.error('Failed to submit review:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to submit review',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const CustomToolbar = () => (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Team Products</Typography>
        {isTeamLead && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            disabled={loading}
          >
            Add Product
          </Button>
        )}
      </Box>
  
      <Box sx={{ flexGrow: 1, width: '100%', height: 400 }}>
        <DataGrid
          rows={products}
          columns={columns}
          loading={loading}
          pageSizeOptions={[5, 10, 25]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          disableRowSelectionOnClick
          autoHeight
          sx={{ width: '100%', height: '100%' }}
          slots={{ toolbar: CustomToolbar }}
        />
      </Box>
  
      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Product to Team</DialogTitle>
        <DialogContent>
          <TextField
            label="Site ID"
            fullWidth
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            margin="normal"
          />
  
          <FormControl fullWidth margin="normal">
            <InputLabel>Product Type</InputLabel>
            <Select
              value={productTypeId}
              onChange={(e) => setProductTypeId(e.target.value as number)}
              label="Product Type"
            >
              {productTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddProduct}
            variant="contained"
            color="primary"
            disabled={!siteId || productTypeId === '' || loading}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
  
      {/* Assign Product Dialog */}
      <Dialog open={isAssignDialogOpen} onClose={() => setIsAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Product</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Product: {selectedProduct?.site_id}
          </Typography>
  
          <FormControl fullWidth margin="normal">
            <InputLabel>Assignee</InputLabel>
            <Select
              value={assigneeId || 0}
              onChange={(e) => {
                setAssigneeId(Number(e.target.value));
              }}
              label="Assignee"
            >
              {teamMembers.map((member) => (
                <MenuItem key={member.user_id} value={member.user_id}>
                  {member.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAssignProduct}
            variant="contained"
            color="primary"
            disabled={assigneeId === 0 || loading}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
  
      {/* Checkout Product Dialog */}
      <Dialog open={isCheckoutDialogOpen} onClose={() => setIsCheckoutDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Check Out Product</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Product: {selectedProduct?.site_id}
          </Typography>
  
          <TextField
            label="Reason for checkout"
            fullWidth
            multiline
            rows={4}
            value={checkedOutReason}
            onChange={(e) => setCheckedOutReason(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCheckoutDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCheckoutProduct}
            variant="contained"
            color="primary"
            disabled={!checkedOutReason || loading}
          >
            Check Out
          </Button>
        </DialogActions>
      </Dialog>
  
      {/* Submit Review Dialog */}
      <Dialog open={isReviewDialogOpen} onClose={() => setIsReviewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Review</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Product: {selectedProduct?.site_id}
          </Typography>
  
          <TextField
            label="Review Comments"
            fullWidth
            multiline
            rows={6}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color="primary"
            disabled={!reviewComment || loading}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
  
      {/* Success/Error Messages */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setMessage(null)} severity={message?.severity} variant="filled">
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};
  
export default ProductsPanel;
