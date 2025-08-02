import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  Grid,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton
} from '@mui/material';

// Import Icons
import BusinessIcon from '@mui/icons-material/Business';
import MoneyIcon from '@mui/icons-material/Money';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';

import { format, parseISO } from 'date-fns';

// Updated interface to match the actual contract data
interface ContractDetails {
  id: number;
  number: string;
  name: string;
  awarding_agency: string;
  award_date: string;
  start_date: string;
  end_date: string;
  modification_date: string | null;
  modification_count: number;
  latest_modification_number: string | null;
  latest_modification_reason: string | null;
  current_obligation: number;
  current_spend: number;
  spend_ceiling: number;
  base_value: number;
  funding_source: string | null;
  status: string;
  pop_start_date: string | null;
  pop_end_date: string | null;
  option_years: number | null;
  reporting_frequency: string | null;
  last_report_date: string | null;
  prime_contractor: string;
  contract_type: string | null;
  invoice_count: number;
  classification: string;
  created_at: string;
  updated_at: string;
}

interface TaskOrderSummary {
  id: number;
  contract_id: number;
  name: string;
  producer: string;
  period_of_performance: string;
  price: string;
  status: string;
  product_count: number;
}

// Valid status color types for MUI Chip
type StatusColor = "success" | "error" | "warning" | "info" | "default";

const ContractDetailsPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [taskOrders, setTaskOrders] = useState<TaskOrderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Fetch contract details and associated task orders
  useEffect(() => {
    const fetchContractDetails = async () => {
      if (!contractId) {
        setError('Contract ID is required');
        setLoading(false);
        return;
      }
      
      // Validate that contractId is a valid number
      const contractIdNum = parseInt(contractId, 10);
      if (isNaN(contractIdNum)) {
        setError('Invalid contract ID format');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch contract details
        const response = await invoke<string | object>('get_contract_details', {
          contract_id: contractIdNum,
        });
        
        const contractData = typeof response === 'string' ? JSON.parse(response) : response;
        
        if (contractData.success && contractData.data) {
          console.log("Contract Data:", contractData.data);
          setContract(contractData.data);
          
          // After getting contract, fetch its task orders
          await fetchTaskOrders(contractIdNum);
        } else {
          throw new Error(contractData.message || 'Failed to load contract details');
        }
      } catch (err) {
        console.error('Error fetching contract details:', err);
        setError(typeof err === 'string' ? err : 'Failed to load contract details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContractDetails();
  }, [contractId]);

  // Separate function to fetch task orders for better organization
  const fetchTaskOrders = async (contractId: number): Promise<void> => {
    try {
      const taskOrderResponse = await invoke<string | object>('get_contract_task_orders', {
        contract_id: contractId,
      });
      
      const taskOrderData = typeof taskOrderResponse === 'string' 
        ? JSON.parse(taskOrderResponse) 
        : taskOrderResponse;
        
      if (taskOrderData.success && taskOrderData.data) {
        setTaskOrders(taskOrderData.data);
      }
    } catch (err) {
      console.error('Error fetching task orders:', err);
      // Just log error for task orders without breaking the whole page
    }
  };

  // Event handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  const handleEditContract = (): void => {
    navigate(`/contracts/edit/${contractId}`);
  };

  const handleCreateTaskOrder = (): void => {
    navigate(`/task-orders/create?contractId=${contractId}`);
  };

  const handleViewTaskOrder = (taskOrderId: number): void => {
    navigate(`/task-orders/${taskOrderId}`);
  };

  // Utility functions
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const getStatusColor = (status: string): StatusColor => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      case 'expired':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Calculate financial summary data
  const calculateFinancialSummary = () => {
    if (!contract) return null;
    
    const totalAllocated = taskOrders.reduce(
      (sum, order) => sum + parseFloat(order.price || '0'), 
      0
    );
    
    const remaining = contract.base_value - totalAllocated;
    
    return {
      totalAllocated,
      currentObligation: contract.current_obligation,
      currentSpend: contract.current_spend,
      baseCost: contract.base_value,
      ceiling: contract.spend_ceiling,
      remaining,
      isOverBudget: remaining < 0
    };
  };
  
  const financialSummary = calculateFinancialSummary();

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !contract) {
    return (
      <Box p={4}>
        <Alert severity="error">{error || 'Contract not found'}</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/contracts')}>
          Back to Contracts
        </Button>
      </Box>
    );
  }

  // Render main UI
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Header with contract title and edit button */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Contract: {contract.name}
          <Chip
            label={contract.status}
            color={getStatusColor(contract.status)}
            sx={{ ml: 2 }}
          />
        </Typography>
        <Button variant="outlined" onClick={handleEditContract} startIcon={<EditIcon />}>
          Edit Contract
        </Button>
      </Box>

      {/* Contract Info Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Contract Information */}
          <Grid xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Contract Information</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Contract Number</Typography>
              <Typography variant="body1">{contract.number}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Awarding Agency</Typography>
              <Typography variant="body1">{contract.awarding_agency}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Prime Contractor</Typography>
              <Typography variant="body1">{contract.prime_contractor || 'Not specified'}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Classification</Typography>
              <Typography variant="body1">{contract.classification}</Typography>
            </Box>
          </Grid>
          
          {/* Timeline Information */}
          <Grid xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarTodayIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Timeline</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Award Date</Typography>
              <Typography variant="body1">
                {contract.award_date ? format(parseISO(contract.award_date), 'MMMM d, yyyy') : 'Not specified'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Start Date</Typography>
              <Typography variant="body1">
                {format(parseISO(contract.start_date), 'MMMM d, yyyy')}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">End Date</Typography>
              <Typography variant="body1">
                {format(parseISO(contract.end_date), 'MMMM d, yyyy')}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Contract Duration</Typography>
              <Typography variant="body1">
                {Math.round(
                  (new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / 
                  (1000 * 60 * 60 * 24 * 30.44)
                )} months
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Last Modified</Typography>
              <Typography variant="body1">
                {contract.modification_date 
                  ? format(parseISO(contract.modification_date), 'MMMM d, yyyy') 
                  : 'Never modified'}
                {contract.modification_count > 0 && ` (${contract.modification_count} modifications)`}
              </Typography>
            </Box>
          </Grid>
          
          {/* Financial Information */}
          <Grid xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Financial</Typography>
            </Box>
            
            {financialSummary && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Base Value</Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary.main">
                    {formatCurrency(financialSummary.baseCost)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Ceiling</Typography>
                  <Typography variant="body1">
                    {formatCurrency(financialSummary.ceiling)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Current Obligation</Typography>
                  <Typography variant="body1">
                    {formatCurrency(financialSummary.currentObligation)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Current Spend</Typography>
                  <Typography variant="body1">
                    {formatCurrency(financialSummary.currentSpend)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Task Orders</Typography>
                  <Typography variant="body1">{taskOrders.length}</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Allocated in Task Orders</Typography>
                  <Typography variant="body1">
                    {formatCurrency(financialSummary.totalAllocated)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Remaining Budget</Typography>
                  <Typography variant="body1" color={
                    financialSummary.isOverBudget ? 'error.main' : 'success.main'
                  }>
                    {formatCurrency(financialSummary.remaining)}
                  </Typography>
                </Box>
              </>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs Section */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Task Orders" icon={<AssignmentIcon />} iconPosition="start" />
            <Tab label="Documents" icon={<DescriptionIcon />} iconPosition="start" />
            <Tab label="Invoces" icon={<AccountBalanceIcon />} iconPosition='start' />
            <Tab label="Details" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
          {/* Task Orders Tab */}
          {activeTab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Task Orders</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={handleCreateTaskOrder}
                >
                  Create Task Order
                </Button>
              </Box>
              
              {taskOrders.length === 0 ? (
                <Typography color="text.secondary">
                  No task orders found for this contract.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {taskOrders.map((taskOrder) => (
                    <Grid xs={12} md={6} lg={4} key={taskOrder.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6">{taskOrder.name}</Typography>
                            <Chip 
                              size="small" 
                              label={taskOrder.status}
                              color={getStatusColor(taskOrder.status)}
                            />
                          </Box>
                          
                          <Divider sx={{ my: 1 }} />
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <MoneyIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">
                              {formatCurrency(parseFloat(taskOrder.price || '0'))}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <BusinessIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">
                              {taskOrder.producer || 'Unassigned'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">
                              {taskOrder.period_of_performance || 'No period specified'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                            <Chip 
                              size="small" 
                              label={`${taskOrder.product_count || 0} Products`}
                              variant="outlined"
                            />
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleViewTaskOrder(taskOrder.id)}
                              startIcon={<VisibilityIcon />}
                            >
                              View Details
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {/* Documents Tab */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Contract Documents</Typography>
                <Button variant="outlined" startIcon={<AddIcon />}>
                  Upload Document
                </Button>
              </Box>
              
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                No documents available for this contract.
              </Typography>
              
              {/* Placeholder for future document list */}
              <List>
                {/* Example document entry */}
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <PictureAsPdfIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Contract Agreement"
                    secondary="Uploaded on April 1, 2025"
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="view">
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete">
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Box>
          )}
          {/* Invoice Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Placeholder
              </Typography>
            </Box>
          )}

          {/* Details Tab */}
          {activeTab === 3  && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Raw Contract Data
              </Typography>
              <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
                {JSON.stringify(contract, null, 2)}
              </pre>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ContractDetailsPage;
