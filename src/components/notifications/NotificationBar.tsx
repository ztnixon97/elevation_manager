// src/components/notifications/NotificationBar.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Snackbar, Alert, Slide, SlideProps, AlertColor } from '@mui/material';
import { useApp } from '../../contexts/AppContext';
import { useNotifications, NotificationWithTargets } from '../../context/NotificationContext';

const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="down" />;
};

const NotificationBar: React.FC = () => {
  const { notifications: appNotifications, removeNotification } = useApp();
  const { notifications: backendNotifications } = useNotifications();

  const [visibleBackend, setVisibleBackend] = useState<NotificationWithTargets[]>([]);
  const shownBackendIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const newNotifs = backendNotifications.filter(
      n => !shownBackendIds.current.has(n.notification.id)
    );
    if (newNotifs.length > 0) {
      newNotifs.forEach(n => shownBackendIds.current.add(n.notification.id));
      setVisibleBackend(prev => [...prev, ...newNotifs]);
    }
  }, [backendNotifications]);

  const handleBackendClose = (id: number) => {
    setVisibleBackend(prev => prev.filter(n => n.notification.id !== id));
  };

  const mapSeverity = (type: string): AlertColor => {
    switch (type) {
      case 'review_request':
        return 'warning';
      case 'system_announcement':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <>
      {appNotifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open
          autoHideDuration={notification.duration}
          onClose={() => removeNotification(notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            mt: index * 7,
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

      {visibleBackend.map((notif, index) => (
        <Snackbar
          key={`backend-${notif.notification.id}`}
          open
          autoHideDuration={6000}
          onClose={() => handleBackendClose(notif.notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            mt: (appNotifications.length + index) * 7,
            zIndex: 1400 + appNotifications.length + index,
          }}
        >
          <Alert
            onClose={() => handleBackendClose(notif.notification.id)}
            severity={mapSeverity(notif.notification.type)}
            variant="filled"
            sx={{ width: '100%' }}
          >
            <strong>{notif.notification.title}</strong>
            {notif.notification.body && (
              <>
                <br />
                {notif.notification.body}
              </>
            )}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default NotificationBar;
