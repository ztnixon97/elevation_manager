// src/components/S2GridLayer.tsx
import { useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Stroke, Fill, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import Map from 'ol/Map';
import { Extent } from 'ol/extent';
import { 
  getS2CellsInBounds, 
  S2CellId, 
  s2CellToGeoJSON,
  getS2LevelForZoom,
  S2GridBounds 
} from '../utils/s2Utils';

interface S2GridLayerProps {
  map: Map;
  level: number;
  visible: boolean;
  onCellClick?: (cellId: string, cell: S2CellId) => void;
  selectedCellId?: string;
  autoLevel?: boolean; // Automatically adjust level based on zoom
}

export const useS2GridLayer = ({
  map,
  level,
  visible,
  onCellClick,
  selectedCellId,
  autoLevel = false
}: S2GridLayerProps) => {
  const layerRef = useRef<VectorLayer | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);
  const currentLevelRef = useRef<number>(level);
  const currentCellsRef = useRef<S2CellId[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize layer
  useEffect(() => {
    if (!map) return;

    // Create vector source and layer for S2 grid
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
            lineDash: isSelected ? [] : [5, 5]
          }),
          fill: new Fill({
            color: isSelected ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 102, 204, 0.1)'
          }),
          text: new Text({
            text: cellId ? cellId.substring(0, 6) + '...' : 'S2',
            font: '11px Arial',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
            offsetY: 0
          })
        });
        
        return style;
      },
      visible,
      zIndex: 1000
    });

    layerRef.current = layer;
    sourceRef.current = source;
    
    console.log('Adding S2 layer to map, visible:', visible);
    map.addLayer(layer);
    layer.setZIndex(1000);

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
        
        console.log('S2 cell clicked:', cellId);
        
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
      console.log(`S2 layer visibility set to: ${visible}`);
      
      // Force grid update when visibility changes to visible
      if (visible && map && sourceRef.current) {
        console.log('Forcing S2 grid update because layer became visible');
        setTimeout(() => {
          // Trigger a grid update when made visible
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
    console.log('S2 grid update effect triggered:', { 
      map: !!map, 
      layer: !!layerRef.current, 
      source: !!sourceRef.current, 
      visible 
    });
    
    if (!map || !layerRef.current || !sourceRef.current || !visible) {
      console.log('S2 grid update skipped - missing requirements');
      return;
    }

    const updateGrid = () => {
      try {
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const zoom = view.getZoom() || 4;
        
        // Use the specified level, ignore autoLevel for S2 grids
        const gridLevel = level;
        
        // Skip update for very high levels that could cause performance issues
        if (gridLevel > 15) {
          console.warn(`S2 level ${gridLevel} is too high for real-time rendering. Skipping grid update.`);
          return;
        }
        
        // Always update when view changes to show correct cells for current view
        // But always use the same S2 level (don't auto-adjust based on zoom)
        const levelChanged = gridLevel !== currentLevelRef.current;
        
        if (levelChanged) {
          console.log(`S2 grid level changed: ${currentLevelRef.current} -> ${gridLevel}`);
        }
        
        console.log(`S2 grid updating to level ${gridLevel} (zoom: ${zoom})`);
        currentLevelRef.current = gridLevel;
        
        // Convert extent to lat/lng bounds
        const [minX, minY, maxX, maxY] = extent;
        const [minLng, minLat] = toLonLat([minX, minY]);
        const [maxLng, maxLat] = toLonLat([maxX, maxY]);
        
        // Clear existing features
        sourceRef.current!.clear();
        
        // Use real S2 algorithm to generate grid cells
        const bounds: S2GridBounds = {
          north: maxLat,
          south: minLat,
          east: maxLng,
          west: minLng
        };
        
        // Get S2 cells for the current view bounds (with timeout protection)
        const startTime = performance.now();
        console.log(`Generating S2 cells for bounds:`, bounds, `at level ${gridLevel}`);
        
        const s2Cells = getS2CellsInBounds(bounds, gridLevel);
        const endTime = performance.now();
        
        console.log(`S2 cell generation took ${(endTime - startTime).toFixed(2)}ms for ${s2Cells.length} cells`);
        
        if (s2Cells.length === 0) {
          console.warn('No S2 cells generated! Check algorithm implementation.');
        } else {
          console.log('Sample S2 cell:', s2Cells[0]);
        }
        
        // Limit the number of cells to prevent UI freezing
        const maxCells = 200;
        const cellsToRender = s2Cells.slice(0, maxCells);
        
        if (s2Cells.length > maxCells) {
          console.warn(`Limiting S2 grid display to ${maxCells} cells (found ${s2Cells.length})`);
        }
        
        // Add each S2 cell as a feature
        cellsToRender.forEach((cell) => {
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
        currentCellsRef.current = cellsToRender;
        
        console.log(`Added ${sourceRef.current!.getFeatures().length} S2 grid cells to layer`);
        
        // Force layer redraw
        sourceRef.current!.changed();
        layerRef.current!.changed();
        
      } catch (error) {
        console.error(`Error updating S2 grid:`, error);
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

    // Listen to both center and resolution changes for better responsiveness
    map.getView().on('change:center', viewChangeHandler);
    map.getView().on('change:resolution', viewChangeHandler);
    
    // Also listen to moveend for when user stops dragging/zooming
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
  }, [map, level, visible, autoLevel]);

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