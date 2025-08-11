// src/pages/dashboard/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Button,
  useTheme,
  Skeleton,
  Stack,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Inventory as ProductsIcon,
  Assignment as TaskOrdersIcon,
  Groups as TeamsIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Map as MapIcon,
  Analytics as AnalyticsIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import InteractiveMap from '../../components/InteractiveMap';

interface DashboardStats {
  totalProducts: number;
  myProducts: number;
  totalTaskOrders: number;
  totalTeams: number;
  productsInProgress: number;
  productsCompleted: number;
  urgentProducts: number;
  teamCapacity: number;
}

interface ProductActivity {
  id: string;
  name: string;
  type: string;
  status: 'In Progress' | 'Review' | 'Completed' | 'Urgent';
  assignedTo: string;
  dueDate: string;
  progress: number;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  progress?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle, 
  trend, 
  progress,
  action 
}) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          '& .card-action': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant="overline" 
              color="text.secondary" 
              sx={{ 
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h3" 
              component="div" 
              sx={{ 
                color,
                fontWeight: 700,
                mb: 0.5,
                background: trend ? `linear-gradient(135deg, ${color}, ${theme.palette.secondary.main})` : color,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: trend ? 'transparent' : color,
              }}
            >
              {value.toLocaleString()}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Chip
                label={`${trend.direction === 'up' ? '+' : '-'}${trend.value}%`}
                size="small"
                color={trend.direction === 'up' ? 'success' : 'error'}
                sx={{ mt: 1, height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}20`,
              color: color,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
        
        {progress !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: `${color}20`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}

        {action && (
          <Button
            className="card-action"
            size="small"
            variant="outlined"
            onClick={action.onClick}
            sx={{
              mt: 1,
              opacity: 0,
              transform: 'translateY(8px)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              borderColor: color,
              color: color,
              '&:hover': {
                borderColor: color,
                backgroundColor: `${color}10`,
              },
            }}
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useApp();
  const navigate = useNavigate();
  const theme = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ProductActivity[]>([]);
  const [mapProducts, setMapProducts] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load dashboard statistics in parallel
        const [productsResponse, myProductsResponse, taskOrdersResponse, teamsResponse] = await Promise.allSettled([
          invoke<string>('get_all_products'),
          invoke<string>('get_user_products'),
          invoke<string>('get_all_taskorders'),
          invoke<string>('get_all_teams'),
        ]);

        // Load recent activity - get products with their status and progress
        try {
          const recentProductsResponse = await invoke<string>('get_recent_products');
          const recentProducts = JSON.parse(recentProductsResponse);
          if (Array.isArray(recentProducts)) {
            const activityData: ProductActivity[] = recentProducts.slice(0, 5).map((product: any) => ({
              id: product.id?.toString() || Math.random().toString(),
              name: product.name || product.item_id || 'Unknown Product',
              type: product.product_type || 'Unknown Type',
              status: product.status || 'In Progress',
              assignedTo: product.assigned_team || 'Unassigned',
              dueDate: product.due_date || new Date().toISOString().split('T')[0],
              progress: product.progress || 0,
            }));
            setRecentActivity(activityData);
          }
        } catch (activityError) {
          console.warn('Failed to load recent activity:', activityError);
          // Activity loading failure shouldn't break the dashboard
        }

        const stats: DashboardStats = {
          totalProducts: 0,
          myProducts: 0,
          totalTaskOrders: 0,
          totalTeams: 0,
          productsInProgress: 0,
          productsCompleted: 0,
          urgentProducts: 0,
          teamCapacity: 0,
        };

        // Parse responses
        if (productsResponse.status === 'fulfilled') {
          const products = JSON.parse(productsResponse.value);
          if (Array.isArray(products)) {
            stats.totalProducts = products.length;
            // Calculate real stats based on product status
            stats.productsInProgress = products.filter(p => p.status === 'In Progress' || p.status === 'Processing').length;
            stats.productsCompleted = products.filter(p => p.status === 'Completed' || p.status === 'Approved').length;
            stats.urgentProducts = products.filter(p => p.priority === 'Urgent' || p.status === 'Urgent').length;
            
            // Set products for map display (filter those with geometry)
            setMapProducts(products.filter(p => p.geometry));
          }
        }

        if (myProductsResponse.status === 'fulfilled') {
          const myProducts = JSON.parse(myProductsResponse.value);
          stats.myProducts = Array.isArray(myProducts) ? myProducts.length : 0;
        }

        if (taskOrdersResponse.status === 'fulfilled') {
          const taskOrders = JSON.parse(taskOrdersResponse.value);
          stats.totalTaskOrders = Array.isArray(taskOrders) ? taskOrders.length : 0;
        }

        if (teamsResponse.status === 'fulfilled') {
          const teams = JSON.parse(teamsResponse.value);
          if (Array.isArray(teams)) {
            stats.totalTeams = teams.length;
            // Calculate team capacity based on active members and current assignments
            const totalCapacity = teams.reduce((acc, team) => {
              const memberCount = team.members?.length || 0;
              const activeAssignments = team.active_assignments || 0;
              const capacity = memberCount > 0 ? Math.min(100, ((memberCount - activeAssignments) / memberCount) * 100) : 0;
              return acc + capacity;
            }, 0);
            stats.teamCapacity = teams.length > 0 ? Math.floor(totalCapacity / teams.length) : 0;
          }
        }

        setStats(stats);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data');
        addNotification({
          type: 'error',
          title: 'Dashboard Error',
          message: 'Failed to load dashboard statistics',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [addNotification]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return theme.palette.success.main;
      case 'In Progress': return theme.palette.primary.main;
      case 'Review': return theme.palette.warning.main;
      case 'Urgent': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircleIcon />;
      case 'In Progress': return <ScheduleIcon />;
      case 'Review': return <WarningIcon />;
      case 'Urgent': return <ErrorIcon />;
      default: return <ScheduleIcon />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={300} height={48} />
          <Skeleton variant="text" width={500} height={24} />
        </Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Mission Control Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Welcome back, {user?.profile?.first_name || user?.username || 'User'}! Track your geospatial operations.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/products/create')}
              sx={{ borderRadius: 2 }}
            >
              New Product
            </Button>
            <Button
              variant="outlined"
              startIcon={<MapIcon />}
              onClick={() => navigate('/production-dashboard')}
              sx={{ borderRadius: 2 }}
            >
              Production Dashboard
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Total Products"
              value={stats.totalProducts}
              subtitle="Active geospatial products"
              icon={<ProductsIcon />}
              color={theme.palette.primary.main}
              trend={{ value: 12, direction: 'up' }}
              action={{
                label: 'View All',
                onClick: () => navigate('/products'),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="In Progress"
              value={stats.productsInProgress}
              subtitle="Currently being processed"
              icon={<ScheduleIcon />}
              color={theme.palette.warning.main}
              progress={65}
              action={{
                label: 'Track Progress',
                onClick: () => navigate('/production-dashboard'),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Team Capacity"
              value={stats.teamCapacity}
              subtitle="Current utilization rate"
              icon={<TeamsIcon />}
              color={theme.palette.success.main}
              progress={stats.teamCapacity}
              action={{
                label: 'Manage Teams',
                onClick: () => navigate('/teams'),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Urgent Items"
              value={stats.urgentProducts}
              subtitle="Require immediate attention"
              icon={<ErrorIcon />}
              color={theme.palette.error.main}
              trend={{ value: 3, direction: 'down' }}
              action={{
                label: 'Review Now',
                onClick: () => navigate('/reviews'),
              }}
            />
          </Grid>
        </Grid>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Geographic Overview Map */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 450 }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Product Locations
                </Typography>
                <Chip 
                  label={`${mapProducts.length} products`} 
                  size="small" 
                  color="primary" 
                />
              </Box>
              
              <Box sx={{ flexGrow: 1, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                {mapProducts.length > 0 ? (
                  <InteractiveMap 
                    height="100%"
                    showDrawingTools={false}
                    initialLat={mapProducts[0]?.geometry?.coordinates?.[1] || 39.8283}
                    initialLon={mapProducts[0]?.geometry?.coordinates?.[0] || -98.5795}
                  />
                ) : (
                  <Box 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: 'action.hover',
                      color: 'text.secondary'
                    }}
                  >
                    <Typography variant="body2">
                      No products with geographic data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Activity
                </Typography>
                <Button
                  size="small"
                  endIcon={<LaunchIcon />}
                  onClick={() => navigate('/team-dashboard')}
                >
                  View Team Dashboard
                </Button>
              </Box>
              
              <Stack spacing={2}>
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                  <Box key={activity.id}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'action.selected',
                        transform: 'translateX(4px)',
                      },
                    }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${getStatusColor(activity.status)}20`,
                          color: getStatusColor(activity.status),
                          width: 40,
                          height: 40,
                        }}
                      >
                        {getStatusIcon(activity.status)}
                      </Avatar>
                      
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                          {activity.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {activity.type} • {activity.assignedTo} • Due {activity.dueDate}
                        </Typography>
                        
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={activity.progress}
                            sx={{
                              flexGrow: 1,
                              height: 4,
                              borderRadius: 2,
                              bgcolor: `${getStatusColor(activity.status)}20`,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getStatusColor(activity.status),
                              },
                            }}
                          />
                          <Typography variant="caption" fontWeight="bold">
                            {activity.progress}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Chip
                        label={activity.status}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(activity.status)}20`,
                          color: getStatusColor(activity.status),
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    {index < recentActivity.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                )) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    color: 'text.secondary' 
                  }}>
                    <Typography variant="body2">
                      No recent activity available. Recent product updates will appear here.
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions & System Status */}
        <Grid item xs={12} lg={6}>
          <Stack spacing={3}>
            {/* Quick Actions */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Quick Actions
                </Typography>
                
                <Stack spacing={2}>
                  {[
                    { label: 'Create Product', icon: <AddIcon />, path: '/products/create', color: theme.palette.primary.main },
                    { label: 'Production Dashboard', icon: <MapIcon />, path: '/production-dashboard', color: theme.palette.success.main },
                    { label: 'Team Dashboard', icon: <AnalyticsIcon />, path: '/team-dashboard', color: theme.palette.warning.main },
                    { label: 'Reviews', icon: <CheckCircleIcon />, path: '/reviews', color: theme.palette.info.main },
                  ].map((action) => (
                    <Button
                      key={action.label}
                      fullWidth
                      variant="outlined"
                      startIcon={action.icon}
                      onClick={() => navigate(action.path)}
                      sx={{
                        justifyContent: 'flex-start',
                        borderRadius: 2,
                        py: 1.5,
                        borderColor: `${action.color}40`,
                        color: action.color,
                        '&:hover': {
                          borderColor: action.color,
                          bgcolor: `${action.color}10`,
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  System Status
                </Typography>
                
                <Stack spacing={2}>
                  {stats && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Active Products</Typography>
                        <Chip 
                          label={stats.productsInProgress} 
                          size="small" 
                          color="warning"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Completed Products</Typography>
                        <Chip 
                          label={stats.productsCompleted} 
                          size="small" 
                          color="success"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Team Capacity</Typography>
                        <Chip 
                          label={`${stats.teamCapacity}%`} 
                          size="small" 
                          color={stats.teamCapacity > 70 ? "success" : stats.teamCapacity > 40 ? "warning" : "error"}
                        />
                      </Box>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Additional Dashboard Metrics Row */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                Production Overview
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                      {stats?.totalProducts || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Products
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                      {stats?.productsInProgress || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {stats?.productsCompleted || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main" fontWeight="bold">
                      {stats?.urgentProducts || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Urgent Items
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;