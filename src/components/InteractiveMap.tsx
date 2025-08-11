// src/components/InteractiveMap.tsx
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as ZoomInIcon,
  Remove as ZoomOutIcon,
  MyLocation,
  LocationOn,
  Crop as DrawIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

// OpenLayers imports
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { Draw, Snap } from 'ol/interaction';
import WKT from 'ol/format/WKT';
import GeoJSON from 'ol/format/GeoJSON';
import { useDegreeGridLayer } from './DegreeGridLayer';
import { DegreeGridCell } from '../utils/degreeGridUtils';
import { usePrecomputedS2GridLayer } from './PrecomputedS2GridLayer';
import { PrecomputedS2Cell } from '../utils/precomputedS2Utils';

interface InteractiveMapProps {
  onCoordinateSelect?: (lat: number, lon: number) => void;
  onGeometrySelect?: (geometry: any) => void;
  onS2CellSelect?: (cellId: string, cell: PrecomputedS2Cell) => void;
  onDegreeGridCellSelect?: (cellId: string, cell: DegreeGridCell) => void;
  initialLat?: number;
  initialLon?: number;
  coordinateSystem?: string;
  geometryType?: 'Point' | 'Polygon' | 'MultiPolygon';
  height?: string | number;
  selectedCoordinates?: { lat: string; lon: string };
  showDrawingTools?: boolean;
  baseLayer?: 'osm' | 'satellite';
  initialGeometry?: any; // Allow loading initial geometry
  showS2Grid?: boolean;
  s2Level?: number;
  selectedS2CellId?: string;
}

export interface InteractiveMapRef {
  loadGeometry: (geometryData: any, format?: 'geojson' | 'wkt') => void;
  clearDrawing: () => void;
  getCurrentGeometry: () => any;
}

const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(({
  onCoordinateSelect,
  onGeometrySelect,
  onS2CellSelect,
  onDegreeGridCellSelect,
  initialLat = 39.8283,
  initialLon = -98.5795,
  coordinateSystem = 'EPSG:4326',
  geometryType = 'Point',
  height = 400,
  selectedCoordinates,
  showDrawingTools = true,
  baseLayer = 'osm',
  // initialGeometry, // TODO: Implement geometry loading
  showS2Grid = false,
  s2Level = 10,
  selectedS2CellId,
}, ref) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);

  const [currentBaseLayer, setCurrentBaseLayer] = useState(baseLayer);
  const [drawingMode, setDrawingMode] = useState(false);
  const [selectedLat, setSelectedLat] = useState(selectedCoordinates?.lat || initialLat.toString());
  const [selectedLon, setSelectedLon] = useState(selectedCoordinates?.lon || initialLon.toString());
  const [currentZoom, setCurrentZoom] = useState(4);
  const [drawnFeatures, setDrawnFeatures] = useState<Feature[]>([]);

  // Parse coordinate system for grid parameters
  const isS2System = coordinateSystem.startsWith('S2:');
  const isDegreeGridSystem = coordinateSystem.startsWith('WGS84-GRID:');
  const degreeGridSize = isDegreeGridSystem ? parseFloat(coordinateSystem.split(':')[1]) || 1.0 : 1.0;

  // Precomputed S2 Grid Layer - only initialize if map exists
  const s2GridLayer = usePrecomputedS2GridLayer({
    map: mapInstance.current,
    level: s2Level,
    visible: showS2Grid && isS2System,
    onCellClick: onS2CellSelect,
    selectedCellId: selectedS2CellId
  });

  // Degree Grid Layer - only initialize if map exists
  const degreeGridLayer = useDegreeGridLayer({
    map: mapInstance.current,
    gridSize: degreeGridSize,
    visible: showS2Grid && isDegreeGridSystem, // Reuse showS2Grid flag for all grids
    onCellClick: onDegreeGridCellSelect,
    selectedCellId: selectedS2CellId, // Can reuse for degree grid selection
  });

  // Update grids when coordinate system changes
  useEffect(() => {
    const isS2Visible = showS2Grid && isS2System;
    const isDegreeGridVisible = showS2Grid && isDegreeGridSystem;
    
    // Update grid visibility based on coordinate system
    
    // Force layer updates when grids become visible
    if (mapInstance.current) {
      if (isS2Visible && s2GridLayer.layer) {
        s2GridLayer.layer.setVisible(true);
      }
      if (isDegreeGridVisible && degreeGridLayer.layer) {
        degreeGridLayer.layer.setVisible(true);
      }
      
      // Trigger a view change to update the grids
      setTimeout(() => {
        const view = mapInstance.current?.getView();
        if (view) {
          view.dispatchEvent('change:center');
        }
      }, 200);
    }
  }, [showS2Grid, coordinateSystem, s2Level, degreeGridSize, s2GridLayer, degreeGridLayer]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    loadGeometry,
    clearDrawing,
    getCurrentGeometry: () => {
      if (drawnFeatures.length > 0) {
        const feature = drawnFeatures[0];
        const geometry = feature.getGeometry();
        if (geometry) {
          const geojsonFormat = new GeoJSON();
          return geojsonFormat.writeGeometry(geometry, {
            featureProjection: 'EPSG:3857',
            dataProjection: coordinateSystem,
          });
        }
      }
      return null;
    },
  }));

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Create base layers
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: currentBaseLayer === 'osm',
    });

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      }),
      visible: currentBaseLayer === 'satellite',
    });

    // Create vector layer for drawn features
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new Stroke({
          color: '#ff3333',
          width: 2,
        }),
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({
            color: '#ff3333',
          }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 2,
          }),
        }),
      }),
    });
    vectorLayerRef.current = vectorLayer;

    // Create map
    const map = new Map({
      target: mapRef.current,
      layers: [osmLayer, satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([initialLon, initialLat]),
        zoom: currentZoom,
      }),
    });

    // Add click handler for coordinate selection
    map.on('singleclick', (evt) => {
      if (!drawingMode && geometryType === 'Point') {
        const coordinate = toLonLat(evt.coordinate);
        const [lon, lat] = coordinate;
        setSelectedLat(lat.toFixed(6));
        setSelectedLon(lon.toFixed(6));
        onCoordinateSelect?.(lat, lon);
        
        // Update point feature
        updatePointFeature(lat, lon);
      }
    });

    // Track zoom changes
    map.getView().on('change:resolution', () => {
      setCurrentZoom(map.getView().getZoom() || 4);
    });

    mapInstance.current = map;
    
    // Add initial point if coordinates provided
    if (selectedCoordinates?.lat && selectedCoordinates?.lon) {
      updatePointFeature(parseFloat(selectedCoordinates.lat), parseFloat(selectedCoordinates.lon));
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.setTarget(undefined);
      }
    };
  }, []);

  // Update base layer visibility
  useEffect(() => {
    if (!mapInstance.current) return;
    const layers = mapInstance.current.getLayers().getArray();
    layers.forEach((layer, index) => {
      if (index === 0) layer.setVisible(currentBaseLayer === 'osm'); // OSM
      if (index === 1) layer.setVisible(currentBaseLayer === 'satellite'); // Satellite
    });
  }, [currentBaseLayer]);

  // Update drawing interaction when mode changes
  useEffect(() => {
    if (!mapInstance.current || !vectorLayerRef.current) return;
    
    const map = mapInstance.current;
    const source = vectorLayerRef.current.getSource();
    
    // Remove existing draw interaction
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    if (snapInteractionRef.current) {
      map.removeInteraction(snapInteractionRef.current);
      snapInteractionRef.current = null;
    }

    if (drawingMode && geometryType !== 'Point') {
      const draw = new Draw({
        source: source!,
        type: geometryType === 'Polygon' ? 'Polygon' : 'Polygon', // MultiPolygon handled as multiple polygons
      });

      draw.on('drawend', (event) => {
        const feature = event.feature;
        const geometry = feature.getGeometry();
        
        if (geometry) {
          // Convert to WKT for backend
          const wktFormat = new WKT();
          const wkt = wktFormat.writeGeometry(geometry, {
            featureProjection: 'EPSG:3857',
            dataProjection: coordinateSystem,
          });
          
          // Convert to GeoJSON coordinates for the callback
          const geojsonGeometry = {
            type: geometry.getType(),
            coordinates: (geometry as any).getCoordinates()
          };
          
          // Transform coordinates to lat/lon
          if (geometry.getType() === 'Polygon') {
            const coords = (geometry as any).getCoordinates() as number[][][];
            const transformedCoords = coords.map(ring => 
              ring.map(coord => toLonLat(coord))
            );
            geojsonGeometry.coordinates = transformedCoords;
          }
          
          onGeometrySelect?.({
            geometry: geojsonGeometry,
            wkt: wkt,
            feature: feature
          });
          setDrawnFeatures(prev => [...prev, feature]);
        }
        
        setDrawingMode(false);
      });

      const snap = new Snap({ source: source! });
      
      map.addInteraction(draw);
      map.addInteraction(snap);
      
      drawInteractionRef.current = draw;
      snapInteractionRef.current = snap;
    }
  }, [drawingMode, geometryType, coordinateSystem]);

  const updatePointFeature = (lat: number, lon: number) => {
    if (!vectorLayerRef.current) return;
    
    const source = vectorLayerRef.current.getSource();
    if (!source) return;
    
    // Clear existing features
    source.clear();
    
    // Add new point feature
    const pointFeature = new Feature({
      geometry: new Point(fromLonLat([lon, lat])),
    });
    
    source.addFeature(pointFeature);
  };

  const handleCoordinateChange = (field: 'lat' | 'lon', value: string) => {
    if (field === 'lat') {
      setSelectedLat(value);
    } else {
      setSelectedLon(value);
    }
    
    const lat = field === 'lat' ? parseFloat(value) : parseFloat(selectedLat);
    const lon = field === 'lon' ? parseFloat(value) : parseFloat(selectedLon);
    
    if (!isNaN(lat) && !isNaN(lon)) {
      onCoordinateSelect?.(lat, lon);
      updatePointFeature(lat, lon);
      
      // Pan map to new location
      if (mapInstance.current) {
        mapInstance.current.getView().setCenter(fromLonLat([lon, lat]));
      }
    }
  };

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedLat(latitude.toFixed(6));
          setSelectedLon(longitude.toFixed(6));
          onCoordinateSelect?.(latitude, longitude);
          updatePointFeature(latitude, longitude);
          
          if (mapInstance.current) {
            mapInstance.current.getView().setCenter(fromLonLat([longitude, latitude]));
            mapInstance.current.getView().setZoom(15);
          }
        },
        (error) => {
          console.error('Failed to get current location:', error);
        }
      );
    }
  };

  const zoomIn = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      view.setZoom((view.getZoom() || 4) + 1);
    }
  };

  const zoomOut = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      view.setZoom((view.getZoom() || 4) - 1);
    }
  };

  const panToCoordinates = () => {
    const lat = parseFloat(selectedLat);
    const lon = parseFloat(selectedLon);
    if (!isNaN(lat) && !isNaN(lon) && mapInstance.current) {
      mapInstance.current.getView().setCenter(fromLonLat([lon, lat]));
    }
  };

  const clearDrawing = () => {
    if (vectorLayerRef.current) {
      const source = vectorLayerRef.current.getSource();
      source?.clear();
      setDrawnFeatures([]);
    }
  };

  const loadGeometry = (geometryData: any, format: 'geojson' | 'wkt' = 'geojson') => {
    if (!vectorLayerRef.current) return;
    
    const source = vectorLayerRef.current.getSource();
    if (!source) return;
    
    source.clear();
    
    try {
      if (format === 'geojson') {
        const geometry = geometryData.type === 'Feature' ? geometryData.geometry : geometryData;
        
        if (geometry.type === 'Polygon') {
          const coords = geometry.coordinates.map((ring: number[][]) => 
            ring.map((coord: number[]) => fromLonLat([coord[0], coord[1]]))
          );
          const polygonGeometry = new Polygon(coords);
          const feature = new Feature({ geometry: polygonGeometry });
          source.addFeature(feature);
          setDrawnFeatures([feature]);
          
          // Zoom to feature
          if (mapInstance.current) {
            const extent = polygonGeometry.getExtent();
            mapInstance.current.getView().fit(extent, { padding: [20, 20, 20, 20] });
          }
        } else if (geometry.type === 'Point') {
          const pointGeometry = new Point(fromLonLat([geometry.coordinates[0], geometry.coordinates[1]]));
          const feature = new Feature({ geometry: pointGeometry });
          source.addFeature(feature);
          setDrawnFeatures([feature]);
        }
      } else if (format === 'wkt') {
        const wktFormat = new WKT();
        const geometry = wktFormat.readGeometry(geometryData, {
          dataProjection: coordinateSystem,
          featureProjection: 'EPSG:3857',
        });
        const feature = new Feature({ geometry });
        source.addFeature(feature);
        setDrawnFeatures([feature]);
        
        // Zoom to feature
        if (mapInstance.current) {
          const extent = geometry.getExtent();
          mapInstance.current.getView().fit(extent, { padding: [20, 20, 20, 20] });
        }
      }
    } catch (error) {
      console.error('Error loading geometry:', error);
    }
  };

  return (
    <Box>
      {/* Map Controls */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={zoomIn}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={zoomOut}>
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Get Current Location">
          <IconButton size="small" onClick={getCurrentLocation}>
            <MyLocation />
          </IconButton>
        </Tooltip>
        <Tooltip title="Pan to Coordinates">
          <IconButton size="small" onClick={panToCoordinates}>
            <LocationOn />
          </IconButton>
        </Tooltip>
        
        {showDrawingTools && geometryType !== 'Point' && (
          <Tooltip title={drawingMode ? 'Stop Drawing' : `Draw ${geometryType}`}>
            <IconButton 
              size="small" 
              color={drawingMode ? 'primary' : 'default'}
              onClick={() => setDrawingMode(!drawingMode)}
            >
              <DrawIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <Tooltip title="Clear Drawing">
          <IconButton size="small" onClick={clearDrawing}>
            <ClearIcon />
          </IconButton>
        </Tooltip>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Base Layer</InputLabel>
          <Select
            value={currentBaseLayer}
            onChange={(e) => setCurrentBaseLayer(e.target.value as 'osm' | 'satellite')}
            label="Base Layer"
          >
            <MenuItem value="osm">Street Map</MenuItem>
            <MenuItem value="satellite">Satellite</MenuItem>
          </Select>
        </FormControl>

        <Chip 
          label={`Zoom: ${currentZoom.toFixed(1)}`} 
          size="small" 
          variant="outlined"
        />
        <Chip 
          label={coordinateSystem} 
          size="small" 
          color="primary"
        />
      </Box>

      {/* Coordinate Input */}
      {geometryType === 'Point' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Latitude"
            type="number"
            value={selectedLat}
            onChange={(e) => handleCoordinateChange('lat', e.target.value)}
            inputProps={{ step: 'any', min: -90, max: 90 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Longitude"
            type="number"
            value={selectedLon}
            onChange={(e) => handleCoordinateChange('lon', e.target.value)}
            inputProps={{ step: 'any', min: -180, max: 180 }}
          />
        </Box>
      )}

      {/* Map Container */}
      <Box 
        sx={{ 
          height: typeof height === 'number' ? `${height}px` : height,
          border: 1, 
          borderColor: 'divider',
          borderRadius: 1,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div 
          ref={mapRef} 
          style={{ 
            width: '100%', 
            height: '100%',
            cursor: geometryType === 'Point' && !drawingMode ? 'crosshair' : drawingMode ? 'crosshair' : 'grab'
          }} 
        />
        
        {/* Map Info Overlay */}
        <Paper sx={{ 
          position: 'absolute', 
          top: 8, 
          left: 8, 
          p: 1,
          backgroundColor: 'rgba(255,255,255,0.9)'
        }}>
          <Typography variant="caption" display="block">
            {coordinateSystem} | {geometryType}
          </Typography>
          {showS2Grid && isS2System && (
            <Typography variant="caption" display="block" color="primary.main">
              S2 Grid Level: {s2GridLayer.currentLevel} | Cells: {s2GridLayer.cellCount}
            </Typography>
          )}
          {showS2Grid && isDegreeGridSystem && (
            <Typography variant="caption" display="block" color="success.main">
              Degree Grid: {degreeGridSize}° x {degreeGridSize}° | Cells: {degreeGridLayer.cellCount}
            </Typography>
          )}
          {selectedS2CellId && (
            <Typography variant="caption" display="block" color="success.main">
              Selected Cell: {selectedS2CellId.substring(0, 12)}...
            </Typography>
          )}
          {geometryType === 'Point' && !showS2Grid && (
            <Typography variant="caption" display="block" color="error.main">
              Selected: {parseFloat(selectedLat).toFixed(6)}, {parseFloat(selectedLon).toFixed(6)}
            </Typography>
          )}
        </Paper>

        {/* Drawing Instructions */}
        {geometryType !== 'Point' && (
          <Paper sx={{ 
            position: 'absolute', 
            bottom: 8, 
            left: 8, 
            right: 8,
            p: 1,
            backgroundColor: 'rgba(255,255,255,0.9)'
          }}>
            <Typography variant="caption">
              {drawingMode 
                ? `Click to add vertices for ${geometryType}. Double-click to finish.`
                : `Click "Draw ${geometryType}" to start drawing, or click map for point selection.`
              }
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Usage Info */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Interactive Map:</strong> This is a full OpenLayers implementation. 
          {geometryType === 'Point' 
            ? ' Click anywhere on the map to select coordinates.' 
            : ` Use drawing tools to create ${geometryType} geometries.`
          }
          {' '}Switch between street map and satellite imagery using the base layer selector.
        </Typography>
      </Alert>
    </Box>
  );
});

InteractiveMap.displayName = 'InteractiveMap';

export default InteractiveMap;