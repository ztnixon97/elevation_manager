// src/utils/degreeGridUtils.ts
// WGS84 degree grid utilities for regular lat/lng grids

export interface DegreeGridCell {
  id: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    lat: number;
    lng: number;
  };
  gridSize: number; // Grid size in degrees
}

export interface DegreeGridBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Generate degree-based grid cells for WGS84
 */
export function getDegreeGridCells(bounds: DegreeGridBounds, gridSize: number): DegreeGridCell[] {
  const cells: DegreeGridCell[] = [];
  
  console.log(`Generating ${gridSize}° x ${gridSize}° degree grid for bounds:`, bounds);
  
  // Calculate grid boundaries aligned to grid size
  const minLat = Math.floor(bounds.south / gridSize) * gridSize;
  const maxLat = Math.ceil(bounds.north / gridSize) * gridSize;
  const minLng = Math.floor(bounds.west / gridSize) * gridSize;
  const maxLng = Math.ceil(bounds.east / gridSize) * gridSize;
  
  console.log(`Grid aligned bounds: ${minLat}-${maxLat}°N, ${minLng}-${maxLng}°E`);
  
  // Generate grid cells
  for (let lat = minLat; lat < maxLat; lat += gridSize) {
    for (let lng = minLng; lng < maxLng; lng += gridSize) {
      const south = lat;
      const north = lat + gridSize;
      const west = lng;
      const east = lng + gridSize;
      
      // Check if this cell intersects with the requested bounds
      const overlaps = !(
        north <= bounds.south ||
        south >= bounds.north ||
        east <= bounds.west ||
        west >= bounds.east
      );
      
      if (overlaps) {
        const cellId = `deg_${gridSize}_${lat}_${lng}`;
        
        cells.push({
          id: cellId,
          bounds: { north, south, east, west },
          center: {
            lat: south + gridSize / 2,
            lng: west + gridSize / 2
          },
          gridSize
        });
      }
    }
  }
  
  console.log(`Generated ${cells.length} degree grid cells (${gridSize}° x ${gridSize}°)`);
  return cells;
}

/**
 * Get available degree grid sizes
 */
export function getAvailableDegreeGridSizes(): { value: number; label: string }[] {
  return [
    { value: 1.0, label: '1° x 1°' },
    { value: 0.5, label: '0.5° x 0.5°' },
    { value: 0.25, label: '0.25° x 0.25°' },
    { value: 0.1, label: '0.1° x 0.1°' },
  ];
}

/**
 * Convert degree grid cell to GeoJSON polygon
 */
export function degreeGridCellToGeoJSON(cell: DegreeGridCell): any {
  const { bounds } = cell;
  
  return {
    type: 'Feature',
    properties: {
      cellId: cell.id,
      gridSize: cell.gridSize,
      center: cell.center
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [bounds.west, bounds.south],
        [bounds.east, bounds.south],
        [bounds.east, bounds.north],
        [bounds.west, bounds.north],
        [bounds.west, bounds.south]
      ]]
    }
  };
}

/**
 * Format degree grid cell ID for display
 */
export function formatDegreeGridCellId(cellId: string): string {
  const parts = cellId.split('_');
  if (parts.length >= 4) {
    const gridSize = parts[1];
    const lat = parts[2];
    const lng = parts[3];
    return `${gridSize}° grid: ${lat}°N, ${lng}°E`;
  }
  return cellId;
}