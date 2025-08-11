// src/components/GeometryInputSimple.tsx
import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Map as MapIcon,
  Code as CodeIcon,
  GridOn as GridIcon,
  ExpandMore,
  Clear as ClearIcon,
  Check as CheckIcon,
  ContentPaste,
  ContentCopy
} from '@mui/icons-material';
import InteractiveMap, { InteractiveMapRef } from './InteractiveMap';
import { PrecomputedS2Cell } from '../utils/precomputedS2Utils';
import { DegreeGridCell } from '../utils/degreeGridUtils';

interface GeometryInputProps {
  geometryType: 'Polygon' | 'MultiPolygon';
  coordinateSystem: string;
  onGeometryChange: (geometry: any) => void;
  initialGeometry?: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`geometry-tabpanel-${index}`}
      aria-labelledby={`geometry-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const GeometryInput: React.FC<GeometryInputProps> = ({
  geometryType,
  coordinateSystem,
  onGeometryChange,
  initialGeometry
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [geoJsonText, setGeoJsonText] = useState('');
  const [cornerCoords, setCornerCoords] = useState({
    nwLat: '', nwLon: '', // Northwest
    neLat: '', neLon: '', // Northeast  
    seLat: '', seLon: '', // Southeast
    swLat: '', swLon: ''  // Southwest
  });
  const [geoJsonError, setGeoJsonError] = useState('');
  const [currentGeometry, setCurrentGeometry] = useState<any>(initialGeometry);
  const [selectedS2CellId, setSelectedS2CellId] = useState<string>('');

  const mapRef = useRef<InteractiveMapRef>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Get appropriate coordinate labels based on coordinate system
  const getCoordinateLabel = (position: 'first' | 'second'): string => {
    if (coordinateSystem.startsWith('S2:')) {
      return 'S2 Cell Token';
    } else if (coordinateSystem === 'EPSG:4326') {
      return position === 'first' ? 'Latitude' : 'Longitude';
    } else if (coordinateSystem.startsWith('EPSG:')) {
      // For projected coordinate systems (like UTM)
      return position === 'first' ? 'Northing (Y)' : 'Easting (X)';
    }
    return position === 'first' ? 'Y' : 'X';
  };

  // Corner coordinates to polygon
  const handleCornerCoordsChange = (field: keyof typeof cornerCoords, value: string) => {
    setCornerCoords(prev => ({ ...prev, [field]: value }));
  };

  const createPolygonFromCorners = () => {
    const { nwLat, nwLon, neLat, neLon, seLat, seLon, swLat, swLon } = cornerCoords;
    
    // Validate all coordinates are present
    if (!nwLat || !nwLon || !neLat || !neLon || !seLat || !seLon || !swLat || !swLon) {
      alert('Please fill in all corner coordinates');
      return;
    }

    try {
      // For S2 coordinates, we need special handling
      if (coordinateSystem.startsWith('S2:')) {
        alert('S2 coordinate input is not yet fully implemented. Please use the Interactive Map or GeoJSON input for S2 systems.');
        return;
      }

      // Create polygon geometry in the specified coordinate system
      // Note: GeoJSON format is [longitude, latitude] or [x, y]
      const geometry = {
        type: 'Polygon',
        coordinates: [[
          [parseFloat(nwLon), parseFloat(nwLat)], // Northwest
          [parseFloat(neLon), parseFloat(neLat)], // Northeast
          [parseFloat(seLon), parseFloat(seLat)], // Southeast
          [parseFloat(swLon), parseFloat(swLat)], // Southwest
          [parseFloat(nwLon), parseFloat(nwLat)]  // Close the ring
        ]]
      };

      setCurrentGeometry(geometry);
      onGeometryChange(geometry);
      
      // Load into map - the InteractiveMap will handle coordinate system transformation
      mapRef.current?.loadGeometry(geometry, 'geojson');
      
      alert(`Polygon created from corner coordinates in ${coordinateSystem}!`);
    } catch (error) {
      alert('Error creating polygon from coordinates. Please check your input.');
    }
  };

  // GeoJSON handling
  const handleGeoJsonChange = (value: string) => {
    setGeoJsonText(value);
    setGeoJsonError('');

    if (!value.trim()) {
      setCurrentGeometry(null);
      return;
    }

    try {
      const parsed = JSON.parse(value);
      
      // Validate basic GeoJSON structure
      if (!parsed.type) {
        throw new Error('Missing type property');
      }

      let geometry = parsed;
      if (parsed.type === 'Feature') {
        geometry = parsed.geometry;
      }

      if (!geometry || !geometry.type || !geometry.coordinates) {
        throw new Error('Invalid geometry structure');
      }

      // Validate geometry type matches expected
      if (geometry.type !== geometryType) {
        throw new Error(`Expected ${geometryType} but got ${geometry.type}`);
      }

      setCurrentGeometry(geometry);
      onGeometryChange(geometry);
      mapRef.current?.loadGeometry(geometry, 'geojson');
      
    } catch (error) {
      setGeoJsonError(error instanceof Error ? error.message : 'Invalid GeoJSON');
    }
  };

  // Map interaction
  const handleMapGeometry = (geometryData: any) => {
    setCurrentGeometry(geometryData.geometry);
    onGeometryChange(geometryData.geometry);
    
    // Update text representations
    setGeoJsonText(JSON.stringify(geometryData.geometry, null, 2));
  };

  const handleS2CellSelect = (cellId: string, cell: PrecomputedS2Cell) => {
    setSelectedS2CellId(cellId);
    
    // Convert precomputed S2 cell to polygon geometry
    const polygon = {
      type: 'Polygon',
      coordinates: [[
        [cell.bounds.west, cell.bounds.south],
        [cell.bounds.east, cell.bounds.south],
        [cell.bounds.east, cell.bounds.north],
        [cell.bounds.west, cell.bounds.north],
        [cell.bounds.west, cell.bounds.south]
      ]]
    };
    
    setCurrentGeometry(polygon);
    onGeometryChange(polygon);
    
    // Update text representations
    setGeoJsonText(JSON.stringify(polygon, null, 2));
  };

  const handleDegreeGridCellSelect = (cellId: string, cell: DegreeGridCell) => {
    setSelectedS2CellId(cellId); // Reuse the same state for any grid cell
    
    // Convert degree grid cell to polygon geometry
    const polygon = {
      type: 'Polygon',
      coordinates: [[
        [cell.bounds.west, cell.bounds.south],
        [cell.bounds.east, cell.bounds.south],
        [cell.bounds.east, cell.bounds.north],
        [cell.bounds.west, cell.bounds.north],
        [cell.bounds.west, cell.bounds.south]
      ]]
    };
    
    setCurrentGeometry(polygon);
    onGeometryChange(polygon);
    
    // Update text representations
    setGeoJsonText(JSON.stringify(polygon, null, 2));
  };

  const clearAll = () => {
    setCurrentGeometry(null);
    setGeoJsonText('');
    setCornerCoords({ nwLat: '', nwLon: '', neLat: '', neLon: '', seLat: '', seLon: '', swLat: '', swLon: '' });
    setGeoJsonError('');
    mapRef.current?.clearDrawing();
    onGeometryChange(null);
  };

  const copyGeometry = async () => {
    if (currentGeometry) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(currentGeometry, null, 2));
        alert('Geometry copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy geometry:', error);
      }
    }
  };

  const pasteGeometry = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCurrentTab(1); // Switch to GeoJSON tab
      handleGeoJsonChange(text);
    } catch (error) {
      console.error('Failed to paste geometry:', error);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {geometryType} Geometry Input
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          label={coordinateSystem}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mr: 1 }}
        />
        {currentGeometry && (
          <Chip
            icon={<CheckIcon />}
            label="Geometry Set"
            color="success"
            size="small"
            sx={{ mr: 1 }}
          />
        )}
        <Tooltip title="Copy Geometry">
          <IconButton size="small" onClick={copyGeometry} disabled={!currentGeometry}>
            <ContentCopy />
          </IconButton>
        </Tooltip>
        <Tooltip title="Paste Geometry">
          <IconButton size="small" onClick={pasteGeometry}>
            <ContentPaste />
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear All">
          <IconButton size="small" onClick={clearAll}>
            <ClearIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="geometry input methods">
          <Tab 
            icon={<MapIcon />} 
            label="Interactive Map" 
            id="geometry-tab-0"
            aria-controls="geometry-tabpanel-0"
          />
          <Tab 
            icon={<CodeIcon />} 
            label="GeoJSON" 
            id="geometry-tab-1"
            aria-controls="geometry-tabpanel-1"
          />
          <Tab 
            icon={<GridIcon />} 
            label="Corner Coordinates" 
            id="geometry-tab-2"
            aria-controls="geometry-tabpanel-2"
          />
        </Tabs>
      </Box>

      {/* Interactive Map Tab */}
      <TabPanel value={currentTab} index={0}>
        <InteractiveMap
          ref={mapRef}
          geometryType={geometryType}
          coordinateSystem={coordinateSystem}
          onGeometrySelect={handleMapGeometry}
          onS2CellSelect={handleS2CellSelect}
          onDegreeGridCellSelect={handleDegreeGridCellSelect}
          height={400}
          showDrawingTools={true}
          showS2Grid={coordinateSystem.startsWith('S2:') || coordinateSystem.startsWith('WGS84-GRID:')}
          s2Level={coordinateSystem.startsWith('S2:') ? parseInt(coordinateSystem.split(':')[1]) || 10 : 10}
          selectedS2CellId={selectedS2CellId}
        />
        
        {/* S2 Cell Info */}
        {coordinateSystem.startsWith('S2:') && selectedS2CellId && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Selected S2 Cell:</strong> {selectedS2CellId}
              <br />
              <strong>Level:</strong> {coordinateSystem.split(':')[1] || '10'}
              <br />
              Click on any S2 cell in the map to select it as your coverage area.
            </Typography>
          </Alert>
        )}
        
        {coordinateSystem.startsWith('S2:') && !selectedS2CellId && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>S2 Grid Mode:</strong> Click on any S2 cell in the map to select it as your coverage area.
              The grid automatically adjusts based on zoom level for optimal viewing.
            </Typography>
          </Alert>
        )}
        
        {/* Degree Grid Cell Info */}
        {coordinateSystem.startsWith('WGS84-GRID:') && selectedS2CellId && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Selected Grid Cell:</strong> {selectedS2CellId}
              <br />
              <strong>Grid Size:</strong> {coordinateSystem.split(':')[1] || '1.0'}° x {coordinateSystem.split(':')[1] || '1.0'}°
              <br />
              Click on any degree grid cell in the map to select it as your coverage area.
            </Typography>
          </Alert>
        )}
        
        {coordinateSystem.startsWith('WGS84-GRID:') && !selectedS2CellId && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Degree Grid Mode:</strong> Click on any grid cell in the map to select it as your coverage area.
              Regular {coordinateSystem.split(':')[1] || '1.0'}° x {coordinateSystem.split(':')[1] || '1.0'}° degree-based grid cells are displayed.
            </Typography>
          </Alert>
        )}
      </TabPanel>

      {/* GeoJSON Tab */}
      <TabPanel value={currentTab} index={1}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Enter valid GeoJSON geometry or feature in <strong>{coordinateSystem}</strong>. The geometry type must match "{geometryType}".
          {coordinateSystem !== 'EPSG:4326' && (
            <><br />Note: Coordinates should be in the selected coordinate system ({coordinateSystem}), not WGS84.</>
          )}
        </Alert>
        <TextField
          fullWidth
          multiline
          rows={12}
          label="GeoJSON"
          value={geoJsonText}
          onChange={(e) => handleGeoJsonChange(e.target.value)}
          error={!!geoJsonError}
          helperText={geoJsonError || `Enter ${geometryType} GeoJSON geometry`}
          placeholder={`{\n  "type": "${geometryType}",\n  "coordinates": [...]\n}`}
          sx={{ fontFamily: 'monospace' }}
        />
      </TabPanel>

      {/* Corner Coordinates Tab */}
      <TabPanel value={currentTab} index={2}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Enter the four corner coordinates in <strong>{coordinateSystem}</strong> to create a rectangular polygon coverage area.
          {coordinateSystem === 'EPSG:4326' && (
            <><br /><strong>Example:</strong> Latitude: 40.7128, Longitude: -74.0060 (New York City)</>
          )}
          {coordinateSystem.startsWith('EPSG:') && coordinateSystem.includes('326') && (
            <><br /><strong>Example UTM:</strong> Easting: 500000, Northing: 4500000 (in meters)</>
          )}
          {coordinateSystem.startsWith('S2:') && (
            <><br /><strong>S2 Note:</strong> S2 coordinate input via corner coordinates is not yet implemented. Please use the Interactive Map or GeoJSON input methods.</>
          )}
        </Alert>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Northwest Corner</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                type={coordinateSystem.startsWith('S2:') ? 'text' : 'number'}
                label={getCoordinateLabel('first')}
                value={cornerCoords.nwLat}
                onChange={(e) => handleCornerCoordsChange('nwLat', e.target.value)}
                inputProps={coordinateSystem.startsWith('S2:') ? {} : { step: 'any' }}
              />
              <TextField
                size="small"
                type={coordinateSystem.startsWith('S2:') ? 'text' : 'number'}
                label={getCoordinateLabel('second')}
                value={cornerCoords.nwLon}
                onChange={(e) => handleCornerCoordsChange('nwLon', e.target.value)}
                inputProps={coordinateSystem.startsWith('S2:') ? {} : { step: 'any' }}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Northeast Corner</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                type={coordinateSystem.startsWith('S2:') ? 'text' : 'number'}
                label={getCoordinateLabel('first')}
                value={cornerCoords.neLat}
                onChange={(e) => handleCornerCoordsChange('neLat', e.target.value)}
                inputProps={coordinateSystem.startsWith('S2:') ? {} : { step: 'any' }}
              />
              <TextField
                size="small"
                type={coordinateSystem.startsWith('S2:') ? 'text' : 'number'}
                label={getCoordinateLabel('second')}
                value={cornerCoords.neLon}
                onChange={(e) => handleCornerCoordsChange('neLon', e.target.value)}
                inputProps={coordinateSystem.startsWith('S2:') ? {} : { step: 'any' }}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Southwest Corner</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                type={coordinateSystem.startsWith('S2:') ? 'text' : 'number'}
                label={getCoordinateLabel('first')}
                value={cornerCoords.swLat}
                onChange={(e) => handleCornerCoordsChange('swLat', e.target.value)}
                inputProps={coordinateSystem.startsWith('S2:') ? {} : { step: 'any' }}
              />
              <TextField
                size="small"
                type={coordinateSystem.startsWith('S2:') ? 'text' : 'number'}
                label={getCoordinateLabel('second')}
                value={cornerCoords.swLon}
                onChange={(e) => handleCornerCoordsChange('swLon', e.target.value)}
                inputProps={coordinateSystem.startsWith('S2:') ? {} : { step: 'any' }}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Southeast Corner</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                type={coordinateSystem.startsWith('S2:') ? 'text' : 'number'}
                label={getCoordinateLabel('first')}
                value={cornerCoords.seLat}
                onChange={(e) => handleCornerCoordsChange('seLat', e.target.value)}
                inputProps={coordinateSystem.startsWith('S2:') ? {} : { step: 'any' }}
              />
              <TextField
                size="small"
                type={coordinateSystem.startsWith('S2:') ? 'text' : 'number'}
                label={getCoordinateLabel('second')}
                value={cornerCoords.seLon}
                onChange={(e) => handleCornerCoordsChange('seLon', e.target.value)}
                inputProps={coordinateSystem.startsWith('S2:') ? {} : { step: 'any' }}
              />
            </Box>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            onClick={createPolygonFromCorners}
            startIcon={<CheckIcon />}
          >
            Create Polygon from Corners
          </Button>
        </Box>
      </TabPanel>

      {/* Current Geometry Display */}
      {currentGeometry && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">
              Current Geometry ({currentGeometry.type})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              rows={6}
              value={JSON.stringify(currentGeometry, null, 2)}
              InputProps={{ readOnly: true }}
              sx={{ fontFamily: 'monospace' }}
            />
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
};

export default GeometryInput;