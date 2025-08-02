import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridToolbarQuickFilter,
  GridToolbarContainer,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Money as MoneyIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

// Types
interface TaskOrder {
  id: number;
  contract_id: number | null;
  name: string;
  task_order_type: string; // "Contract" or "Internal"
  producer: string | null;
  cor: string | null;
  pop: string | null; // Period of Performance
  price: number | null;
  status: string;
  created_at: string;
}

interface Contract {
  id: number;
  name: string;
  contract_number: string;
}

const TaskOrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [taskOrders, setTaskOrders] = useState<TaskOrder[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all task orders
      const taskOrdersResponse = await invoke<string>('get_all_taskorders');
      const taskOrdersData = JSON.parse(taskOrdersResponse);
      
      if (taskOrdersData.success) {
        setTaskOrders(taskOrdersData.data || []);
      } else {
        throw new Error(taskOrdersData.message || 'Failed to fetch task orders');
      }

      // Fetch contracts for reference
      try {
        const contractsResponse = await invoke<string>('get_all_contracts');
        const contractsData = JSON.parse(contractsResponse);
        if (contractsData.success) {
          setContracts(contractsData.data || []);
        }
      } catch (err) {
        console.warn('Failed to fetch contracts:', err);
        // Don't fail the whole page if contracts fail to load
      }

    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(typeof err === 'string' ? err : 'Failed to load task orders');
    } finally {
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'info';
      case 'expired': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  // Get type color
  const getTypeColor = (type: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (type.toLowerCase()) {
      case 'contract': return 'primary';
      case 'internal': return 'secondary';
      default: return 'default';
    }
  };

  // Format currency
  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return '$0.00';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  // Format date range
  const formatDateRange = (pop: string | null): string => {
    if (!pop) return 'Not specified';
    try {
      // Handle PostgreSQL daterange format: [2024-01-01,2024-12-31)
      const cleanRange = pop.replace(/[\[\]()]/g, '');
      const dates = cleanRange.split(',');
      if (dates.length === 2) {
        const startDate = format(parseISO(dates[0]), 'MMM d, yyyy');
        const endDate = format(parseISO(dates[1]), 'MMM d, yyyy');
        return `${startDate} - ${endDate}`;
      }
      return pop;
    } catch {
      return pop;
    }
  };

  // Get contract name
  const getContractName = (contractId: number | null): string => {
    if (!contractId) return 'Independent';
    const contract = contracts.find(c => c.id === contractId);
    return contract ? contract.name : `Contract #${contractId}`;
  };

  // Filter task orders based on current filters
  const filteredTaskOrders = taskOrders.filter(taskOrder => {
    const statusMatch = statusFilter === 'all' || taskOrder.status.toLowerCase() === statusFilter.toLowerCase();
    const typeMatch = typeFilter === 'all' || taskOrder.task_order_type.toLowerCase() === typeFilter.toLowerCase();
    return statusMatch && typeMatch;
  });

  const handleViewTaskOrder = (taskOrderId: number) => {
    navigate(`/task-orders/${taskOrderId}`);
  };

  const handleCreateTaskOrder = () => {
    navigate('/task-orders/create');
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;

    try {
      // TODO: Implement bulk delete functionality
      setMessage({
        text: `Delete functionality for ${selectedRows.length} task order(s) will be implemented`,
        severity: 'success'
      });
      setSelectedRows([]);
    } catch (err) {
      setMessage({
        text: 'Failed to delete task orders',
        severity: 'error'
      });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Task Order Name',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Chip
            label={params.row.task_order_type}
            size="small"
            color={getTypeColor(params.row.task_order_type)}
          />
        </Box>
      ),
    },
    {
      field: 'contract_id',
      headerName: 'Contract',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2">
          {getContractName(params.value)}
        </Typography>
      ),
    },
    {
      field: 'producer',
      headerName: 'Producer',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || 'Not assigned'}
        </Typography>
      ),
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={getStatusColor(params.value)}
        />
      ),
    },
    {
      field: 'pop',
      headerName: 'Period of Performance',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2">
          {formatDateRange(params.value)}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {format(parseISO(params.value), 'MMM d, yyyy')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => handleViewTaskOrder(params.row.id)}
              color="primary"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <GridToolbarQuickFilter />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="contract">Contract</MenuItem>
            <MenuItem value="internal">Internal</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {selectedRows.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleDeleteSelected}
            startIcon={<DeleteIcon />}
          >
            Delete Selected ({selectedRows.length})
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateTaskOrder}
          startIcon={<AddIcon />}
        >
          Create Task Order
        </Button>
      </Box>
    </GridToolbarContainer>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button 
          variant="outlined" 
          size="small" 
          onClick={fetchData}
          sx={{ ml: 2 }}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Task Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all task orders including contract-associated and independent task orders
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Task Orders
              </Typography>
              <Typography variant="h4" component="div">
                {taskOrders.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {taskOrders.filter(t => t.status.toLowerCase() === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Contract-Associated
              </Typography>
              <Typography variant="h4" component="div" color="primary.main">
                {taskOrders.filter(t => t.task_order_type.toLowerCase() === 'contract').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Independent
              </Typography>
              <Typography variant="h4" component="div" color="secondary.main">
                {taskOrders.filter(t => t.task_order_type.toLowerCase() === 'internal').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Data Grid */}
      <Paper elevation={1}>
        <DataGrid
          rows={filteredTaskOrders}
          columns={columns}
          getRowId={(row) => row.id}
          checkboxSelection
          onRowSelectionModelChange={setSelectedRows}
          rowSelectionModel={selectedRows}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          autoHeight
          slots={{ toolbar: CustomToolbar }}
          sx={{
            '& .MuiDataGrid-row:hover': {
              cursor: 'pointer',
              backgroundColor: 'action.hover',
            },
          }}
          onRowClick={(params) => handleViewTaskOrder(params.row.id)}
        />
      </Paper>

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

export default TaskOrdersListPage; 