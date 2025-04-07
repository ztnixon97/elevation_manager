import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
  CircularProgress,
  ListItemIcon,
  ListItemButton,
  Alert,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ClearIcon from '@mui/icons-material/Clear';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh'; // Add import for refresh
import { useNotifications, NotificationWithTargets } from '../context/NotificationContext';
import { format, isToday, isYesterday } from 'date-fns';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ open, onClose }) => {
  const {
    notifications,
    loading,
    error,
    dismissNotification,
    dismissAllNotifications,
    handleNotificationAction,
    refreshNotifications, // Add refresh function
  } = useNotifications();

  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Format notification date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  // Handle manual refresh with loading state
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      // Delay resetting the refreshing state to give a better visual feedback
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'team_access_request':
        return <AccessTimeIcon color="primary" />;
      case 'task_assignment':
        return <NewReleasesIcon color="secondary" />;
      case 'status_change':
        return <InfoIcon color="info" />;
      case 'review_request':
        return <WarningIcon color="warning" />;
      case 'system_announcement':
        return <NewReleasesIcon color="error" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const handleNotificationClick = (notif: NotificationWithTargets) => {
    handleNotificationAction(notif);
    
    // Auto-dismiss if dismissible
    if (notif.notification.dismissible && !notif.dismissed) {
      dismissNotification(notif.notification.id);
    }
    
    onClose(); // Close the drawer
  };

  const handleDismissAll = async () => {
    await dismissAllNotifications();
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 350, p: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Notifications</Typography>
          <Box>
            {/* Add refresh button */}
            <Tooltip title="Refresh notifications">
              <IconButton 
                onClick={handleRefresh} 
                disabled={loading || refreshing}
                size="small"
              >
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            <IconButton title="Mark all as read" onClick={handleDismissAll} disabled={loading || refreshing}>
              <DoneAllIcon />
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 64px)' }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">No new notifications</Typography>
            </Box>
          ) : (
            <List>
              {notifications.map((notif) => (
                <React.Fragment key={notif.notification.id}>
                  <ListItem 
                    disablePadding
                    sx={{
                      bgcolor: notif.dismissed ? 'inherit' : 'action.hover',
                      opacity: notif.dismissed ? 0.7 : 1,
                    }}
                  >
                    <ListItemButton onClick={() => handleNotificationClick(notif)}>
                      <ListItemIcon>
                        {getNotificationIcon(notif.notification.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={notif.notification.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {notif.notification.body}
                            </Typography>
                            <br />
                            <Typography component="span" variant="caption" color="text.secondary">
                              {formatDate(notif.notification.created_at)}
                            </Typography>
                          </>
                        }
                      />
                      {notif.notification.dismissible && !notif.dismissed && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notif.notification.id);
                          }}
                          title="Dismiss"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListItemButton>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default NotificationDrawer;
