// src/components/DegreeGridLayer.tsx
import { useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Stroke, Fill, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import Map from 'ol/Map';
import { 
  getDegreeGridCells, 
  DegreeGridCell, 
  formatDegreeGridCellId,
  DegreeGridBounds 
} from '../utils/degreeGridUtils';

interface DegreeGridLayerProps {
  map: Map;
  gridSize: number; // Grid size in degrees (e.g., 1.0, 0.5)
  visible: boolean;
  onCellClick?: (cellId: string, cell: DegreeGridCell) => void;
  selectedCellId?: string;
}

export const useDegreeGridLayer = ({
  map,
  gridSize,
  visible,
  onCellClick,
  selectedCellId
}: DegreeGridLayerProps) => {
  const layerRef = useRef<VectorLayer | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);
  const currentGridSizeRef = useRef<number>(gridSize);
  const currentCellsRef = useRef<DegreeGridCell[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize layer
  useEffect(() => {
    if (!map) return;

    // Create vector source and layer for degree grid
    const source = new VectorSource();
    const layer = new VectorLayer({
      source,
      style: (feature) => {
        const cellId = feature.get('cellId');
        const isSelected = cellId === selectedCellId;
        
        const style = new Style({
          stroke: new Stroke({
            color: isSelected ? '#ff0000' : '#00aa00',
            width: isSelected ? 3 : 2,
            lineDash: isSelected ? [] : [5, 5]
          }),
          fill: new Fill({
            color: isSelected ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 170, 0, 0.05)'
          }),
          text: new Text({
            text: formatDegreeGridCellId(cellId || ''),
            font: '11px Arial',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
            offsetY: 0
          })
        });
        
        return style;
      },
      visible,
      zIndex: 999 // Slightly below S2 grid
    });

    layerRef.current = layer;
    sourceRef.current = source;
    
    // Add degree grid layer to map
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
        
        // Handle degree grid cell click
        
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
      // Update degree grid layer visibility
      
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

  // Update grid when gridSize changes or map moves
  useEffect(() => {
    // Update grid when size changes or map moves
    
    if (!map || !layerRef.current || !sourceRef.current || !visible) {
      // Skip update - missing requirements
      return;
    }

    const updateGrid = () => {
      try {
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const zoom = view.getZoom() || 4;
        
        // Always update when view changes or grid size changes
        const gridSizeChanged = gridSize !== currentGridSizeRef.current;
        
        // Update grid size if changed
        currentGridSizeRef.current = gridSize;
        
        // Convert extent to lat/lng bounds
        const [minX, minY, maxX, maxY] = extent;
        const [minLng, minLat] = toLonLat([minX, minY]);
        const [maxLng, maxLat] = toLonLat([maxX, maxY]);
        
        // Clear existing features
        sourceRef.current!.clear();
        
        // Generate degree grid cells
        const bounds: DegreeGridBounds = {
          north: maxLat,
          south: minLat,
          east: maxLng,
          west: minLng
        };
        
        const degreeCells = getDegreeGridCells(bounds, gridSize);
        
        // Add each degree cell as a feature
        degreeCells.forEach((cell) => {
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
            gridSize: cell.gridSize
          });
          
          sourceRef.current!.addFeature(feature);
        });
        
        // Update current cells reference
        currentCellsRef.current = degreeCells;
        
        // Add degree grid cells to layer
        
        // Force layer redraw
        sourceRef.current!.changed();
        layerRef.current!.changed();
        
      } catch (error) {
        console.error('Error updating degree grid:', error);
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
  }, [map, gridSize, visible]);

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
    currentGridSize: currentGridSizeRef.current,
    cellCount: currentCellsRef.current.length
  };
};