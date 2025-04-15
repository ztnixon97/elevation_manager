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

import { format, parseISO } from 'date-fns';

interface ContractDetails {
  id: number;
  contract_number: string;
  title: string;
  client: string;
  start_date: string;
  end_date: string;
  value: string;
  status: string;
  producer: string;
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

const ContractDetailsPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [taskOrders, setTaskOrders] = useState<TaskOrderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchContractDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch contract details
        const response = await invoke<string | object>('get_contract_details', {
          contract_id: parseInt(contractId!, 10),
        });
        
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        
        if (data.success && data.data) {
          console.log("Contract Data:", data.data);
          setContract(data.data);
        } else {
          throw new Error(data.message || 'Failed to load contract details');
        }
        
        // Fetch task orders for this contract
        const taskOrderResponse = await invoke<string | object>('get_contract_task_orders', {
          contract_id: parseInt(contractId!, 10),
        });
        
        const taskOrderData = typeof taskOrderResponse === 'string' 
          ? JSON.parse(taskOrderResponse) 
          : taskOrderResponse;
          
        if (taskOrderData.success && taskOrderData.data) {
          setTaskOrders(taskOrderData.data);
        }
      } catch (err) {
        console.error('Error fetching contract details:', err);
        setError(typeof err === 'string' ? err : 'Failed to load contract details');
      } finally {
        setLoading(false);
      }
    };
    
    if (contractId) {
      fetchContractDetails();
    }
  }, [contractId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEditContract = () => {
    navigate(`/contracts/edit/${contractId}`);
  };

  const handleCreateTaskOrder = () => {
    navigate(`/task-orders/create?contractId=${contractId}`);
  };

  const handleViewTaskOrder = (taskOrderId: number) => {
    navigate(`/task-orders/${taskOrderId}`);
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return numValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const getStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

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

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Contract: {contract.title}
          <Chip
            label={contract.status}
            color={getStatusColor(contract.status) as "success" | "error" | "warning" | "info" | "default"}
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
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Contract Information</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Contract Number</Typography>
              <Typography variant="body1">{contract.contract_number}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Client</Typography>
              <Typography variant="body1">{contract.client}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Producer</Typography>
              <Typography variant="body1">{contract.producer || 'Not specified'}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Classification</Typography>
              <Typography variant="body1">{contract.classification}</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarTodayIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Timeline</Typography>
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
              <Typography variant="subtitle2" color="text.secondary">Created</Typography>
              <Typography variant="body1">
                {format(parseISO(contract.created_at), 'MMMM d, yyyy')}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Financial</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Contract Value</Typography>
              <Typography variant="body1" fontWeight="bold" color="primary.main">
                {formatCurrency(contract.value)}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Task Orders</Typography>
              <Typography variant="body1">{taskOrders.length}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Allocated in Task Orders</Typography>
              <Typography variant="body1">
                {formatCurrency(
                  taskOrders.reduce((sum, order) => sum + parseFloat(order.price || '0'), 0).toString()
                )}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Remaining Budget</Typography>
              <Typography variant="body1" color={
                parseFloat(contract.value) - taskOrders.reduce((sum, order) => sum + parseFloat(order.price || '0'), 0) >= 0
                  ? 'success.main'
                  : 'error.main'
              }>
                {formatCurrency(
                  (parseFloat(contract.value) - taskOrders.reduce((sum, order) => sum + parseFloat(order.price || '0'), 0)).toString()
                )}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Task Orders & Documents Tabs */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Task Orders" icon={<AssignmentIcon />} iconPosition="start" />
            <Tab label="Documents" icon={<DescriptionIcon />} iconPosition="start" />
            <Tab label="Details" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
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
                    <Grid item xs={12} md={6} lg={4} key={taskOrder.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6">{taskOrder.name}</Typography>
                            <Chip 
                              size="small" 
                              label={taskOrder.status}
                              color={getStatusColor(taskOrder.status) as "success" | "error" | "warning" | "info" | "default"}
                            />
                          </Box>
                          
                          <Divider sx={{ my: 1 }} />
                          
                          <Box sx={{ display: 'flex', mb: 1 }}>
                            <MoneyIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">
                              {formatCurrency(taskOrder.price || '0')}
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

          {activeTab === 2 && (
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