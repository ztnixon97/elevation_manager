// src/components/PrecomputedS2GridLayer.tsx
import { useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Stroke, Fill, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import Map from 'ol/Map';
import { 
  getPrecomputedS2Cells, 
  PrecomputedS2Cell, 
  formatPrecomputedS2CellId,
  PrecomputedS2GridBounds 
} from '../utils/precomputedS2Utils';

interface PrecomputedS2GridLayerProps {
  map: Map;
  level: number; // S2 level (1-10)
  visible: boolean;
  onCellClick?: (cellId: string, cell: PrecomputedS2Cell) => void;
  selectedCellId?: string;
}

export const usePrecomputedS2GridLayer = ({
  map,
  level,
  visible,
  onCellClick,
  selectedCellId
}: PrecomputedS2GridLayerProps) => {
  const layerRef = useRef<VectorLayer | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);
  const currentLevelRef = useRef<number>(level);
  const currentCellsRef = useRef<PrecomputedS2Cell[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize layer
  useEffect(() => {
    if (!map) return;

    // Create vector source and layer for precomputed S2 grid
    const source = new VectorSource();
    const layer = new VectorLayer({
      source,
      style: (feature) => {
        const cellId = feature.get('cellId');
        const isSelected = cellId === selectedCellId;
        
        const style = new Style({
          stroke: new Stroke({
            color: isSelected ? '#ff0000' : '#0066cc',
            width: isSelected ? 3 : 2,
            lineDash: isSelected ? [] : [3, 3]
          }),
          fill: new Fill({
            color: isSelected ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 102, 204, 0.08)'
          }),
          text: new Text({
            text: formatPrecomputedS2CellId(cellId || ''),
            font: '10px Arial',
            fill: new Fill({ color: '#003d82' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
            offsetY: 0
          })
        });
        
        return style;
      },
      visible,
      zIndex: 1001 // Above degree grid, below selection
    });

    layerRef.current = layer;
    sourceRef.current = source;
    
    // Add precomputed S2 grid layer to map
    map.addLayer(layer);

    // Add click handler for cell selection
    const handleMapClick = (evt: any) => {
      if (!visible || !onCellClick) return;

      const features = map.getFeaturesAtPixel(evt.pixel, {
        layerFilter: (l) => l === layer
      });

      if (features && features.length > 0) {
        const feature = features[0];
        const cellId = feature.get('cellId');
        const cellData = feature.get('cellData');
        
        // Handle S2 cell click
        
        if (cellId && cellData) {
          onCellClick(cellId, cellData);
        }
      }
    };

    map.on('singleclick', handleMapClick);

    return () => {
      map.removeLayer(layer);
      map.un('singleclick', handleMapClick);
    };
  }, [map, visible, onCellClick]);

  // Update layer visibility
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible);
      // Update precomputed S2 grid layer visibility
      
      // Force grid update when visibility changes to visible
      if (visible && map && sourceRef.current) {
        // Force grid update when layer becomes visible
        setTimeout(() => {
          const view = map.getView();
          if (view) {
            view.dispatchEvent('change:center');
          }
        }, 100);
      }
    }
  }, [visible, map]);

  // Update grid when level changes or map moves
  useEffect(() => {
    // Update grid when level changes or map moves
    
    if (!map || !layerRef.current || !sourceRef.current || !visible) {
      // Skip update - missing requirements
      return;
    }

    const updateGrid = () => {
      try {
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const zoom = view.getZoom() || 4;
        
        // Always update when view changes or level changes
        const levelChanged = level !== currentLevelRef.current;
        
        // Update grid level if changed
        currentLevelRef.current = level;
        
        // Convert extent to lat/lng bounds
        const [minX, minY, maxX, maxY] = extent;
        const [minLng, minLat] = toLonLat([minX, minY]);
        const [maxLng, maxLat] = toLonLat([maxX, maxY]);
        
        // Clear existing features
        sourceRef.current!.clear();
        
        // Generate precomputed S2 cells
        const bounds: PrecomputedS2GridBounds = {
          north: maxLat,
          south: minLat,
          east: maxLng,
          west: minLng
        };
        
        const s2Cells = getPrecomputedS2Cells(bounds, level);
        
        // Add each S2 cell as a feature
        s2Cells.forEach((cell) => {
          const { bounds: cellBounds } = cell;
          
          // Create cell in map projection coordinates
          const coords = [
            fromLonLat([cellBounds.west, cellBounds.south]),
            fromLonLat([cellBounds.east, cellBounds.south]),
            fromLonLat([cellBounds.east, cellBounds.north]),
            fromLonLat([cellBounds.west, cellBounds.north]),
            fromLonLat([cellBounds.west, cellBounds.south])
          ];
          
          const polygon = new Polygon([coords]);
          
          const feature = new Feature({
            geometry: polygon,
            cellId: cell.id,
            cellData: cell,
            level: cell.level
          });
          
          sourceRef.current!.addFeature(feature);
        });
        
        // Update current cells reference
        currentCellsRef.current = s2Cells;
        
        // Add S2 cells to layer
        
        // Force layer redraw
        sourceRef.current!.changed();
        layerRef.current!.changed();
        
      } catch (error) {
        console.error('Error updating precomputed S2 grid:', error);
        // Clear the grid on error to prevent broken state
        if (sourceRef.current) {
          sourceRef.current.clear();
        }
      }
    };

    // Update grid immediately
    updateGrid();

    // Update grid when map view changes
    const viewChangeHandler = () => {
      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Debounce the update to avoid too frequent updates
      updateTimeoutRef.current = setTimeout(updateGrid, 300);
    };

    // Listen to view changes for better responsiveness
    map.getView().on('change:center', viewChangeHandler);
    map.getView().on('change:resolution', viewChangeHandler);
    map.on('moveend', viewChangeHandler);

    return () => {
      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      map.getView().un('change:center', viewChangeHandler);
      map.getView().un('change:resolution', viewChangeHandler);
      map.un('moveend', viewChangeHandler);
    };
  }, [map, level, visible]);

  // Update selected cell styling
  useEffect(() => {
    if (!sourceRef.current) return;
    
    // Force re-render of features to update selection styling
    sourceRef.current.getFeatures().forEach(feature => {
      feature.changed();
    });
  }, [selectedCellId]);

  return {
    layer: layerRef.current,
    source: sourceRef.current,
    currentLevel: currentLevelRef.current,
    cellCount: currentCellsRef.current.length
  };
};