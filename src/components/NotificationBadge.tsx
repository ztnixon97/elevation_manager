// src/components/NotificationBadge.tsx
import React from 'react';
import { Badge } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications } from '../context/NotificationContext';

interface NotificationBadgeProps {
  onClick?: () => void;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ onClick }) => {
  const { unreadCount } = useNotifications();
  
  return (
    <Badge
      badgeContent={unreadCount}
      color="error"
      overlap="circular"
      variant="dot"
      invisible={unreadCount === 0}
    >
      <NotificationsIcon 
        color="inherit" 
        onClick={onClick}
        sx={{ 
          cursor: 'pointer',
          fontSize: '1.5rem'
        }}
      />
    </Badge>
  );
};

export default NotificationBadge;
