// src/pages/ProductDetailPage.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  Card,
  CardContent,
} from '@mui/material';

// Import all OpenLayers dependencies
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import { fromLonLat } from 'ol/proj';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import WKT from 'ol/format/WKT';

import { format, parseISO } from 'date-fns';

interface ProductDetails {
  id: number;
  site_id: string;
  item_id: string;
  status: string;
  product_type_id: number;
  product_type_name?: string;
  team_id?: number;
  team_name?: string;
  geom?: string; // EWKT WKT string
  classification?: string;
  acceptance_date?: string;
  publish_date?: string;
  created_at: string;
  updated_at: string;
}

interface Review {
  id: number;
  product_id: number;
  reviewer_id: number;
  reviewer_name?: string;
  review_status: string;
  product_status: string;
  created_at: string;
  updated_at: string;
  content?: string;
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);

  // DOM element for the map
  const mapElement = useRef<HTMLDivElement>(null);
  
  // Fetch product details & reviews
  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const response = await invoke<string | object>('get_product_details', {
          product_id: parseInt(productId!, 10),
        });
        const data = typeof response === 'string' ? JSON.parse(response) : response;

        if (data.success && data.data) {
          console.log("Product data:", data.data);
          setProduct({
            ...data.data.product,
            product_type_name: data.data.product_type?.name || 'Unknown',
            team_name: data.data.team?.name || 'Not assigned',
          });
        } else {
          throw new Error(data.message || 'Failed to load product details');
        }

        const reviewsResponse = await invoke<string | object>('get_product_reviews', {
          product_id: parseInt(productId!, 10),
        });
        const reviewsData = typeof reviewsResponse === 'string' ? JSON.parse(reviewsResponse) : reviewsResponse;

        if (reviewsData.success && reviewsData.data) {
          setReviews(reviewsData.data);
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        setError(typeof err === 'string' ? err : 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);
  
  // Initialize the map after render when data is available
  const initializeMap = useCallback(() => {
    if (!mapElement.current || !product || !product.geom) {
      console.log("Cannot initialize map:", {
        mapElement: !!mapElement.current,
        product: !!product,
        geometry: product?.geom
      });
      return;
    }
    
    console.log('Initializing map with geometry:', product.geom);
    
    // Default center point (USA center)
    let coords: [number, number] = [-98.5, 39.8]; 
    let zoom = 10;
    
    try {
      // Create a WKT format parser for OpenLayers
      const wktFormat = new WKT();
      
      // Remove SRID prefix if present
      let wktString = product.geom;
      if (wktString.startsWith('SRID=')) {
        wktString = wktString.split(';')[1];
      }
      
      // Parse the geometry using OpenLayers WKT parser
      const geometry = wktFormat.readGeometry(wktString, {
        dataProjection: 'EPSG:4326',      // WGS84 (standard GPS)
        featureProjection: 'EPSG:3857'    // Web Mercator projection
      });
      
      // Create a feature with the geometry
      const feature = new Feature({ geometry });
      
      // Create vector source and layer
      const vectorSource = new VectorSource({
        features: [feature]
      });
      
      // Different styling based on geometry type
      if (wktString.toUpperCase().includes('POINT')) {
        // Style for point
        feature.setStyle(new Style({
          image: new CircleStyle({
            radius: 10,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({ color: 'white', width: 2 })
          })
        }));
        
        // Set center to the point coordinates
        const point = geometry as Point;
        coords = [point.getCoordinates()[0], point.getCoordinates()[1]];
      } 
      else if (wktString.toUpperCase().includes('POLYGON')) {
        // Style for polygon
        feature.setStyle(new Style({
          stroke: new Stroke({
            color: 'red',
            width: 3
          }),
          fill: new Fill({
            color: 'rgba(255, 0, 0, 0.2)'
          })
        }));
        
        // For polygons, get the center of the extent
        const extent = geometry.getExtent();
        const centerX = (extent[0] + extent[2]) / 2;
        const centerY = (extent[1] + extent[3]) / 2;
        coords = [centerX, centerY];
        
        // Adjust zoom to fit the polygon
        zoom = 12;
      }
      
      // Remove any previous map instance by clearing the container
      if (mapElement.current.hasChildNodes()) {
        while (mapElement.current.firstChild) {
          mapElement.current.removeChild(mapElement.current.firstChild);
        }
      }
      
      // Create vector layer with the feature
      const vectorLayer = new VectorLayer({
        source: vectorSource
      });
      
      // Create OSM base layer
      const osmLayer = new TileLayer({
        source: new OSM()
      });
      
      // Create and render map
      const map = new Map({
        layers: [osmLayer, vectorLayer],
        view: new View({
          center: coords,
          zoom: zoom
        })
      });
      
      // Target the DOM element
      map.setTarget(mapElement.current);
      
      // Ensure size is updated
      setTimeout(() => {
        map.updateSize();
        
        // Fit view to feature extent
        const extent = vectorSource.getExtent();
        if (extent && !isNaN(extent[0]) && !isNaN(extent[1])) {
          map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            maxZoom: 16
          });
        }
        
        console.log('Map size updated and fitted to geometry');
      }, 200);
      
    } catch (e) {
      console.error('Error creating map:', e);
      setMapError(`Failed to create map: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [product]);
  
  // Call initialize map when product changes and after DOM update
  useEffect(() => {
    if (product && !loading) {
      // Use requestAnimationFrame to ensure DOM is ready
      window.requestAnimationFrame(() => {
        initializeMap();
      });
    }
  }, [product, loading, initializeMap]);
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateReview = () => {
    if (!product) return;
    navigate(`/reviews/${product.id}`);
  };

  const handleViewReview = (reviewId: number) => {
    navigate(`/reviews/${reviewId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={4}>
        <Alert severity="error">{error || 'Product not found'}</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/products')}>
          Back to Products
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">
          {product?.site_id}
          <Chip
            label={product?.status}
            color={
              product?.status === 'completed'
                ? 'success'
                : product?.status === 'in_progress'
                ? 'warning'
                : product?.status === 'pending'
                ? 'info'
                : 'default'
            }
            sx={{ ml: 2 }}
          />
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mb: 3, flexGrow: 0 }}>
        {/* Product Info */}
        <Paper sx={{ p: 3, width: { xs: '100%', md: '40%' }, mb: { xs: 2, md: 0 }, mr: { md: 2 } }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Product Information
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Site ID</Typography>
            <Typography variant="body1">{product.site_id}</Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Item ID</Typography>
            <Typography variant="body1">{product.item_id || 'N/A'}</Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Product Type</Typography>
            <Typography variant="body1">{product.product_type_name}</Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Team</Typography>
            <Typography variant="body1">{product.team_name}</Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
            <Chip size="small" label={product.status} />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Classification</Typography>
            <Typography variant="body1">{product.classification || 'N/A'}</Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Acceptance Date</Typography>
            <Typography variant="body1">
              {product.acceptance_date
                ? format(parseISO(product.acceptance_date), 'MMM d, yyyy')
                : 'N/A'}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Publish Date</Typography>
            <Typography variant="body1">
              {product.publish_date
                ? format(parseISO(product.publish_date), 'MMM d, yyyy')
                : 'N/A'}
            </Typography>
          </Box>
        </Paper>

        {/* Map Container */}
        <Paper sx={{ p: 3, width: { xs: '100%', md: '60%' }, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Location
          </Typography>
          {mapError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {mapError}
            </Alert>
          )}
          <div 
            ref={mapElement} 
            style={{ 
              width: '100%',
              height: '400px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </Paper>
      </Box>

      {/* Tabs Section */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Reviews" />
            <Tab label="Metadata" />
            <Tab label="History" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
          {activeTab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Product Reviews</Typography>
                <Button variant="contained" onClick={handleCreateReview}>
                  Create Review
                </Button>
              </Box>

              {reviews.length === 0 ? (
                <Typography color="text.secondary">
                  No reviews found for this product.
                </Typography>
              ) : (
                <List>
                  {reviews.map((review) => (
                    <Card key={review.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1">
                            Review #{review.id}
                            <Chip
                              size="small"
                              label={review.review_status}
                              color={
                                review.review_status === 'approved'
                                  ? 'success'
                                  : review.review_status === 'rejected'
                                  ? 'error'
                                  : review.review_status === 'pending'
                                  ? 'warning'
                                  : 'default'
                              }
                              sx={{ ml: 1 }}
                            />
                          </Typography>
                          <Typography variant="caption">
                            {format(parseISO(review.created_at), 'MMM d, yyyy')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {review.content
                            ? review.content.substring(0, 150) +
                              (review.content.length > 150 ? '...' : '')
                            : 'No content available'}
                        </Typography>
                        <Button
                          size="small"
                          sx={{ mt: 1 }}
                          onClick={() => handleViewReview(review.id)}
                        >
                          View Full Review
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </List>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Product Metadata
              </Typography>
              <pre>{JSON.stringify(product, null, 2)}</pre>
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Product History
              </Typography>
              <Typography color="text.secondary">
                Product created on {format(parseISO(product.created_at), 'MMM d, yyyy')}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ProductDetailPage;
