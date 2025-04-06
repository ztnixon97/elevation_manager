// src/pages/NotificationsPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  IconButton,
  Divider,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Container,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ClearIcon from '@mui/icons-material/Clear';
import { useNotifications, NotificationWithTargets } from '../context/NotificationContext';
import { format, isToday, isYesterday } from 'date-fns';

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    loading,
    error,
    dismissNotification,
    handleNotificationAction,
  } = useNotifications();

  const [filter, setFilter] = useState<string>('all');

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

  // Filter notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.dismissed;
    return notif.notification.type === filter;
  });

  const handleNotificationClick = (notif: NotificationWithTargets) => {
    handleNotificationAction(notif);
    
    // Auto-dismiss if dismissible
    if (notif.notification.dismissible && !notif.dismissed) {
      dismissNotification(notif.notification.id);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Chip
            label={`All (${notifications.length})`}
            color={filter === 'all' ? 'primary' : 'default'}
            onClick={() => setFilter('all')}
            sx={{ mr: 1 }}
          />
          <Chip
            label={`Unread (${notifications.filter(n => !n.dismissed).length})`}
            color={filter === 'unread' ? 'primary' : 'default'}
            onClick={() => setFilter('unread')}
            sx={{ mr: 1 }}
          />
          <Chip
            label="Requests"
            color={filter === 'team_access_request' ? 'primary' : 'default'}
            onClick={() => setFilter('team_access_request')}
            sx={{ mr: 1 }}
          />
          <Chip
            label="Tasks"
            color={filter === 'task_assignment' ? 'primary' : 'default'}
            onClick={() => setFilter('task_assignment')}
            sx={{ mr: 1 }}
          />
        </Box>
      </Box>

      <Paper elevation={2}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
            <Typography>{error}</Typography>
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">No notifications found</Typography>
          </Box>
        ) : (
          <List>
            {filteredNotifications.map((notif) => (
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
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" sx={{ flex: 1 }}>
                            {notif.notification.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(notif.notification.created_at)}
                          </Typography>
                        </Box>
                      }
                      secondary={notif.notification.body}
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
      </Paper>
    </Container>
  );
};

export default NotificationsPage;
