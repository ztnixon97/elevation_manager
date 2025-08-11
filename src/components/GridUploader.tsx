// src/components/GridUploader.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface CustomGrid {
  id: string;
  name: string;
  description?: string;
  productTypeId?: number;
  productTypeName?: string;
  fileName: string;
  uploadDate: string;
  cellCount: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface GridUploaderProps {
  productTypeId?: number;
  onGridSelect?: (gridId: string, grid: CustomGrid) => void;
  selectedGridId?: string;
}

const GridUploader: React.FC<GridUploaderProps> = ({
  productTypeId,
  onGridSelect,
  selectedGridId
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [grids, setGrids] = useState<CustomGrid[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    name: '',
    description: '',
    file: null as File | null
  });

  // Mock data for demonstration
  React.useEffect(() => {
    const mockGrids: CustomGrid[] = [
      {
        id: 'grid-1',
        name: 'MGRS Grid System',
        description: 'Military Grid Reference System',
        productTypeId: 1,
        productTypeName: 'Elevation Data',
        fileName: 'mgrs_grid.geojson',
        uploadDate: '2024-01-15',
        cellCount: 1250,
        bounds: { north: 45, south: 35, east: -75, west: -85 }
      },
      {
        id: 'grid-2',
        name: 'Custom Regional Grid',
        description: 'Custom grid for Pacific Northwest',
        productTypeId: 2,
        productTypeName: 'Imagery',
        fileName: 'pnw_grid.geojson',
        uploadDate: '2024-01-20',
        cellCount: 456,
        bounds: { north: 49, south: 42, east: -116, west: -125 }
      }
    ];
    setGrids(mockGrids);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension !== 'geojson' && file.type !== 'application/json') {
        setUploadError('Please select a valid GeoJSON file (.geojson)');
        return;
      }

      setUploadFormData(prev => ({ ...prev, file }));
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFormData.file || !uploadFormData.name) {
      setUploadError('Please provide a name and select a file');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      // Read and validate the GeoJSON file
      const fileText = await uploadFormData.file.text();
      const geoData = JSON.parse(fileText);

      // Basic GeoJSON validation
      if (!geoData.type || !geoData.features) {
        throw new Error('Invalid GeoJSON format');
      }

      // Count features (grid cells)
      const cellCount = geoData.features.length;

      // Calculate bounds (simplified - in reality, you'd calculate properly)
      let bounds = { north: 45, south: 35, east: -75, west: -85 };

      const newGrid: CustomGrid = {
        id: `grid-${Date.now()}`,
        name: uploadFormData.name,
        description: uploadFormData.description,
        productTypeId,
        fileName: uploadFormData.file.name,
        uploadDate: new Date().toISOString().split('T')[0],
        cellCount,
        bounds
      };

      setGrids(prev => [...prev, newGrid]);
      setShowUploadDialog(false);
      setUploadFormData({ name: '', description: '', file: null });

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteGrid = (gridId: string) => {
    setGrids(prev => prev.filter(g => g.id !== gridId));
    if (selectedGridId === gridId) {
      onGridSelect?.('', {} as CustomGrid);
    }
  };

  const handleSelectGrid = (grid: CustomGrid) => {
    onGridSelect?.(grid.id, grid);
  };

  const filteredGrids = productTypeId 
    ? grids.filter(g => g.productTypeId === productTypeId)
    : grids;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Custom Grid Systems
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowUploadDialog(true)}
        >
          Upload Grid
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Upload custom grid systems as GeoJSON files. Each feature represents a grid cell.
        {productTypeId && ' Grids uploaded here will be associated with the selected product type.'}
      </Alert>

      {filteredGrids.length === 0 ? (
        <Alert severity="warning">
          No custom grids available. Upload a GeoJSON file to get started.
        </Alert>
      ) : (
        <List>
          {filteredGrids.map((grid) => (
            <ListItem
              key={grid.id}
              sx={{
                border: '1px solid #eee',
                borderRadius: 1,
                mb: 1,
                bgcolor: selectedGridId === grid.id ? 'action.selected' : 'background.paper',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {grid.name}
                    </Typography>
                    {selectedGridId === grid.id && (
                      <Typography variant="caption" color="primary" sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white', 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1 
                      }}>
                        Selected
                      </Typography>
                    )}
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="body2" component="span">
                      {grid.description}
                    </Typography>
                    <br />
                    <Typography variant="caption" component="span">
                      {grid.cellCount} cells • {grid.uploadDate} • {grid.fileName}
                    </Typography>
                    {grid.productTypeName && (
                      <>
                        <br />
                        <Typography variant="caption" component="span" color="primary">
                          Product Type: {grid.productTypeName}
                        </Typography>
                      </>
                    )}
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  onClick={() => handleSelectGrid(grid)}
                  color={selectedGridId === grid.id ? 'primary' : 'default'}
                >
                  <ViewIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => handleDeleteGrid(grid.id)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Custom Grid</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Grid Name"
              value={uploadFormData.name}
              onChange={(e) => setUploadFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={uploadFormData.description}
              onChange={(e) => setUploadFormData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />

            <Box>
              <input
                accept=".geojson,application/json"
                style={{ display: 'none' }}
                id="grid-file-upload"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="grid-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  fullWidth
                >
                  {uploadFormData.file ? uploadFormData.file.name : 'Select GeoJSON File'}
                </Button>
              </label>
            </Box>

            {uploading && <LinearProgress />}
            
            {uploadError && (
              <Alert severity="error">{uploadError}</Alert>
            )}

            <Alert severity="info">
              <Typography variant="body2">
                <strong>File Format:</strong> Upload a GeoJSON file where each feature represents a grid cell.
                The file should contain polygon features with proper coordinates.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!uploadFormData.file || !uploadFormData.name || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GridUploader;