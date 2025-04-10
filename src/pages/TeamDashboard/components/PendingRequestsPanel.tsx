// src/pages/TeamDashboard/components/PendingRequestsPanel.tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Paper,
  Stack,
} from '@mui/material';
import { format, parseISO } from 'date-fns';

interface PendingRequestsPanelProps {
  teamId: number;
}

interface TeamRequest {
  id: number;
  request_type: string;
  requested_by: number;
  target_id: number;
  username?: string; // This is added by our Tauri function
  details: {
    role?: string;
    justification?: string;
    [key: string]: any;
  };
  status: string;
  requested_at: string;
}

const PendingRequestsPanel: React.FC<PendingRequestsPanelProps> = ({ teamId }) => {
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TeamRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [teamId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await invoke<string>('get_pending_team_requests', { team_id: teamId });
      const data = JSON.parse(response);
      if (data.data) {
        setRequests(data.data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch pending requests',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request: TeamRequest) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    setLoading(true);
    try {
      await invoke('approve_team_request', {
        request_id: selectedRequest.id,
        team_id: teamId
      });
      
      // Remove the approved request from the list
      setRequests(requests.filter(r => r.id !== selectedRequest.id));
      
      setMessage({
        text: 'Request approved successfully',
        severity: 'success',
      });
      setIsDetailDialogOpen(false);
    } catch (err) {
      console.error('Failed to approve request:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to approve request',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    
    setLoading(true);
    try {
      await invoke('reject_team_request', {
        request_id: selectedRequest.id,
        team_id: teamId
      });
      
      // Remove the rejected request from the list
      setRequests(requests.filter(r => r.id !== selectedRequest.id));
      
      setMessage({
        text: 'Request rejected successfully',
        severity: 'success',
      });
      setIsDetailDialogOpen(false);
    } catch (err) {
      console.error('Failed to reject request:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to reject request',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const getRequestTypeLabel = (requestType: string) => {
    switch (requestType) {
      case 'TeamJoin':
        return 'Join Team';
      case 'RoleChange':
        return 'Role Change';
      default:
        return requestType;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Pending Team Requests</Typography>
        <Button 
          variant="outlined" 
          onClick={fetchRequests}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No pending requests</Typography>
        </Paper>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {requests.map((request, index) => (
            <React.Fragment key={request.id}>
              <ListItem 
                alignItems="flex-start"
                secondaryAction={
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleViewRequest(request)}
                  >
                    View
                  </Button>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" component="span">
                        {request.details?.username || `User #${request.requested_by}`}
                      </Typography>
                      <Chip 
                        label={getRequestTypeLabel(request.request_type)} 
                        size="small" 
                        color="primary" 
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        sx={{ display: 'block' }}
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {request.details?.role && `Requested Role: ${request.details.role}`}
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        {formatDate(request.requested_at)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < requests.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Request Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onClose={() => setIsDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">User</Typography>
                <Typography variant="body1">{selectedRequest.details?.username || `User #${selectedRequest.requested_by}`}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Request Type</Typography>
                <Typography variant="body1">{getRequestTypeLabel(selectedRequest.request_type)}</Typography>
              </Box>
              
              {selectedRequest.details?.role && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Requested Role</Typography>
                  <Typography variant="body1">{selectedRequest.details.role}</Typography>
                </Box>
              )}
              
              {selectedRequest.details?.justification && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Justification</Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2">{selectedRequest.details.justification}</Typography>
                  </Paper>
                </Box>
              )}
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Request Date</Typography>
                <Typography variant="body1">{formatDate(selectedRequest.requested_at)}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetailDialogOpen(false)}>Close</Button>
          <Button
            onClick={handleRejectRequest}
            variant="outlined"
            color="error"
            disabled={loading}
          >
            Reject
          </Button>
          <Button
            onClick={handleApproveRequest}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Approve
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

export default PendingRequestsPanel;
