// src/pages/TeamDashboard/components/NotificationsPanel.tsx
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import { format } from 'date-fns';

interface NotificationsPanelProps {
  teamId: number;
  isTeamLead: boolean;
}

interface Notification {
  id: number;
  title: string;
  body?: string;
  type: string;
  created_at: string;
  dismissed: boolean;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ teamId, isTeamLead }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationType, setNotificationType] = useState('announcement');
  const [notificationExpiry, setNotificationExpiry] = useState('7');

  useEffect(() => {
    fetchNotifications();
  }, [teamId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // This would be your actual implementation
      const response = await invoke<string>('get_team_notifications', { team_id: teamId });
      const data = JSON.parse(response);
      if (data.data) {
        setNotifications(data.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch notifications',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    if (!isTeamLead) return;
    setNotificationTitle('');
    setNotificationBody('');
    setNotificationType('announcement');
    setNotificationExpiry('7');
    setIsAddDialogOpen(true);
  };

  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) return;
    
    setLoading(true);
    try {
      // This would be your actual implementation
      await invoke('send_team_notification', {
        team_id: teamId,
        title: notificationTitle.trim(),
        body: notificationBody.trim(),
        type: notificationType,
        expiryDays: parseInt(notificationExpiry, 10),
      });
      
      // Add the new notification to the list
      const newNotification: Notification = {
        id: Math.floor(Math.random() * 10000), // Temporary ID until we refresh
        title: notificationTitle,
        body: notificationBody,
        type: notificationType,
        created_at: new Date().toISOString(),
        dismissed: false,
      };
      
      setNotifications([newNotification, ...notifications]);
      
      setMessage({
        text: 'Notification sent successfully',
        severity: 'success',
      });
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to send notification:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to send notification',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <AnnouncementIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Team Notifications</Typography>
        {isTeamLead && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            disabled={loading}
          >
            Send Team Notification
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No notifications found</Typography>
        </Box>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {notifications.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <ListItem alignItems="flex-start">
                <ListItemIcon>{getNotificationIcon(notification.type)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" component="span">
                        {notification.title}
                      </Typography>
                      <Chip 
                        label={notification.type} 
                        size="small" 
                        color={notification.type === 'announcement' ? 'primary' : 'secondary'} 
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
                        {notification.body}
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        {formatDate(notification.created_at)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Send Notification Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Send Team Notification</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            value={notificationTitle}
            onChange={(e) => setNotificationTitle(e.target.value)}
            margin="normal"
          />

          <TextField
            label="Message"
            fullWidth
            multiline
            rows={4}
            value={notificationBody}
            onChange={(e) => setNotificationBody(e.target.value)}
            margin="normal"
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                label="Type"
              >
                <MenuItem value="announcement">Announcement</MenuItem>
                <MenuItem value="alert">Alert</MenuItem>
                <MenuItem value="info">Information</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Expiry</InputLabel>
              <Select
                value={notificationExpiry}
                onChange={(e) => setNotificationExpiry(e.target.value)}
                label="Expiry"
              >
                <MenuItem value="1">1 day</MenuItem>
                <MenuItem value="3">3 days</MenuItem>
                <MenuItem value="7">7 days</MenuItem>
                <MenuItem value="14">14 days</MenuItem>
                <MenuItem value="30">30 days</MenuItem>
                <MenuItem value="0">Never</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={sendNotification}
            variant="contained"
            color="primary"
            disabled={!notificationTitle.trim() || !notificationBody.trim() || loading}
          >
            Send
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

export default NotificationsPanel;