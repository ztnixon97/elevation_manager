// src/utils/precomputedS2Utils.ts
// Precomputed S2 grid system that works like degree grids

export interface PrecomputedS2Cell {
  id: string;
  level: number;
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
}

export interface PrecomputedS2GridBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Generate precomputed S2-like cells for a given bounding box and level
 * This creates a regular grid that mimics S2 behavior but is precomputed
 */
export function getPrecomputedS2Cells(bounds: PrecomputedS2GridBounds, level: number): PrecomputedS2Cell[] {
  const cells: PrecomputedS2Cell[] = [];
  
  console.log(`Generating precomputed S2-like grid at level ${level} for bounds:`, bounds);
  
  // Calculate grid resolution based on level
  // Each level approximately doubles the resolution
  const baseResolution = 4; // Base number of cells per dimension at level 1
  const cellsPerSide = baseResolution * Math.pow(2, Math.max(0, level - 1));
  
  // Calculate the actual cell size in degrees
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  
  // Calculate how many cells fit in this view
  const latCells = Math.ceil(latSpan / (180 / cellsPerSide));
  const lngCells = Math.ceil(lngSpan / (360 / cellsPerSide));
  
  // Limit cells to prevent performance issues
  const maxCells = 100;
  const effectiveLatCells = Math.min(latCells, Math.sqrt(maxCells));
  const effectiveLngCells = Math.min(lngCells, Math.sqrt(maxCells));
  
  const cellLatSize = latSpan / effectiveLatCells;
  const cellLngSize = lngSpan / effectiveLngCells;
  
  console.log(`Creating ${effectiveLatCells}x${effectiveLngCells} S2-like grid (level ${level})`);
  console.log(`Cell size: ${cellLatSize.toFixed(4)}° x ${cellLngSize.toFixed(4)}°`);
  
  // Generate grid cells aligned to S2-like boundaries
  for (let i = 0; i < effectiveLatCells; i++) {
    for (let j = 0; j < effectiveLngCells; j++) {
      const south = bounds.south + (i * cellLatSize);
      const north = south + cellLatSize;
      const west = bounds.west + (j * cellLngSize);
      const east = west + cellLngSize;
      
      // Create S2-style cell ID
      const cellId = `s2_${level}_${i}_${j}`;
      
      cells.push({
        id: cellId,
        level,
        bounds: { north, south, east, west },
        center: {
          lat: south + cellLatSize / 2,
          lng: west + cellLngSize / 2
        }
      });
    }
  }
  
  console.log(`Generated ${cells.length} precomputed S2-like cells at level ${level}`);
  return cells;
}

/**
 * Get available S2 levels for selection
 */
export function getAvailableS2Levels(): { value: number; label: string }[] {
  return [
    { value: 1, label: 'Level 1 (Large cells)' },
    { value: 2, label: 'Level 2' },
    { value: 3, label: 'Level 3' },
    { value: 4, label: 'Level 4' },
    { value: 5, label: 'Level 5' },
    { value: 6, label: 'Level 6' },
    { value: 7, label: 'Level 7' },
    { value: 8, label: 'Level 8' },
    { value: 9, label: 'Level 9' },
    { value: 10, label: 'Level 10 (Small cells)' },
  ];
}

/**
 * Convert precomputed S2 cell to GeoJSON polygon
 */
export function precomputedS2CellToGeoJSON(cell: PrecomputedS2Cell): any {
  const { bounds } = cell;
  
  return {
    type: 'Feature',
    properties: {
      cellId: cell.id,
      level: cell.level,
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
 * Format precomputed S2 cell ID for display
 */
export function formatPrecomputedS2CellId(cellId: string): string {
  const parts = cellId.split('_');
  if (parts.length >= 4) {
    const level = parts[1];
    const i = parts[2];
    const j = parts[3];
    return `S2 L${level}: [${i},${j}]`;
  }
  return cellId;
}

/**
 * Calculate approximate S2 cell size for a given level
 */
export function getS2CellSizeAtLevel(level: number): string {
  const baseSize = 45; // Approximate degrees at level 1
  const size = baseSize / Math.pow(2, level - 1);
  
  if (size >= 1) {
    return `~${size.toFixed(1)}°`;
  } else if (size >= 0.1) {
    return `~${size.toFixed(2)}°`;
  } else {
    return `~${(size * 60).toFixed(1)}'`; // Show in minutes
  }
}