// src/layouts/AppLayout.tsx
import React, { ReactNode } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton,
  Avatar,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  ChevronLeft as ChevronLeftIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/navigation/Sidebar';
import NotificationBar from '../components/notifications/NotificationBar';

interface AppLayoutProps {
  children: ReactNode;
}

const DRAWER_WIDTH = 280;

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { sidebarOpen, setSidebarOpen, notifications } = useApp();
  const { user } = useAuth();
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          ml: sidebarOpen ? `${DRAWER_WIDTH}px` : 0,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', px: 3 }}>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ 
              mr: 3,
              color: 'text.primary',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
            }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                color: 'text.primary',
                fontWeight: 700,
                letterSpacing: '-0.025em',
              }}
            >
              Elevation Manager
            </Typography>
            <Chip 
              label="v2.1" 
              size="small" 
              sx={{ 
                height: 20, 
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                fontWeight: 600,
              }} 
            />
          </Box>

          {/* Right side actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Search */}
            <IconButton
              sx={{ 
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                },
              }}
            >
              <SearchIcon />
            </IconButton>

            {/* Notifications */}
            <IconButton
              sx={{ 
                color: 'text.secondary',
                position: 'relative',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                },
              }}
            >
              <NotificationsIcon />
              {notifications.length > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    bgcolor: 'error.main',
                    borderRadius: '50%',
                  }}
                />
              )}
            </IconButton>

            {/* User Avatar */}
            {user && user.username && (
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  ml: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: sidebarOpen ? DRAWER_WIDTH : 0, flexShrink: 0 }}
      >
        <Drawer
          variant="persistent"
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open={sidebarOpen}
        >
          <Sidebar />
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Toolbar spacing */}
        <Box sx={{ height: 64 }} />
        
        {/* Notification Bar */}
        <NotificationBar />
        
        {/* Page Content */}
        <Box sx={{ 
          flexGrow: 1, 
          p: 3, 
          overflow: 'auto',
          bgcolor: 'background.default',
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;