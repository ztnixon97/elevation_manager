import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Snackbar,
  Divider
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';

interface TaskOrderFormData {
  name: string;
  status: string;
  producer: string;
  cor: string;
  pop: string;
  price: number;
  task_order_type: string;
}

const TaskOrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  
  // Get contractId from URL params if creating for a specific contract
  const contractId = searchParams.get('contractId');
  const taskType = searchParams.get('type') || 'Contract';
  
  const [formData, setFormData] = useState<TaskOrderFormData>({
    name: '',
    status: 'Pending',
    producer: '',
    cor: '',
    pop: '',
    price: 0,
    task_order_type: taskType,
  });

  const handleInputChange = (field: keyof TaskOrderFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setMessage({ text: 'Task order name is required', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await invoke<string>('create_task_order', {
        contract_id: contractId ? parseInt(contractId, 10) : null,
        name: formData.name.trim(),
        status: formData.status,
        producer: formData.producer.trim() || null,
        cor: formData.cor.trim() || null,
        pop: formData.pop.trim() || null,
        price: formData.price || null,
        task_order_type: formData.task_order_type,
      });

      const data = JSON.parse(response);
      if (data.success) {
        setMessage({ text: 'Task order created successfully!', severity: 'success' });
        setTimeout(() => {
          navigate('/contracts'); // Navigate back to contracts page
        }, 1500);
      } else {
        throw new Error(data.message || 'Failed to create task order');
      }
    } catch (err) {
      console.error('Error creating task order:', err);
      setMessage({ 
        text: typeof err === 'string' ? err : 'Failed to create task order', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Back
      </Button>

      <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Create New Task Order
        </Typography>
        
        {contractId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Creating task order for contract ID: {contractId}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <TextField
                fullWidth
                label="Task Order Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                margin="normal"
              />
            </Box>
            
            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <TextField
                fullWidth
                label="Producer"
                value={formData.producer}
                onChange={(e) => handleInputChange('producer', e.target.value)}
                margin="normal"
                helperText="Person responsible for the task order"
              />
            </Box>

            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <TextField
                fullWidth
                label="Contracting Officer Representative (COR)"
                value={formData.cor}
                onChange={(e) => handleInputChange('cor', e.target.value)}
                margin="normal"
                helperText="COR for this task order"
              />
            </Box>

            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <TextField
                fullWidth
                label="Period of Performance"
                value={formData.pop}
                onChange={(e) => handleInputChange('pop', e.target.value)}
                margin="normal"
                helperText="e.g., [2024-01-01,2024-12-31] or leave empty"
              />
            </Box>

            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                margin="normal"
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Task order value in USD"
              />
            </Box>

            <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Task Order Type</InputLabel>
                <Select
                  value={formData.task_order_type}
                  onChange={(e) => handleInputChange('task_order_type', e.target.value)}
                  label="Task Order Type"
                >
                  <MenuItem value="Contract">Contract Task Order</MenuItem>
                  <MenuItem value="Internal">Internal Task Order</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? 'Creating...' : 'Create Task Order'}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={message?.severity} onClose={() => setMessage(null)}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskOrderCreatePage; 