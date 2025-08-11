// src/components/notifications/NotificationBar.tsx
import React from 'react';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';
import { useApp } from '../../contexts/AppContext';

const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="down" />;
};

const NotificationBar: React.FC = () => {
  const { notifications, removeNotification } = useApp();

  return (
    <>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration}
          onClose={() => removeNotification(notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            mt: index * 7, // Stack multiple notifications
            zIndex: 1400 + index,
          }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            <strong>{notification.title}</strong>
            {notification.message && (
              <>
                <br />
                {notification.message}
              </>
            )}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default NotificationBar;