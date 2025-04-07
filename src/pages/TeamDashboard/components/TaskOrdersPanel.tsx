// src/pages/TeamDashboard/components/TaskOrdersPanel.tsx
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
  Snackbar,
  Alert,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';

interface TaskOrdersPanelProps {
  teamId: number;
  isTeamLead: boolean;
}

interface TaskOrder {
  id: number;
  name: string;
  producer?: string;
  status: string;
}

const TaskOrdersPanel: React.FC<TaskOrdersPanelProps> = ({ teamId, isTeamLead }) => {
  const [taskOrders, setTaskOrders] = useState<TaskOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchTaskOrders();
  }, [teamId]);

  const fetchTaskOrders = async () => {
    setLoading(true);
    try {
      const response = await invoke<string>('get_team_tasks', { teamId });
      const data = JSON.parse(response);
      if (data.data && data.data.task_orders) {
        setTaskOrders(data.data.task_orders);
      } else {
        setTaskOrders([]);
      }
    } catch (err) {
      console.error('Failed to fetch task orders:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch task orders',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Task Order Name', flex: 1 },
    { 
      field: 'producer', 
      headerName: 'Producer', 
      flex: 1,
      valueGetter: (params) => params.value || 'Not specified'
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'active' ? 'success' : 
            params.value === 'completed' ? 'info' : 
            params.value === 'pending' ? 'warning' : 
            'default'
          }
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        isTeamLead && (
          <IconButton
            size="small"
            onClick={() => handleRemoveClick(params.row.id)}
            color="error"
            title="Remove Task Order"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )
      ),
    },
  ];

  const handleAddClick = () => {
    if (!isTeamLead) return;
    setTaskName('');
    setIsAddDialogOpen(true);
  };

  const handleRemoveClick = (taskId: number) => {
    if (!isTeamLead) return;
    setSelectedTaskId(taskId);
    setIsDeleteDialogOpen(true);
  };

  const addTaskOrder = async () => {
    if (!taskName.trim()) return;
    
    setLoading(true);
    try {
      await invoke('assign_task_order_to_team', {
        teamId,
        taskName: taskName.trim(),
      });
      
      fetchTaskOrders();
      
      setMessage({
        text: 'Task order assigned successfully',
        severity: 'success',
      });
      setIsAddDialogOpen(false);
      setTaskName('');
    } catch (err) {
      console.error('Failed to assign task order:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to assign task order',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeTaskOrder = async () => {
    if (!selectedTaskId) return;
    
    setLoading(true);
    try {
      await invoke('remove_task_order_from_team', {
        teamId,
        taskId: selectedTaskId,
      });
      
      setTaskOrders(taskOrders.filter(t => t.id !== selectedTaskId));
      
      setMessage({
        text: 'Task order removed successfully',
        severity: 'success',
      });
      setIsDeleteDialogOpen(false);
      setSelectedTaskId(null);
    } catch (err) {
      console.error('Failed to remove task order:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to remove task order',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Task Orders</Typography>
        {isTeamLead && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            disabled={loading}
          >
            Assign Task Order
          </Button>
        )}
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <DataGrid
          rows={taskOrders}
          columns={columns}
          loading={loading}
          pagination
          disableSelectionOnClick
          autoHeight
        />
      </Box>

      {/* Add Task Order Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Task Order</DialogTitle>
        <DialogContent>
          <TextField
            label="Task Order Name"
            fullWidth
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={addTaskOrder}
            variant="contained"
            color="primary"
            disabled={!taskName.trim() || loading}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Task Order Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Remove Task Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this task order from the team?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={removeTaskOrder}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Remove
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

export default TaskOrdersPanel;