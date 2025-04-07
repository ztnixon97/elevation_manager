// src/pages/TeamDashboard/components/TeamMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Box, CircularProgress, Typography } from '@mui/material';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Circle, Fill, Stroke, Text } from 'ol/style';

interface TeamMapProps {
  teamId: number;
}

interface Product {
  id: number;
  site_id: string;
  status: string;
  geom?: string;
}

const TeamMap: React.FC<TeamMapProps> = ({ teamId }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Initialize map
    if (!mapRef.current) return;

    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2,
      }),
    });

    setMap(initialMap);

    // Fetch team products
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await invoke<string>('get_team_products', { team_id:  teamId });
        const data = JSON.parse(response);
        if (data.data && data.data.products) {
          setProducts(data.data.products);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
        setError(typeof err === 'string' ? err : 'Failed to load product data');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      if (initialMap) {
        initialMap.setTarget(undefined);
      }
    };
  }, [teamId]);

  useEffect(() => {
    // Add product features to map
    if (!map || products.length === 0) return;

    const vectorSource = new VectorSource();
    
    // Process products with geometry
    products.forEach(product => {
      if (!product.geom) return;
      
      try {
        // Extract coordinates from geometry
        // This is simplified - you'll need to properly parse your geometry format
        const geomStr = product.geom;
        let coords;
        
        if (geomStr.startsWith('POINT')) {
          // Parse POINT(lon lat) format
          const match = geomStr.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (match) {
            coords = [parseFloat(match[1]), parseFloat(match[2])];
          }
        } else if (geomStr.startsWith('SRID=')) {
          // Parse SRID=4326;POINT(lon lat) format
          const match = geomStr.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (match) {
            coords = [parseFloat(match[1]), parseFloat(match[2])];
          }
        }
        
        if (coords) {
          const feature = new Feature({
            geometry: new Point(fromLonLat(coords)),
            name: product.site_id,
            status: product.status,
            id: product.id
          });
          
          const statusColor = getStatusColor(product.status);
          
          feature.setStyle(new Style({
            image: new Circle({
              radius: 8,
              fill: new Fill({ color: statusColor }),
              stroke: new Stroke({ color: 'white', width: 2 })
            }),
            text: new Text({
              text: product.site_id,
              offsetY: -15,
              fill: new Fill({ color: '#333' }),
              stroke: new Stroke({ color: 'white', width: 3 })
            })
          }));
          
          vectorSource.addFeature(feature);
        }
      } catch (err) {
        console.error('Error parsing geometry:', err);
      }
    });
    
    const vectorLayer = new VectorLayer({
      source: vectorSource
    });
    
    map.addLayer(vectorLayer);
    
    // Zoom to features if we have any
    if (vectorSource.getFeatures().length > 0) {
      const extent = vectorSource.getExtent();
      map.getView().fit(extent, { 
        padding: [50, 50, 50, 50], 
        maxZoom: 12 
      });
    }
    
    return () => {
      map.removeLayer(vectorLayer);
    };
  }, [map, products]);

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return 'rgba(0, 128, 0, 0.7)'; // Green
      case 'in_progress': return 'rgba(255, 165, 0, 0.7)'; // Orange
      case 'pending': return 'rgba(0, 0, 255, 0.7)'; // Blue
      case 'rejected': return 'rgba(255, 0, 0, 0.7)'; // Red
      default: return 'rgba(128, 128, 128, 0.7)'; // Gray
    }
  };

  return (
    <Box sx={{ width: '100%', height: '50vh', position: 'relative' }}>
      {loading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.7)',
          zIndex: 10
        }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

export default TeamMap;