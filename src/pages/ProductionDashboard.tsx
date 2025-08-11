import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Chip,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Groups as GroupsIcon,
  AssessmentOutlined as AssessmentIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ProductionDashboardData {
  total_active_products: number;
  products_by_status: StatusCount[];
  products_by_priority: PriorityCount[];
  throughput_metrics: ThroughputMetrics;
  capacity_utilization: CapacityUtilization;
  sla_performance: SlaPerformance;
  quality_metrics: QualityMetrics;
  bottlenecks: BottleneckItem[];
  upcoming_deadlines: DeadlineItem[];
}

interface StatusCount {
  status: string;
  count: number;
}

interface PriorityCount {
  priority: string;
  count: number;
}

interface ThroughputMetrics {
  products_completed_today: number;
  products_completed_week: number;
  products_completed_month: number;
  average_cycle_time_hours: number;
  throughput_trend: ThroughputDataPoint[];
}

interface ThroughputDataPoint {
  date: string;
  completed_count: number;
  average_cycle_time: number;
}

interface CapacityUtilization {
  total_capacity: number;
  utilized_capacity: number;
  utilization_percentage: number;
  by_team: TeamCapacityData[];
  by_user: UserCapacityData[];
}

interface TeamCapacityData {
  team_id: number;
  team_name: string;
  capacity: number;
  utilization: number;
  utilization_percentage: number;
}

interface UserCapacityData {
  user_id: number;
  username: string;
  capacity: number;
  utilization: number;
  utilization_percentage: number;
}

interface SlaPerformance {
  on_time_percentage: number;
  average_delay_hours: number;
  sla_breaches_today: number;
  sla_breaches_week: number;
  at_risk_count: number;
}

interface QualityMetrics {
  average_quality_score: number;
  quality_trend: QualityDataPoint[];
  defect_rate: number;
  rework_rate: number;
}

interface QualityDataPoint {
  date: string;
  average_score: number;
  total_inspections: number;
}

interface BottleneckItem {
  workflow_step_name: string;
  products_waiting: number;
  average_wait_time_hours: number;
  severity: string;
}

interface DeadlineItem {
  product_id: number;
  product_name: string;
  due_date: string;
  hours_until_due: number;
  current_status: string;
  priority: string;
}

const ProductionDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<ProductionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | 'all'>('all');
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh
    const interval = setInterval(loadDashboardData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [selectedTeam, refreshInterval]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params = selectedTeam !== 'all' ? { team_id: selectedTeam } : {};
      const response = await invoke('get_production_dashboard', params);
      setDashboardData(response as ProductionDashboardData);
      setError(null);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'active': case 'in_progress': return 'primary';
      case 'paused': case 'on_hold': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': case 'critical': return 'error';
      case 'high': return 'warning';
      case 'normal': case 'medium': return 'primary';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // Chart configurations
  const statusChartData = {
    labels: dashboardData?.products_by_status.map(s => s.status) || [],
    datasets: [{
      data: dashboardData?.products_by_status.map(s => s.count) || [],
      backgroundColor: [
        '#4CAF50', // completed
        '#2196F3', // active
        '#FF9800', // paused
        '#F44336', // cancelled
        '#9C27B0', // other
      ],
    }],
  };

  const throughputChartData = {
    labels: dashboardData?.throughput_metrics.throughput_trend.map(t => t.date) || [],
    datasets: [
      {
        label: 'Completed Products',
        data: dashboardData?.throughput_metrics.throughput_trend.map(t => t.completed_count) || [],
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Avg Cycle Time (hrs)',
        data: dashboardData?.throughput_metrics.throughput_trend.map(t => t.average_cycle_time) || [],
        borderColor: '#FF9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        yAxisID: 'y1',
        tension: 0.4,
      },
    ],
  };

  const throughputChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Production Throughput Trend',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (loading && !dashboardData) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AssessmentIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Production Dashboard
          </Typography>
        </Box>
        <LinearProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadDashboardData}>
            Retry
          </Button>
        }>
          Error loading dashboard: {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Production Dashboard
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small">
            <InputLabel>Team Filter</InputLabel>
            <Select
              value={selectedTeam}
              label="Team Filter"
              onChange={(e) => setSelectedTeam(e.target.value as number | 'all')}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">All Teams</MenuItem>
              {dashboardData?.capacity_utilization.by_team.map(team => (
                <MenuItem key={team.team_id} value={team.team_id}>
                  {team.team_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small">
            <InputLabel>Refresh</InputLabel>
            <Select
              value={refreshInterval}
              label="Refresh"
              onChange={(e) => setRefreshInterval(e.target.value as number)}
              sx={{ minWidth: 100 }}
            >
              <MenuItem value={10}>10s</MenuItem>
              <MenuItem value={30}>30s</MenuItem>
              <MenuItem value={60}>1m</MenuItem>
              <MenuItem value={300}>5m</MenuItem>
            </Select>
          </FormControl>
          
          <IconButton onClick={loadDashboardData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Key Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Active Products
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData?.total_active_products || 0}
                  </Typography>
                </Box>
                <AssignmentIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Capacity Utilization
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData?.capacity_utilization.utilization_percentage.toFixed(1) || 0}%
                  </Typography>
                </Box>
                <SpeedIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    SLA Performance
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData?.sla_performance.on_time_percentage.toFixed(1) || 0}%
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Avg Quality Score
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData?.quality_metrics.average_quality_score.toFixed(1) || 0}
                  </Typography>
                </Box>
                <TrendingUpIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Products by Status" />
            <CardContent>
              {dashboardData?.products_by_status.length ? (
                <Box sx={{ height: 300, position: 'relative' }}>
                  <Doughnut data={statusChartData} options={{ maintainAspectRatio: false }} />
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">No data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Production Throughput" />
            <CardContent>
              {dashboardData?.throughput_metrics.throughput_trend.length ? (
                <Box sx={{ height: 300 }}>
                  <Line data={throughputChartData} options={throughputChartOptions} />
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">No trend data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tables Row */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Production Bottlenecks" />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Workflow Step</TableCell>
                      <TableCell align="right">Waiting</TableCell>
                      <TableCell align="right">Avg Wait</TableCell>
                      <TableCell>Severity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData?.bottlenecks.slice(0, 5).map((bottleneck, index) => (
                      <TableRow key={index}>
                        <TableCell>{bottleneck.workflow_step_name}</TableCell>
                        <TableCell align="right">{bottleneck.products_waiting}</TableCell>
                        <TableCell align="right">{bottleneck.average_wait_time_hours.toFixed(1)}h</TableCell>
                        <TableCell>
                          <Chip 
                            label={bottleneck.severity} 
                            color={getSeverityColor(bottleneck.severity) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!dashboardData?.bottlenecks || dashboardData.bottlenecks.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="textSecondary">
                            No bottlenecks detected
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Upcoming Deadlines" />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Due In</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData?.upcoming_deadlines.slice(0, 5).map((deadline) => (
                      <TableRow key={deadline.product_id}>
                        <TableCell>{deadline.product_name}</TableCell>
                        <TableCell align="right">
                          {deadline.hours_until_due > 0 
                            ? `${deadline.hours_until_due.toFixed(1)}h`
                            : 'Overdue'
                          }
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={deadline.current_status} 
                            color={getStatusColor(deadline.current_status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={deadline.priority} 
                            color={getPriorityColor(deadline.priority) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!dashboardData?.upcoming_deadlines || dashboardData.upcoming_deadlines.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="textSecondary">
                            No upcoming deadlines
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductionDashboard;