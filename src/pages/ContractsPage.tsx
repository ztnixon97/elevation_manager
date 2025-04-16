import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Snackbar
} from '@mui/material';

// Import Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MoneyIcon from '@mui/icons-material/Money';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

import { format, parseISO } from 'date-fns';

interface ContractDetails {
  id: number;
  number: string;
  name: string;
  awarding_agency: string;
  start_date: string;
  end_date: string;
  award_date: string;
  current_obligation: number;
  current_spend: number;
  base_value: number;
  spend_ceiling: number;
  prime_contractor: string;
  status: string;
  classification: string;
  created_at: string;
  updated_at: string;
  invoice_count: number;
  modification_count: number;
}

interface TaskOrderSummary {
  id: number;
  contract_id: number;
  name: string;
  producer?: string;
  period_of_performance?: string;
  price?: string;
  status: string;
  product_count?: number;
}

const ContractsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractDetails[]>([]);
  const [taskOrders, setTaskOrders] = useState<{ [key: number]: TaskOrderSummary[] }>({});
  const [taskOrderLoadErrors, setTaskOrderLoadErrors] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContract, setExpandedContract] = useState<number | null>(null);

  const fetchTaskOrdersForContract = async (contractId: number) => {
    try {
      const taskOrderResponse = await invoke<string | object>('get_contract_task_orders', {
        contract_id: contractId,
      });
      
      const taskOrderData = typeof taskOrderResponse === 'string' 
        ? JSON.parse(taskOrderResponse) 
        : taskOrderResponse;
          
      if (taskOrderData.success && taskOrderData.data) {
        setTaskOrders(prev => ({
          ...prev,
          [contractId]: taskOrderData.data
        }));
        
        // Clear any previous error for this contract
        setTaskOrderLoadErrors(prev => ({
          ...prev,
          [contractId]: false
        }));
        
        return true;
      } else {
        throw new Error(taskOrderData.message || `Failed to load task orders for contract ${contractId}`);
      }
    } catch (err) {
      console.error(`Error fetching task orders for contract ${contractId}:`, err);
      
      // Mark this contract as having task order load errors
      setTaskOrderLoadErrors(prev => ({
        ...prev,
        [contractId]: true
      }));
      
      // Ensure this contract has an empty array of task orders
      setTaskOrders(prev => ({
        ...prev,
        [contractId]: []
      }));
      
      return false;
    }
  };

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await invoke<string | object>('get_contracts');
      const data = typeof response === 'string' ? JSON.parse(response) : response;

      if (data.success && data.data) {
        console.log("Contracts Data:", data.data);
        setContracts(data.data);
        
        // Initialize task orders and load statuses
        const taskOrdersMap: { [key: number]: TaskOrderSummary[] } = {};
        const loadErrorsMap: { [key: number]: boolean } = {};
        
        // Default all contracts to empty arrays of task orders
        data.data.forEach((contract: ContractDetails) => {
          taskOrdersMap[contract.id] = [];
          loadErrorsMap[contract.id] = false;
        });
        
        setTaskOrders(taskOrdersMap);
        setTaskOrderLoadErrors(loadErrorsMap);
        
        // Fetch task orders for each contract
        for (const contract of data.data) {
          try {
            await fetchTaskOrdersForContract(contract.id);
          } catch (err) {
            // Continue with other contracts even if one fails
            console.error(`Error fetching task orders for contract ${contract.id}:`, err);
          }
        }
      } else {
        throw new Error(data.message || 'Failed to load contracts');
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(typeof err === 'string' ? err : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleRetryTaskOrders = async (contractId: number) => {
    setMessage({ text: 'Retrying task order fetch...', severity: 'info' });
    const success = await fetchTaskOrdersForContract(contractId);
    
    if (success) {
      setMessage({ text: 'Task orders loaded successfully', severity: 'success' });
    } else {
      setMessage({ text: 'Failed to load task orders', severity: 'error' });
    }
  };

  const handleContractClick = (contractId: number) => {
    if (expandedContract === contractId) {
      setExpandedContract(null);
    } else {
      setExpandedContract(contractId);
    }
  };

  const handleViewTaskOrder = (taskOrderId: number) => {
    navigate(`/task-orders/${taskOrderId}`);
  };

  const handleCreateContract = () => {
    navigate('/contracts/create');
  };

  const handleCreateTaskOrder = (contractId: number) => {
    navigate(`/task-orders/create?contractId=${contractId}`);
  };

  const handleViewContract = (contractId: number) => {
    navigate(`/contracts/${contractId}`);
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '$0.00';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const filteredContracts = contracts.filter(contract => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (contract.number?.toLowerCase() || '').includes(searchLower) ||
      (contract.name?.toLowerCase() || '').includes(searchLower) ||
      (contract.awarding_agency?.toLowerCase() || '').includes(searchLower) ||
      (contract.status?.toLowerCase() || '').includes(searchLower) ||
      (contract.prime_contractor?.toLowerCase() || '').includes(searchLower)
    );
  });

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => fetchContracts()}
          startIcon={<RefreshIcon />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Contracts
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleCreateContract}
        >
          New Contract
        </Button>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            placeholder="Search contracts..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: '50%' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Box>
            <Button startIcon={<FilterListIcon />}>
              Filter
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Grid container spacing={3}>
        {/* Contract Stats Summary */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <CardContent>
                  <Typography variant="h4">{contracts.length}</Typography>
                  <Typography variant="body2">Total Contracts</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                <CardContent>
                  <Typography variant="h4">
                    {contracts.filter(c => c.status?.toLowerCase() === 'active').length}
                  </Typography>
                  <Typography variant="body2">Active Contracts</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <CardContent>
                  <Typography variant="h4">
                    {contracts.filter(c => c.status?.toLowerCase() === 'pending').length}
                  </Typography>
                  <Typography variant="body2">Pending Contracts</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                <CardContent>
                  <Typography variant="h4">
                    {contracts.filter(c => ['expired', 'completed'].includes(c.status?.toLowerCase() || '')).length}
                  </Typography>
                  <Typography variant="body2">Expired/Completed</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        
        {/* Contract Cards */}
        {filteredContracts.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No contracts found
              </Typography>
            </Paper>
          </Grid>
        ) : (
          filteredContracts.map(contract => (
            <Grid item xs={12} key={contract.id}>
              <Paper sx={{ overflow: 'hidden' }}>
                <Accordion 
                  expanded={expandedContract === contract.id}
                  onChange={() => handleContractClick(contract.id)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <BusinessIcon />
                        </Avatar>
                      </Grid>
                      <Grid item xs>
                        <Typography variant="h6">
                          {contract.name || 'Untitled Contract'}
                          <Chip
                            size="small"
                            label={contract.status || 'Unknown'}
                            color={getStatusColor(contract.status) as "success" | "error" | "warning" | "info" | "default"}
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {contract.number || 'No ID'} • {contract.awarding_agency || 'No Agency'}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(contract.current_obligation)}
                        </Typography>
                        <Typography variant="caption" align="right" display="block">
                          {contract.start_date ? format(parseISO(contract.start_date), 'MMM yyyy') : 'No start'} - {' '}
                          {contract.end_date ? format(parseISO(contract.end_date), 'MMM yyyy') : 'No end'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Contract Details
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <AccountBalanceIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Awarding Agency</Typography>
                              <Typography variant="body1">{contract.awarding_agency || 'Not specified'}</Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <MoneyIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Financial Details</Typography>
                              <Typography variant="body1">
                                Base: {formatCurrency(contract.base_value)} | 
                                Ceiling: {formatCurrency(contract.spend_ceiling)} | 
                                Current: {formatCurrency(contract.current_spend)}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Prime Contractor</Typography>
                              <Typography variant="body1">{contract.prime_contractor || 'Not specified'}</Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <AssignmentIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Classification</Typography>
                              <Typography variant="body1">{contract.classification || 'Unclassified'}</Typography>
                            </Box>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Period of Performance</Typography>
                              <Typography variant="body1">
                                {contract.start_date ? format(parseISO(contract.start_date), 'MMM d, yyyy') : 'Not specified'} - {' '}
                                {contract.end_date ? format(parseISO(contract.end_date), 'MMM d, yyyy') : 'Not specified'}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Award Date</Typography>
                              <Typography variant="body1">
                                {contract.award_date ? format(parseISO(contract.award_date), 'MMM d, yyyy') : 'Unknown'}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <ReceiptIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Invoice & Modifications</Typography>
                              <Typography variant="body1">
                                Invoices: {contract.invoice_count || 0} | 
                                Modifications: {contract.modification_count || 0}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Created</Typography>
                              <Typography variant="body1">
                                {contract.created_at ? format(parseISO(contract.created_at), 'MMM d, yyyy') : 'Unknown'}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">
                          Task Orders ({taskOrders[contract.id]?.length || 0})
                        </Typography>
                        <Box>
                          {taskOrderLoadErrors[contract.id] && (
                            <Button 
                              size="small" 
                              color="warning"
                              sx={{ mr: 1 }}
                              startIcon={<RefreshIcon />}
                              onClick={() => handleRetryTaskOrders(contract.id)}
                            >
                              Retry Loading
                            </Button>
                          )}
                          <Button 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleCreateTaskOrder(contract.id)}
                          >
                            Add Task Order
                          </Button>
                        </Box>
                      </Box>
                      
                      {taskOrderLoadErrors[contract.id] ? (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          Failed to load task orders for this contract. 
                        </Alert>
                      ) : (
                        (!taskOrders[contract.id] || taskOrders[contract.id].length === 0) ? (
                          <Typography color="text.secondary">
                            No task orders found for this contract.
                          </Typography>
                        ) : (
                          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                            {taskOrders[contract.id].map((taskOrder) => (
                              <ListItem
                                key={taskOrder.id}
                                alignItems="flex-start"
                                sx={{ 
                                  borderBottom: '1px solid #eee',
                                  '&:last-child': { borderBottom: 'none' }
                                }}
                                secondaryAction={
                                  <IconButton edge="end" onClick={() => handleViewTaskOrder(taskOrder.id)}>
                                    <MoreVertIcon />
                                  </IconButton>
                                }
                              >
                                <ListItemAvatar>
                                  <Avatar>
                                    <AssignmentIcon />
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      {taskOrder.name || 'Unnamed Task Order'}
                                      <Chip 
                                        size="small" 
                                        label={taskOrder.status || 'Unknown'}
                                        color={getStatusColor(taskOrder.status) as "success" | "error" | "warning" | "info" | "default"}
                                        sx={{ ml: 1 }}
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <React.Fragment>
                                      <Typography
                                        component="span"
                                        variant="body2"
                                        color="text.primary"
                                      >
                                        {taskOrder.price ? formatCurrency(parseFloat(taskOrder.price)) : '$0.00'} • {taskOrder.producer || 'Unassigned'}
                                      </Typography>
                                      <Typography component="div" variant="body2">
                                        {taskOrder.period_of_performance || 'No period specified'} • {taskOrder.product_count || 0} products
                                      </Typography>
                                    </React.Fragment>
                                  }
                                />
                                <Button 
                                  size="small" 
                                  sx={{ ml: 2, alignSelf: 'center' }}
                                  onClick={() => handleViewTaskOrder(taskOrder.id)}
                                >
                                  View
                                </Button>
                              </ListItem>
                            ))}
                          </List>
                        )
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        color="primary"
                        onClick={() => handleViewContract(contract.id)}
                      >
                        View Contract Details
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Paper>
            </Grid>
          ))
        )}
      </Grid>

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

export default ContractsPage;
