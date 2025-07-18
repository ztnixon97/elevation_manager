// src/pages/Dashboard.tsx - GIS-Focused Dashboard
import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Badge,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Layers as LayersIcon,
  MyLocation as MyLocationIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Settings as SettingsIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  RateReview as ReviewIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Group as GroupIcon,
  AccountTree as AccountTreeIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  Map as MapIcon,
  Clear as ClearIcon,
  CropSquare as CropSquareIcon,
  RadioButtonChecked as RadioButtonCheckedIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
import { Select as SelectInteraction } from 'ol/interaction';
import { click, pointerMove } from 'ol/events/condition';
import WKT from 'ol/format/WKT';
import { getCenter, intersects as olIntersects } from 'ol/extent';
import type { FeatureLike } from 'ol/Feature';
import Overlay from 'ol/Overlay';
import { Draw } from 'ol/interaction';
import { getDistance } from 'ol/sphere';
import Circle from 'ol/geom/Circle';

interface Product {
  id: number;
  site_id: string;
  item_id: string;
  status: string;
  product_type_id: number;
  product_type_name?: string;
  team_id?: number;
  team_name?: string;
  assigned_to?: string;
  priority: string;
  geom?: string; // WKT geometry
  due_date?: string;
  created_at: string;
  updated_at: string;
  estimated_hours?: number;
  completion_percentage?: number;
  review_status?: string; // Added for review status
}

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  pendingReviews: number;
  myAssignments: number;
  overdueProducts: number;
  completedThisWeek: number;
}

interface FilterOptions {
  statusFilter: string[];
  teamFilter: string[];
  productTypeFilter: string[];
  priorityFilter: string[];
  assigneeFilter: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

const Dashboard: React.FC = () => {
  const { userRole, userId, username } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Map refs
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer | null>(null);
  const selectInteractionRef = useRef<SelectInteraction | null>(null);
  // Add refs for base layers
  const osmLayerRef = useRef<TileLayer | null>(null);
  const satelliteLayerRef = useRef<TileLayer | null>(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeProducts: 0,
    pendingReviews: 0,
    myAssignments: 0,
    overdueProducts: 0,
    completedThisWeek: 0,
  });
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    statusFilter: [],
    teamFilter: [],
    productTypeFilter: [],
    priorityFilter: [],
    assigneeFilter: [],
    dateRange: { start: '', end: '' },
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // Map controls
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [baseLayer, setBaseLayer] = useState<'osm' | 'satellite'>('osm');
  const [showLabels, setShowLabels] = useState(true);
  const [clusterFeatures, setClusterFeatures] = useState(true);
  
  // Bulk actions
  const [selectedProductIds, setSelectedProductIds] = useState<GridRowSelectionModel>([]);
  const [bulkActionAnchor, setBulkActionAnchor] = useState<null | HTMLElement>(null);
  
  // UI state
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [showTable, setShowTable] = useState(true);

  // Selection tool state
  const [selectionMode, setSelectionMode] = useState<'none' | 'box' | 'radius'>('none');
  const drawInteractionRef = useRef<Draw | null>(null);

  // Sync selectedProducts with selectedProductIds
  useEffect(() => {
    if (!selectedProductIds || selectedProductIds.length === 0) {
      setSelectedProducts([]);
      return;
    }
    // Find products by their IDs
    const selected = products.filter(p => selectedProductIds.includes(p.id));
    setSelectedProducts(selected);
  }, [selectedProductIds, products]);

  // Available options for filters
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [productTypes, setProductTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [assignees, setAssignees] = useState<Array<{ id: number; name: string }>>([]);

  // Add state for products in view
  const [productsInView, setProductsInView] = useState<Product[]>([]);

  // Popup state
  const [popupInfo, setPopupInfo] = useState<{ coordinate: number[]; product: Product } | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupOverlay, setPopupOverlay] = useState<Overlay | null>(null);

  useEffect(() => {
    initializeMap();
    fetchDashboardData();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, searchTerm, filters]);

  // Listen for map moveend and update productsInView
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    const updateProductsInView = () => {
      const extent = map.getView().calculateExtent(map.getSize());
      const wktFormat = new WKT();
      const inView: Product[] = [];
      (Array.isArray(filteredProducts) ? filteredProducts : []).forEach(product => {
        if (!product.geom) return;
        let wktString = product.geom;
        if (wktString.startsWith('SRID=')) {
          wktString = wktString.split(';')[1];
        }
        try {
          const geometry = wktFormat.readGeometry(wktString, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          if (geometry && olIntersects(extent, geometry.getExtent())) {
            inView.push(product);
          }
        } catch (err) {
          // Ignore geometry errors here
        }
      });
      setProductsInView(inView);
    };
    map.on('moveend', updateProductsInView);
    // Initial call
    updateProductsInView();
    return () => {
      map.un('moveend', updateProductsInView);
    };
  }, [filteredProducts]);

  // Update map features when productsInView changes
  useEffect(() => {
    updateMapFeatures(productsInView);
  }, [productsInView]);

  // Update base layer visibility when baseLayer changes
  useEffect(() => {
    if (osmLayerRef.current && satelliteLayerRef.current) {
      osmLayerRef.current.setVisible(baseLayer === 'osm');
      satelliteLayerRef.current.setVisible(baseLayer === 'satellite');
    }
  }, [baseLayer]);

  // Add popup overlay to map
  useEffect(() => {
    if (!mapInstance.current) return;
    if (!popupRef.current) return;
    if (popupOverlay) return;
   const overlay = new Overlay({
      element: popupRef.current,
      autoPan: { animation: { duration: 250 } },
    });
    mapInstance.current.addOverlay(overlay);
    setPopupOverlay(overlay);
    return () => {
      mapInstance.current?.removeOverlay(overlay);
    };
  }, [mapInstance.current, popupRef.current]);

  // Update popup position when popupInfo changes
  useEffect(() => {
    if (popupOverlay && popupInfo) {
      popupOverlay.setPosition(popupInfo.coordinate);
    } else if (popupOverlay) {
      popupOverlay.setPosition(undefined);
    }
  }, [popupOverlay, popupInfo]);

  // Sync map selection when selectedProducts changes
  useEffect(() => {
    if (!selectInteractionRef.current) return;
    const selectInteraction = selectInteractionRef.current;
    const features = selectInteraction.getFeatures();
    features.clear();
    if (!selectedProducts || selectedProducts.length === 0) return;
    // Find features in the vector layer that match selectedProducts
    const vectorSource = vectorLayerRef.current?.getSource();
    if (!vectorSource) return;
    selectedProducts.forEach(product => {
      const feature = vectorSource.getFeatures().find(f => f.get('productId') === product.id);
      if (feature) features.push(feature);
    });
  }, [selectedProducts]);

  // Add map click handler for popup
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // Only show popup on direct singleclick, not on drag or selection
    const handleMapClick = (evt: any) => {
      if (!vectorLayerRef.current) return;
      const features = map.getFeaturesAtPixel(evt.pixel, { layerFilter: l => l === vectorLayerRef.current });
      if (features && features.length > 0) {
        const feature = features[0];
        const productId = feature.get('productId');
        // Find the product in the full products list
        const product = products.find(p => p.id === productId);
        if (product) {
          setPopupInfo({ coordinate: evt.coordinate, product });
        }
      } else {
        setPopupInfo(null);
      }
    };

    map.on('singleclick', handleMapClick);

    // Clean up
    return () => {
      map.un('singleclick', handleMapClick);
    };
  }, [products]);

  // Add/Remove Draw interaction for box/radius selection
  useEffect(() => {
    if (!mapInstance.current || !vectorLayerRef.current) return;
    const map = mapInstance.current;
    // Remove any previous draw interaction
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    if (selectionMode === 'none') return;
    let draw: Draw;
    if (selectionMode === 'box') {
      draw = new Draw({
        source: new VectorSource(), // temp source, not used
        type: 'Circle', // OL uses circle for box with geometryFunction
        geometryFunction: (coordinates, geometry) => {
          // Box geometry function
          if (!geometry) geometry = new Polygon([]);
          if (!Array.isArray(coordinates) || coordinates.length < 2) return geometry;
          const start = coordinates[0] as [number, number];
          const end = coordinates[1] as [number, number];
          if (!Array.isArray(start) || !Array.isArray(end)) return geometry;
          const minX = Math.min(start[0], end[0]);
          const minY = Math.min(start[1], end[1]);
          const maxX = Math.max(start[0], end[0]);
          const maxY = Math.max(start[1], end[1]);
          geometry.setCoordinates([[
            [minX, minY],
            [minX, maxY],
            [maxX, maxY],
            [maxX, minY],
            [minX, minY],
          ]]);
          return geometry;
        },
        maxPoints: 2,
      });
    } else if (selectionMode === 'radius') {
      draw = new Draw({
        source: new VectorSource(),
        type: 'Circle',
      });
    } else {
      return;
    }
    draw.on('drawend', (evt) => {
      const geometry = evt.feature.getGeometry();
      const vectorSource = vectorLayerRef.current?.getSource();
      if (!vectorSource) return;
      const features = vectorSource.getFeatures();
      let selectedIds: any[] = [];
      if (selectionMode === 'box') {
        // Select features whose geometry intersects the box
        if (geometry) {
          const boxExtent = geometry.getExtent();
          selectedIds = features.filter(f => f.getGeometry().intersectsExtent(boxExtent)).map(f => f.get('productId'));
        }
      } else if (selectionMode === 'radius') {
        // Select features whose geometry is within the circle
        const circleGeom = geometry;
        if (circleGeom && circleGeom instanceof Circle) {
          const center = circleGeom.getCenter();
          const radius = circleGeom.getRadius();
          selectedIds = features.filter(f => {
            const geom = f.getGeometry();
            // For points, check distance to center
            if (geom.getType() === 'Point') {
              return getDistance(center, geom.getCoordinates()) <= radius;
            } else {
              // For polygons/lines, check if any coordinate is within radius
              return (
                geom.intersectsCoordinate(center) ||
                (getDistance(center, geom.getClosestPoint(center)) <= radius)
              );
            }
          }).map(f => f.get('productId'));
        }
      }
      setSelectedProductIds(selectedIds);
      setSelectionMode('none');
    });
    map.addInteraction(draw);
    drawInteractionRef.current = draw;
    return () => {
      map.removeInteraction(draw);
    };
  }, [selectionMode]);

  const initializeMap = () => {
    if (!mapElement.current || mapInstance.current) return;

    // Create base layers
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: baseLayer === 'osm',
    });
    osmLayerRef.current = osmLayer;

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      }),
      visible: baseLayer === 'satellite',
    });
    satelliteLayerRef.current = satelliteLayer;

    // Create vector layer for products
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => createFeatureStyle(feature),
    });
    vectorLayerRef.current = vectorLayer;

    // Create map
    const map = new Map({
      target: mapElement.current,
      layers: [osmLayer, satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([-98.5, 39.8]), // USA center
        zoom: 4,
      }),
    });

    // Add selection interaction
    const selectInteraction = new SelectInteraction({
      condition: click,
      multi: true,
      layers: [vectorLayer],
    });
    
    selectInteraction.on('select', (e) => {
      // Get selected product IDs from features
      const selectedIds = e.selected.map(feature => feature.get('productId')).filter(Boolean);
      setSelectedProductIds(selectedIds);
    });

    map.addInteraction(selectInteraction);
    selectInteractionRef.current = selectInteraction;

    mapInstance.current = map;
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstance.current) {
        mapInstance.current.updateSize();
      }
    });
    resizeObserver.observe(mapElement.current);

    return () => {
      resizeObserver.disconnect();
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's accessible products
      const response = await invoke<string>('get_user_products');
      console.debug('get_user_products response:', response);
      const data = JSON.parse(response);
      
      if (data.success && data.data) {
        // Support both { data: [...] } and { data: { products: [...] } }
        let userProducts: Product[] = [];
        if (Array.isArray(data.data)) {
          userProducts = data.data;
        } else if (Array.isArray(data.data.products)) {
          userProducts = data.data.products;
        } else {
          console.warn('Unexpected products data structure:', data.data);
        }
        setProducts(userProducts);
        console.debug('Products set in state:', userProducts);
        
        // Calculate stats
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const newStats: DashboardStats = {
          totalProducts: userProducts.length,
          activeProducts: userProducts.filter((p: Product) => p.status !== 'accepted').length,
          pendingReviews: userProducts.filter((p: Product) => p.status === 'in_review' || p.review_status === 'pending_approval').length,
          myAssignments: userProducts.filter((p: Product) => p.assigned_to === username).length,
          overdueProducts: userProducts.filter((p: Product) => 
            p.due_date && new Date(p.due_date) < now && p.status !== 'completed'
          ).length,
          completedThisWeek: userProducts.filter((p: Product) => 
            p.status === 'completed' && 
            new Date(p.updated_at) > weekAgo
          ).length,
        };
        
        setStats(newStats);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setMessage({
        text: 'Failed to load dashboard data',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch teams user has access to
      const teamsResponse = await invoke<string>('get_user_teams');
      console.debug('get_user_teams response:', teamsResponse);
      const teamsData = JSON.parse(teamsResponse);
      if (teamsData.success && teamsData.data) {
        setTeams(teamsData.data);
      }

      // Fetch product types
      const typesResponse = await invoke<string>('get_all_product_types');
      console.debug('get_all_product_types response:', typesResponse);
      const typesData = JSON.parse(typesResponse);
      if (typesData.success && typesData.data) {
        setProductTypes(typesData.data);
      }

      // Fetch team members who can be assignees
      const assigneesResponse = await invoke<string>('get_all_users');
      console.debug('get_all_users response:', assigneesResponse);
      const assigneesData = JSON.parse(assigneesResponse);
      if (assigneesData.success && assigneesData.data) {
        setAssignees(assigneesData.data);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const applyFilters = () => {
    let filtered: Product[] = Array.isArray(products) ? products : [];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((p: Product) => 
        p.site_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.item_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_type_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filters.statusFilter.length > 0) {
      filtered = filtered.filter((p: Product) => filters.statusFilter.includes(p.status));
    }

    // Team filter
    if (filters.teamFilter.length > 0) {
      filtered = filtered.filter((p: Product) => p.team_id && filters.teamFilter.includes(p.team_id.toString()));
    }

    // Product type filter
    if (filters.productTypeFilter.length > 0) {
      filtered = filtered.filter((p: Product) => filters.productTypeFilter.includes(p.product_type_id.toString()));
    }

    // Priority filter
    if (filters.priorityFilter.length > 0) {
      filtered = filtered.filter((p: Product) => filters.priorityFilter.includes(p.priority));
    }

    // Assignee filter
    if (filters.assigneeFilter.length > 0) {
      filtered = filtered.filter((p: Product) => p.assigned_to && filters.assigneeFilter.includes(p.assigned_to));
    }

    // Date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter((p: Product) => new Date(p.created_at) >= new Date(filters.dateRange.start));
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter((p: Product) => new Date(p.created_at) <= new Date(filters.dateRange.end));
    }

    setFilteredProducts(filtered);
  };

  // Refactor updateMapFeatures to always include selectedProducts
  const updateMapFeatures = (productsToProcess?: Product[]) => {
    if (!mapInstance.current || !vectorLayerRef.current) return;
    const vectorSource = vectorLayerRef.current.getSource();
    if (!vectorSource) return;
    vectorSource.clear();
    const features: Feature[] = [];
    const wktFormat = new WKT();
    // Always include selectedProducts
    const selectedIds = new Set(selectedProducts.map(p => p.id));
    const products = Array.isArray(productsToProcess) ? productsToProcess : (Array.isArray(filteredProducts) ? filteredProducts : []);
    // Merge productsInView and selectedProducts (avoid duplicates)
    const allProducts: Product[] = [
      ...products,
      ...selectedProducts.filter(p => !products.some(prod => prod.id === p.id)),
    ];
    console.debug('updateMapFeatures: processing', allProducts.length, 'products (including selected)');
    allProducts.forEach(product => {
      if (!product.geom) return;
      try {
        let wktString = product.geom;
        if (wktString.startsWith('SRID=')) {
          wktString = wktString.split(';')[1];
        }
        const geometry = wktFormat.readGeometry(wktString, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        if (geometry.getType() === 'Polygon' || geometry.getType() === 'MultiPolygon') {
          console.debug('Rendering polygon for product', product.id, geometry.getType());
        }
        const feature = new Feature({
          geometry,
          productId: product.id,
          siteId: product.site_id,
          status: product.status,
          priority: product.priority,
          productType: product.product_type_name,
          teamName: product.team_name,
          assignedTo: product.assigned_to,
        });
        features.push(feature);
      } catch (err) {
        console.error(`Error parsing geometry for product ${product.id}:`, err, product.geom);
      }
    });
    vectorSource.addFeatures(features);
    console.debug('updateMapFeatures: added', features.length, 'features to vector source');
  };

  const createFeatureStyle = (feature: FeatureLike) => {
    const status = feature.get('status') as keyof typeof statusColors;
    const priority = feature.get('priority') as keyof typeof prioritySizes;
    const selected = selectedProducts.some((p: Product) => p.id === feature.get('productId'));

    // Status colors
    const statusColors: Record<string, string> = {
      pending: '#9e9e9e',
      in_progress: '#ff9800',
      in_review: '#2196f3',
      completed: '#4caf50',
      rejected: '#f44336',
      on_hold: '#795548',
    };

    // Priority sizes
    const prioritySizes: Record<string, number> = {
      low: 6,
      medium: 8,
      high: 10,
      critical: 12,
    };

    const color = statusColors[status] || '#9e9e9e';
    const size = prioritySizes[priority] || 8;

    // Style for polygons and points
    const geometry = feature.getGeometry?.();
    const geometryType = geometry?.getType?.();
    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      return new Style({
        stroke: new Stroke({
          color: selected ? '#ffffff' : color,
          width: selected ? 4 : 2,
        }),
        fill: new Fill({
          color: selected ? `${color}55` : `${color}22`, // Use status color with alpha
        }),
        text: showLabels ? new Text({
          text: feature.get('siteId'),
          offsetY: -15,
          fill: new Fill({ color: '#000000' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          font: '12px sans-serif',
        }) : undefined,
      });
    }

    // Points
    return new Style({
      image: new CircleStyle({
        radius: selected ? size + 2 : size,
        fill: new Fill({ color }),
        stroke: new Stroke({ 
          color: selected ? '#ffffff' : '#000000', 
          width: selected ? 3 : 1 
        }),
      }),
      text: showLabels ? new Text({
        text: feature.get('siteId'),
        offsetY: -15,
        fill: new Fill({ color: '#000000' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
        font: '12px sans-serif',
      }) : undefined,
    });
  };

  const handleBulkAction = async (action: string) => {
    if (selectedProductIds.length === 0) return;

    try {
      setLoading(true);
      
      switch (action) {
        case 'bulk_status_update':
          // Implementation for bulk status update
          break;
        case 'bulk_assign':
          // Implementation for bulk assignment
          break;
        case 'bulk_checkout':
          // Implementation for bulk checkout
          break;
        default:
          break;
      }
      
      // Refresh data after bulk action
      await fetchDashboardData();
      
      setMessage({
        text: `Bulk action "${action}" completed successfully`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Bulk action failed:', err);
      setMessage({
        text: 'Bulk action failed',
        severity: 'error',
      });
    } finally {
      setLoading(false);
      setBulkActionAnchor(null);
    }
  };

  const handleZoomToLocation = () => {
    if (!navigator.geolocation) {
      setMessage({
        text: 'Geolocation is not supported by your browser',
        severity: 'error',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstance.current) {
          mapInstance.current.getView().setCenter(fromLonLat([longitude, latitude]));
          mapInstance.current.getView().setZoom(12);
        }
      },
      (error) => {
        setMessage({
          text: `Failed to get location: ${error.message}`,
          severity: 'error',
        });
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'in_review': return 'info';
      case 'rejected': return 'error';
      case 'on_hold': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // DataGrid columns
  const columns: GridColDef[] = [
    { field: 'site_id', headerName: 'Site ID', flex: 1 },
    { field: 'item_id', headerName: 'Item ID', flex: 1 },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getStatusColor(params.value)}
          size="small"
        />
      )
    },
    { 
      field: 'priority', 
      headerName: 'Priority', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getPriorityColor(params.value)}
          size="small"
        />
      )
    },
    { field: 'product_type_name', headerName: 'Type', flex: 1 },
    { field: 'team_name', headerName: 'Team', flex: 1 },
    { field: 'assigned_to', headerName: 'Assigned To', flex: 1 },
    { 
      field: 'due_date', 
      headerName: 'Due Date', 
      flex: 1,
      renderCell: (params) => (
        params.value ? new Date(params.value).toLocaleDateString() : 'N/A'
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton size="small" onClick={() => navigate(`/products/${params.row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Start Review">
            <IconButton size="small" onClick={() => navigate(`/reviews/create/${params.row.id}`)}>
              <ReviewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Products Dashboard
        </Typography>
        
        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6">{stats.totalProducts}</Typography>
                <Typography variant="caption">Total Products</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6">{stats.activeProducts}</Typography>
                <Typography variant="caption">Active</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6">{stats.pendingReviews}</Typography>
                <Typography variant="caption">Pending Reviews</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6">{stats.myAssignments}</Typography>
                <Typography variant="caption">My Assignments</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6">{stats.overdueProducts}</Typography>
                <Typography variant="caption">Overdue</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6">{stats.completedThisWeek}</Typography>
                <Typography variant="caption">Completed This Week</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              endAdornment: searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon />
                </IconButton>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            color={Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f) ? 'primary' : 'inherit'}
          >
            Filters
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<LayersIcon />}
            onClick={() => setShowLayerControl(!showLayerControl)}
          >
            Layers
          </Button>
          
          {userRole === 'admin' || userRole === 'team_lead' ? (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/teams')}
            >
              Create Products
            </Button>
          ) : null}
        </Box>
      </Box>

      {loading && <LinearProgress />}

      {/* Filters Panel */}
      {showFilters && (
        <Accordion expanded={showFilters}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    multiple
                    value={filters.statusFilter}
                    onChange={(e) => setFilters({
                      ...filters,
                      statusFilter: e.target.value as string[]
                    })}
                    label="Status"
                  >
                    {['pending', 'in_progress', 'in_review', 'completed', 'rejected', 'on_hold'].map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    multiple
                    value={filters.priorityFilter}
                    onChange={(e) => setFilters({
                      ...filters,
                      priorityFilter: e.target.value as string[]
                    })}
                    label="Priority"
                  >
                    {['low', 'medium', 'high', 'critical'].map(priority => (
                      <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid>
                <FormControl fullWidth size="small">
                  <InputLabel>Team</InputLabel>
                  <Select
                    multiple
                    value={filters.teamFilter}
                    onChange={(e) => setFilters({
                      ...filters,
                      teamFilter: e.target.value as string[]
                    })}
                    label="Team"
                  >
                    {teams.map(team => (
                      <MenuItem key={team.id} value={team.id.toString()}>{team.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid>
                <FormControl fullWidth size="small">
                  <InputLabel>Product Type</InputLabel>
                  <Select
                    multiple
                    value={filters.productTypeFilter}
                    onChange={(e) => setFilters({
                      ...filters,
                      productTypeFilter: e.target.value as string[]
                    })}
                    label="Product Type"
                  >
                    {productTypes.map(type => (
                      <MenuItem key={type.id} value={type.id.toString()}>{type.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Layer Control */}
      {showLayerControl && (
        <Paper sx={{ p: 2, m: 2 }}>
          <Typography variant="h6" gutterBottom>Layer Control</Typography>
          <FormControl size="small" sx={{ mr: 2 }}>
            <InputLabel>Base Layer</InputLabel>
            <Select
              value={baseLayer}
              onChange={(e) => setBaseLayer(e.target.value as 'osm' | 'satellite')}
              label="Base Layer"
            >
              <MenuItem value="osm">OpenStreetMap</MenuItem>
              <MenuItem value="satellite">Satellite</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
            }
            label="Show Labels"
          />
        </Paper>
      )}

      {/* Map and Data Grid */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Map */}
        <Box sx={{ flex: showTable ? 0.6 : 1, position: 'relative' }}>
          <div
            ref={mapElement}
            style={{ 
              width: '100%', 
              height: '100%',
              cursor: 'crosshair'
            }}
          />
          {/* Map Popup Overlay */}
          <div ref={popupRef} style={{ position: 'absolute', zIndex: 1001 }}>
            {popupInfo && (
              <Paper sx={{ p: 2, minWidth: 220 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {popupInfo.product.site_id} ({popupInfo.product.status})
                </Typography>
                {/* Attribute Table */}
                <Table size="small">
                  <TableBody>
                    {Object.entries(popupInfo.product).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell sx={{ fontWeight: 600 }}>{key}</TableCell>
                        <TableCell>{String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button size="small" sx={{ mt: 1 }} onClick={() => setPopupInfo(null)}>Close</Button>
              </Paper>
            )}
          </div>
          
          {/* Map Controls */}
          <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Tooltip title="Zoom to My Location">
              <Fab size="small" onClick={handleZoomToLocation} sx={{ mb: 1 }}>
                <MyLocationIcon />
              </Fab>
            </Tooltip>
            <Tooltip title="Select by Box">
              <Fab size="small" color={selectionMode === 'box' ? 'primary' : 'default'} onClick={() => setSelectionMode(selectionMode === 'box' ? 'none' : 'box')} sx={{ mb: 1 }}>
                <CropSquareIcon />
              </Fab>
            </Tooltip>
            <Tooltip title="Select by Radius">
              <Fab size="small" color={selectionMode === 'radius' ? 'primary' : 'default'} onClick={() => setSelectionMode(selectionMode === 'radius' ? 'none' : 'radius')}>
                <RadioButtonCheckedIcon />
              </Fab>
            </Tooltip>
          </Box>
          
          {/* Selected Products Info */}
          {selectedProducts.length > 0 && (
            <Paper sx={{ position: 'absolute', top: 10, left: 10, p: 2, maxWidth: 300 }}>
              <Typography variant="h6" gutterBottom>
                Selected: {selectedProducts.length} product(s)
              </Typography>
              {selectedProducts.slice(0, 3).map(product => (
                <Box key={product.id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{product.site_id}</strong> - {product.status}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {product.product_type_name} • {product.team_name}
                  </Typography>
                </Box>
              ))}
              {selectedProducts.length > 3 && (
                <Typography variant="caption">
                  ...and {selectedProducts.length - 3} more
                </Typography>
              )}
              {/* Zoom to Selected Button */}
              <Button
                variant="contained"
                color="primary"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => {
                  if (!mapInstance.current || selectedProducts.length === 0) return;
                  const wktFormat = new WKT();
                  const extents: any[] = [];
                  selectedProducts.forEach(product => {
                    if (!product.geom) return;
                    let wktString = product.geom;
                    if (wktString.startsWith('SRID=')) {
                      wktString = wktString.split(';')[1];
                    }
                    try {
                      const geometry = wktFormat.readGeometry(wktString, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857',
                      });
                      extents.push(geometry.getExtent());
                    } catch (err) {
                      // ignore
                    }
                  });
                  if (extents.length > 0) {
                    // Combine all extents
                    let combined = extents[0].slice();
                    for (let i = 1; i < extents.length; i++) {
                      combined[0] = Math.min(combined[0], extents[i][0]);
                      combined[1] = Math.min(combined[1], extents[i][1]);
                      combined[2] = Math.max(combined[2], extents[i][2]);
                      combined[3] = Math.max(combined[3], extents[i][3]);
                    }
                    mapInstance.current.getView().fit(combined, {
                      padding: [50, 50, 50, 50],
                      maxZoom: 16,
                      duration: 500,
                    });
                  }
                }}
              >
                Zoom to Selected
              </Button>
            </Paper>
          )}
        </Box>

        {/* Data Grid */}
        {showTable && (
          <Box sx={{ flex: 0.4, borderTop: 1, borderColor: 'divider' }}>
            <DataGrid
              rows={Array.isArray(filteredProducts) ? filteredProducts : []}
              columns={columns}
              checkboxSelection
              onRowSelectionModelChange={setSelectedProductIds}
              rowSelectionModel={selectedProductIds}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 },
                },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': {
                  borderBottom: 'none',
                },
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                },
              }}
              onRowClick={(params) => {
                // Highlight the product on the map
                const product = params.row as Product;
                if (product.geom && mapInstance.current) {
                  // Find the corresponding feature and select it
                  const vectorSource = vectorLayerRef.current?.getSource();
                  if (vectorSource) {
                    const feature = vectorSource.getFeatures().find(f => f.get('productId') === product.id);
                    if (feature && selectInteractionRef.current) {
                      selectInteractionRef.current.getFeatures().clear();
                      selectInteractionRef.current.getFeatures().push(feature);
                    }
                  }
                }
              }}
            />
          </Box>
        )}
      </Box>

      {/* Bulk Actions Menu */}
      {userRole === 'admin' || userRole === 'team_lead' ? (
        <Menu
          anchorEl={bulkActionAnchor}
          open={Boolean(bulkActionAnchor)}
          onClose={() => setBulkActionAnchor(null)}
        >
          <MenuItem onClick={() => handleBulkAction('bulk_status_update')}>
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>Update Status</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('bulk_assign')}>
            <ListItemIcon><AssignmentIcon /></ListItemIcon>
            <ListItemText>Bulk Assign</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('bulk_checkout')}>
            <ListItemIcon><CheckCircleIcon /></ListItemIcon>
            <ListItemText>Bulk Checkout</ListItemText>
          </MenuItem>
        </Menu>
      ) : null}

      {/* Bulk Actions FAB */}
      {(userRole === 'admin' || userRole === 'team_lead') && selectedProductIds.length > 0 && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 20, right: 20 }}
          onClick={(e) => setBulkActionAnchor(e.currentTarget)}
        >
          <Badge badgeContent={selectedProductIds.length} color="secondary">
            <EditIcon />
          </Badge>
        </Fab>
      )}

      {/* Toggle Table Button */}
      <Fab
        size="small"
        color="secondary"
        sx={{ position: 'fixed', bottom: 20, left: 20 }}
        onClick={() => setShowTable(!showTable)}
      >
        {showTable ? <ExpandMoreIcon /> : <AccountTreeIcon />}
      </Fab>

      {/* Messages */}
      {message && (
        <Alert
          severity={message.severity}
          sx={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}
    </Box>
  );
};

export default Dashboard;