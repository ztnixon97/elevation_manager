// src/components/navigation/Sidebar.tsx
import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Divider,
  Button,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as ProductsIcon,
  Assignment as TaskOrdersIcon,
  Groups as TeamsIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon,
  Public as PublicIcon,
  Analytics as AnalyticsIcon,
  RateReview as ReviewsIcon,
  Description as ContractsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  TrendingUp as ProductionIcon,
  Category as CategoryIcon,
  IntegrationInstructions as QGISIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useAppTheme } from '../../contexts/ThemeContext';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
  badge?: string | number;
  section?: 'main' | 'workflow' | 'management';
}

const navigationItems: NavigationItem[] = [
  // Main Operations
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    section: 'main',
  },
  {
    id: 'products',
    label: 'Products',
    icon: <ProductsIcon />,
    path: '/products',
    section: 'main',
  },
  {
    id: 'production-dashboard',
    label: 'Production Dashboard',
    icon: <ProductionIcon />,
    path: '/production-dashboard',
    section: 'main',
  },
  {
    id: 'team-dashboard',
    label: 'Team Dashboard',
    icon: <AnalyticsIcon />,
    path: '/team-dashboard',
    section: 'main',
  },
  // Workflow
  {
    id: 'reviews',
    label: 'Reviews',
    icon: <ReviewsIcon />,
    path: '/reviews',
    section: 'workflow',
  },
  {
    id: 'graphql',
    label: 'GraphQL Playground',
    icon: <AnalyticsIcon />,
    path: '/graphql',
    section: 'workflow',
    roles: ['Admin', 'Manager'],
  },
  // Management
  {
    id: 'taskorders',
    label: 'Task Orders',
    icon: <TaskOrdersIcon />,
    path: '/taskorders',
    section: 'management',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    icon: <ContractsIcon />,
    path: '/contracts',
    section: 'management',
    roles: ['Admin', 'Manager'],
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: <TeamsIcon />,
    path: '/teams',
    section: 'management',
  },
  {
    id: 'product-types',
    label: 'Product Types',
    icon: <CategoryIcon />,
    path: '/product-types',
    section: 'management',
    roles: ['Admin'],
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: <ProfileIcon />,
    path: '/user-management',
    section: 'management',
    roles: ['Admin'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <NotificationsIcon />,
    path: '/notifications',
    section: 'management',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    section: 'management',
  },
  {
    id: 'qgis',
    label: 'QGIS Integration',
    icon: <QGISIcon />,
    path: '/qgis',
    section: 'management',
    roles: ['Admin', 'Team Lead'],
  },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const theme = useTheme();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const hasAccess = (item: NavigationItem) => {
    if (!item.roles || !user) return true;
    return item.roles.includes(user.role || '');
  };

  const renderNavigationSection = (sectionTitle: string, items: NavigationItem[]) => (
    <Box key={sectionTitle} sx={{ mb: 2 }}>
      <Typography 
        variant="overline" 
        sx={{ 
          px: 3, 
          py: 1, 
          color: 'text.secondary',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        {sectionTitle}
      </Typography>
      <List sx={{ px: 1 }}>
        {items.filter(hasAccess).map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigate(item.path)}
              selected={isActivePath(item.path)}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 1.5,
                '&.Mui-selected': {
                  background: theme.palette.gradient.primary,
                  color: '#ffffff',
                  '& .MuiListItemIcon-root': {
                    color: '#ffffff',
                  },
                  '&:hover': {
                    background: theme.palette.gradient.primary,
                    opacity: 0.9,
                  },
                },
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isActivePath(item.path) ? 600 : 500,
                  fontSize: '0.875rem',
                }}
              />
              {item.badge && (
                <Chip 
                  label={item.badge} 
                  size="small" 
                  color={isActivePath(item.path) ? 'default' : 'primary'}
                  sx={{ 
                    height: 20, 
                    fontSize: '0.75rem',
                    bgcolor: isActivePath(item.path) ? 'rgba(255,255,255,0.2)' : undefined,
                  }} 
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const mainItems = navigationItems.filter(item => item.section === 'main');
  const workflowItems = navigationItems.filter(item => item.section === 'workflow');
  const managementItems = navigationItems.filter(item => item.section === 'management');

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: theme.palette.background.paper,
    }}>
      {/* Header */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            background: theme.palette.gradient.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <PublicIcon sx={{ fontSize: 24, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant="h6" component="div" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              Elevation Manager
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Geospatial Intelligence Platform
            </Typography>
          </Box>
        </Box>

        {/* Theme Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
            <IconButton 
              onClick={toggleTheme}
              size="small"
              sx={{ 
                color: 'text.secondary',
                '&:hover': { 
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* User Info */}
      {user && user.username && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: `1px solid ${theme.palette.divider}`,
          }}>
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main',
                width: 40,
                height: 40,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography 
                variant="subtitle2" 
                fontWeight="bold" 
                sx={{ 
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.profile?.first_name && user.profile?.last_name
                  ? `${user.profile.first_name} ${user.profile.last_name}`
                  : user.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.role || 'User'}
              </Typography>
              {user.teams && user.teams.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={`${user.teams.length} Team${user.teams.length > 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.7rem' }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2 }}>
        {renderNavigationSection('Operations', mainItems)}
        {renderNavigationSection('Workflow', workflowItems)}
        {renderNavigationSection('Management', managementItems)}
      </Box>

      {/* Bottom Actions */}
      <Box sx={{ p: 3, pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => handleNavigate('/settings')}
            sx={{ 
              justifyContent: 'flex-start',
              borderRadius: 2,
              py: 1,
            }}
          >
            Settings
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ 
              justifyContent: 'flex-start',
              borderRadius: 2,
              py: 1,
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;