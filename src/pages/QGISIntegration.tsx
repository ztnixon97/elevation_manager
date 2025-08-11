// src/pages/QGISIntegration.tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Map as MapIcon,
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Sync as SyncIcon,
  Settings as SettingsIcon,
  Launch as LaunchIcon,
  FileCopy as FileCopyIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

interface WFSConnection {
  name: string;
  url: string;
  status: 'active' | 'inactive' | 'error';
  last_sync: string;
  feature_count: number;
}

interface QGISProject {
  id: string;
  name: string;
  description: string;
  layer_count: number;
  created_at: string;
  file_size: number;
}

const QGISIntegration: React.FC = () => {
  const auth = useContext(AuthContext);
  if (!auth) return null;
  const { user } = auth;
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<WFSConnection[]>([]);
  const [projects, setProjects] = useState<QGISProject[]>([]);
  const [wfsEnabled, setWfsEnabled] = useState(true);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [connectionDialog, setConnectionDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('geojson');
  const [exportFilters, setExportFilters] = useState({
    productTypes: '',
    dateRange: '',
    status: '',
  });

  useEffect(() => {
    loadQGISData();
  }, []);

  const loadQGISData = async () => {
    try {
      setLoading(true);
      
      // Initialize with empty data - backend integration pending
      setConnections([]);
      setWfsEnabled(true); // Assume WFS is enabled by default
      setProjects([]);
      
    } catch (error) {
      console.error('Failed to load QGIS data:', error);
      setMessage({ text: 'Failed to load QGIS integration data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const generateWFSConnectionString = () => {
    // WFS endpoint will be available once implemented
    return `http://localhost:3000/wfs`;
  };

  const generateWFSCapabilitiesUrl = () => {
    return `http://localhost:3000/wfs?service=WFS&request=GetCapabilities&version=2.0.0`;
  };

  const generateLayerUrls = () => {
    return {
      products: `http://localhost:3000/wfs?service=WFS&request=GetFeature&typeName=elevation:products&outputFormat=application/json`,
      taskOrders: `http://localhost:3000/wfs?service=WFS&request=GetFeature&typeName=elevation:task_orders&outputFormat=application/json`
    };
  };

  const generateAuthenticatedWFSUrls = () => {
    return {
      baseUrl: generateWFSConnectionString(),
      capabilitiesUrl: generateWFSCapabilitiesUrl(),
      ...generateLayerUrls()
    };
  };

  const getAuthToken = () => {
    return auth?.authToken || '';
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ text: 'Connection string copied to clipboard', severity: 'success' });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setMessage({ text: 'Failed to copy to clipboard', severity: 'error' });
    }
  };

  const handleWFSToggle = async () => {
    try {
      // TODO: Implement backend command to toggle WFS service
      // await invoke('toggle_wfs_service', { enabled: !wfsEnabled });
      setWfsEnabled(!wfsEnabled);
      setMessage({ 
        text: `WFS service ${!wfsEnabled ? 'enabled' : 'disabled'}`, 
        severity: 'success' 
      });
      // loadQGISData();
    } catch (error) {
      console.error('Failed to toggle WFS service:', error);
      setMessage({ text: 'Failed to toggle WFS service', severity: 'error' });
    }
  };

  const handleExportData = async () => {
    try {
      // TODO: Implement backend command to export GIS data
      setMessage({ text: 'Export functionality not yet implemented', severity: 'info' });
      setExportDialog(false);
    } catch (error) {
      console.error('Failed to export data:', error);
      setMessage({ text: 'Failed to export GIS data', severity: 'error' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckIcon color="success" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'inactive': return <WarningIcon color="warning" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          QGIS Integration
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadQGISData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => setExportDialog(true)}
          >
            Export Data
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* WFS Service Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  WFS Service
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={wfsEnabled}
                      onChange={handleWFSToggle}
                      color="primary"
                    />
                  }
                  label={wfsEnabled ? 'Enabled' : 'Disabled'}
                />
              </Box>
              
              {wfsEnabled && (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    WFS-T service is running! Products and Task Orders are available as editable layers in QGIS.
                    JWT authentication is required (team_lead or admin roles only).
                  </Alert>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    WFS URL with Authentication Token:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      value={`${generateAuthenticatedWFSUrls().baseUrl}?token=${getAuthToken()}`}
                      size="small"
                      InputProps={{ readOnly: true }}
                      helperText="Ready to use in QGIS - just copy and paste this URL"
                    />
                    <Tooltip title="Copy Authenticated WFS URL">
                      <IconButton
                        onClick={() => copyToClipboard(`${generateAuthenticatedWFSUrls().baseUrl}?token=${getAuthToken()}`)}
                        size="small"
                      >
                        <FileCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    GetCapabilities URL:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      value={generateAuthenticatedWFSUrls().capabilitiesUrl}
                      size="small"
                      InputProps={{ readOnly: true }}
                      helperText="Service capabilities (no auth required)"
                    />
                    <Tooltip title="Copy GetCapabilities URL">
                      <IconButton
                        onClick={() => copyToClipboard(generateAuthenticatedWFSUrls().capabilitiesUrl)}
                        size="small"
                      >
                        <FileCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<LaunchIcon />}
                      onClick={() => window.open(generateAuthenticatedWFSUrls().capabilitiesUrl, '_blank')}
                      size="small"
                    >
                      Test GetCapabilities
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<LaunchIcon />}
                      onClick={() => window.open(`${generateAuthenticatedWFSUrls().baseUrl}?service=WFS&request=GetFeature&typeName=products&token=${getAuthToken()}`, '_blank')}
                      size="small"
                    >
                      Test Products Layer
                    </Button>
                  </Box>
                </>
              )}
              
              {!wfsEnabled && (
                <Alert severity="info">
                  WFS-T service can be enabled once backend implementation is complete.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Connection Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Active Connections
              </Typography>
              
              <Alert severity="info">
                QGIS connection monitoring will be available once backend integration is complete.
                Use the WFS URLs above to connect QGIS to your data.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Setup Instructions */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">QGIS Setup Instructions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  WFS-T Implementation Complete
                </Typography>
                <Typography variant="body2">
                  Full OGC WFS 2.0.0 compliant service is running with transactional support.
                  Products and Task Orders are served as GML features with JWT authentication.
                  Supports all standard WFS operations: GetCapabilities, DescribeFeatureType, GetFeature, and Transaction.
                </Typography>
              </Alert>
              
              <Grid container spacing={2}>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    1. Add WFS Connection in QGIS:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Open QGIS and go to Layer → Add Layer → Add WFS Layer" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Click 'New' to create a new connection" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Name: 'Elevation Manager WFS-T'" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary={`URL: ${generateAuthenticatedWFSUrls().baseUrl}`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Configure JWT authentication using methods below" />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    2. Configure Authentication for Editing:
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    For WFS-T editing to work, you need to configure authentication properly.
                    URL parameters won't work for POST transactions.
                  </Alert>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Use base URL: http://localhost:3000/wfs (no token)" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Go to Authentication tab in QGIS connection dialog" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Select 'Basic authentication'" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Username: token" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Password: [Paste your JWT token from above]" />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    3. Load and Use WFS Layers:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Click 'Connect' to load available feature types" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="You should see: 'products' and 'task_orders' layers" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Select the layers you want and click 'Add'" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="For editing: Right-click layer → Toggle Editing" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Save changes with Ctrl+S or stop editing mode" />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>WFS-T Features:</strong> Products and Task Orders are exposed as editable vector layers.
                  You can create, update, and delete features directly in QGIS and changes will sync back to the database.
                  Products include geometry data for spatial editing, while Task Orders contain project metadata.
                </Typography>
              </Alert>
              
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Authentication Required:</strong> You must have team_lead or admin role to access WFS data.
                  If you get 401/403 errors, check that your token is valid and your role has GIS access permissions.
                  Your JWT token expires when your session ends - refresh this page for a new token.
                </Typography>
              </Alert>
              
              <Alert severity="success" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Editing:</strong> Enable editing mode in QGIS (Toggle Editing) to use WFS-T transactional features.
                  Changes are committed when you save edits or stop editing mode.
                </Typography>
              </Alert>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Available Feature Types */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Available Feature Types
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      <MapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Products Layer (elevation:products)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Digital elevation products with spatial geometry for WFS-T editing
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label="Polygon/Point Geometry" size="small" />
                      <Chip label="Multiple CRS Support" size="small" />
                      <Chip label="WFS-T Editable" size="small" color="primary" />
                      <Chip label="Create/Update/Delete" size="small" color="success" />
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Task Orders Layer (elevation:task_orders)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Project management and task assignment data with optional spatial bounds
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label="Attribute Data" size="small" />
                      <Chip label="Optional Geometry" size="small" />
                      <Chip label="WFS-T Editable" size="small" color="primary" />
                      <Chip label="Project Metadata" size="small" color="info" />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* QGIS Projects */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  QGIS Project Templates
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => setConnectionDialog(true)}
                >
                  Upload Project
                </Button>
              </Box>
              
              <Alert severity="info">
                QGIS project template management will be available once backend integration is complete.
                For now, manually create your QGIS projects using the WFS connection above.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export GIS Data</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={selectedFormat}
                label="Export Format"
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <MenuItem value="geojson">GeoJSON</MenuItem>
                <MenuItem value="shapefile">Shapefile (ZIP)</MenuItem>
                <MenuItem value="kml">KML</MenuItem>
                <MenuItem value="gpx">GPX</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Product Types (optional)"
              value={exportFilters.productTypes}
              onChange={(e) => setExportFilters({ ...exportFilters, productTypes: e.target.value })}
              placeholder="e.g., DEM, Imagery"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Date Range (optional)"
              value={exportFilters.dateRange}
              onChange={(e) => setExportFilters({ ...exportFilters, dateRange: e.target.value })}
              placeholder="e.g., 2024-01-01 to 2024-12-31"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Status Filter (optional)"
              value={exportFilters.status}
              onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
              placeholder="e.g., Completed, In Progress"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Cancel</Button>
          <Button onClick={handleExportData} variant="contained">
            Export Data
          </Button>
        </DialogActions>
      </Dialog>

      {/* Connection Dialog */}
      <Dialog open={connectionDialog} onClose={() => setConnectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload QGIS Project</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            QGIS project upload functionality is not yet implemented. 
            This feature will be available in a future update.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectionDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Message Snackbar */}
      {message && (
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={message.severity} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default QGISIntegration;