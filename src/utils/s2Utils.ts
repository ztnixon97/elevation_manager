// src/utils/s2Utils.ts
// S2 Geometry utilities for grid cell calculation

export interface S2CellId {
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

export interface S2GridBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Calculate S2 cell ID from latitude and longitude
 * Simplified but working S2 implementation
 */
export function latLngToS2CellId(lat: number, lng: number, level: number): string {
  // Normalize coordinates
  const normalizedLat = Math.max(-85, Math.min(85, lat)); // Avoid poles for stability
  const normalizedLng = ((lng + 180) % 360) - 180;
  
  // Simple face determination based on hemisphere and longitude
  let face = 0;
  if (normalizedLat > 45) face = 1; // North pole region
  else if (normalizedLat < -45) face = 4; // South pole region
  else {
    // Equatorial band faces based on longitude
    if (normalizedLng >= -45 && normalizedLng < 45) face = 0;
    else if (normalizedLng >= 45 && normalizedLng < 135) face = 2;
    else if (normalizedLng >= 135 || normalizedLng < -135) face = 3;
    else face = 5;
  }
  
  // Convert to UV coordinates (simplified projection)
  const latRange = face === 1 || face === 4 ? 90 : 90; // Degree range for this face
  const lngRange = face === 1 || face === 4 ? 360 : 90;
  
  let u, v;
  if (face === 1) { // North pole
    u = (normalizedLng + 180) / 360;
    v = (normalizedLat - 45) / 45;
  } else if (face === 4) { // South pole  
    u = (normalizedLng + 180) / 360;
    v = (normalizedLat + 45) / 45;
  } else { // Equatorial faces
    const baseLng = (face - 0) * 90 - 45; // Base longitude for this face
    u = ((normalizedLng - baseLng + 45) % 90) / 90;
    v = (normalizedLat + 90) / 180;
  }
  
  // Clamp to [0, 1]
  u = Math.max(0, Math.min(1, u));
  v = Math.max(0, Math.min(1, v));
  
  // Convert to discrete cell coordinates at given level
  const maxCellIndex = 1 << level; // 2^level
  const i = Math.floor(u * maxCellIndex);
  const j = Math.floor(v * maxCellIndex);
  
  // Create cell ID string
  return `${face}_${level}_${Math.min(i, maxCellIndex - 1)}_${Math.min(j, maxCellIndex - 1)}`;
}

/**
 * Calculate S2 cell bounds from cell ID
 */
export function s2CellIdToBounds(cellId: string, level: number): S2GridBounds {
  // Parse cell ID (format: face_level_i_j)
  const parts = cellId.split('_');
  if (parts.length !== 4) {
    throw new Error(`Invalid S2 cell ID format: ${cellId}`);
  }
  
  const face = parseInt(parts[0]);
  const cellLevel = parseInt(parts[1]);
  const i = parseInt(parts[2]);
  const j = parseInt(parts[3]);
  
  // Calculate cell size at this level
  const maxCellIndex = 1 << cellLevel; // 2^level
  const cellSize = 1.0 / maxCellIndex;
  
  // Calculate UV bounds
  const uMin = i * cellSize;
  const vMin = j * cellSize;
  const uMax = uMin + cellSize;
  const vMax = vMin + cellSize;
  
  // Convert UV bounds to lat/lng using simplified projection
  const sw = uvToLatLngSimple(uMin, vMin, face);
  const se = uvToLatLngSimple(uMax, vMin, face);  
  const ne = uvToLatLngSimple(uMax, vMax, face);
  const nw = uvToLatLngSimple(uMin, vMax, face);
  
  return {
    south: Math.min(sw.lat, se.lat, ne.lat, nw.lat),
    north: Math.max(sw.lat, se.lat, ne.lat, nw.lat),
    west: Math.min(sw.lng, se.lng, ne.lng, nw.lng),
    east: Math.max(sw.lng, se.lng, ne.lng, nw.lng)
  };
}

/**
 * Generate S2 cells for a given bounding box and level
 * Simplified and more reliable implementation
 */
export function getS2CellsInBounds(bounds: S2GridBounds, level: number): S2CellId[] {
  const cells: S2CellId[] = [];
  const seenCells = new Set<string>();
  
  // Limit the level to prevent performance issues
  const effectiveLevel = Math.min(level, 12);
  
  // Calculate sampling based on level and bounds
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  
  // Adaptive sampling based on level and area
  const baseSamples = Math.min(20, Math.max(8, Math.pow(2, effectiveLevel - 3)));
  const latSamples = Math.ceil(baseSamples * (latSpan / 90));
  const lngSamples = Math.ceil(baseSamples * (lngSpan / 180));
  
  const latStep = latSpan / latSamples;
  const lngStep = lngSpan / lngSamples;
  
  console.log(`S2 grid generation: ${latSamples}x${lngSamples} samples for level ${effectiveLevel}`);
  console.log(`Bounds: ${bounds.south.toFixed(2)} to ${bounds.north.toFixed(2)}°N, ${bounds.west.toFixed(2)} to ${bounds.east.toFixed(2)}°E`);
  
  // Test the first sample point
  const testLat = bounds.south + latStep;
  const testLng = bounds.west + lngStep;
  console.log(`Testing S2 conversion at sample point: ${testLat.toFixed(2)}, ${testLng.toFixed(2)}`);
  testS2Conversion(testLat, testLng, effectiveLevel);
  
  // Generate cells by sampling the area
  for (let i = 0; i <= latSamples; i++) {
    for (let j = 0; j <= lngSamples; j++) {
      const lat = bounds.south + (i * latStep);
      const lng = bounds.west + (j * lngStep);
      
      try {
        const cellId = latLngToS2CellId(lat, lng, effectiveLevel);
        
        // Skip duplicates
        if (seenCells.has(cellId)) continue;
        seenCells.add(cellId);
        
        // Calculate cell bounds
        const cellBounds = s2CellIdToBounds(cellId, effectiveLevel);
        
        // Simple overlap check
        const overlaps = !(
          cellBounds.north < bounds.south ||
          cellBounds.south > bounds.north ||
          cellBounds.east < bounds.west ||
          cellBounds.west > bounds.east
        );
        
        if (overlaps) {
          cells.push({
            id: cellId,
            level: effectiveLevel,
            bounds: cellBounds,
            center: {
              lat: (cellBounds.north + cellBounds.south) / 2,
              lng: (cellBounds.east + cellBounds.west) / 2
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to generate S2 cell at ${lat.toFixed(2)}, ${lng.toFixed(2)}:`, error);
        continue;
      }
    }
  }
  
  console.log(`Generated ${cells.length} unique S2 cells at level ${effectiveLevel}`);
  return cells;
}

/**
 * Get maximum samples for a given S2 level to prevent performance issues
 */
function getMaxSamplesForLevel(level: number): number {
  // Limit samples based on level to prevent UI freezing
  if (level <= 5) return 100;   // Low levels: 100 samples (10x10)
  if (level <= 8) return 400;   // Medium levels: 400 samples (20x20)
  if (level <= 12) return 900;  // Higher levels: 900 samples (30x30)
  return 1600; // Very high levels: 1600 samples (40x40) max
}

/**
 * Convert S2 cell bounds to GeoJSON polygon
 */
export function s2CellToGeoJSON(cell: S2CellId): any {
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
 * Get approximate cell size at a given level (in degrees)
 */
export function getCellSizeAtLevel(level: number): number {
  // S2 cell sizes are approximately halved at each level
  const baseSize = 180; // Level 0 covers half the sphere
  return baseSize / Math.pow(2, level);
}

/**
 * Get appropriate S2 level for a given zoom level
 */
export function getS2LevelForZoom(zoom: number): number {
  // Simpler mapping to avoid high levels
  if (zoom <= 3) return 2;
  if (zoom <= 6) return 4;
  if (zoom <= 9) return 6;
  if (zoom <= 12) return 8;
  if (zoom <= 15) return 10;
  return 12; // Cap at level 12 for performance
}

/**
 * Test S2 conversion functions
 */
export function testS2Conversion(lat: number, lng: number, level: number): void {
  console.log(`Testing S2 conversion for ${lat}, ${lng} at level ${level}`);
  
  try {
    const cellId = latLngToS2CellId(lat, lng, level);
    console.log(`Cell ID: ${cellId}`);
    
    const bounds = s2CellIdToBounds(cellId, level);
    console.log(`Cell bounds:`, bounds);
    
    const center = {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2
    };
    console.log(`Cell center: ${center.lat}, ${center.lng}`);
    
    // Test if original point is within bounds
    const inBounds = lat >= bounds.south && lat <= bounds.north && 
                    lng >= bounds.west && lng <= bounds.east;
    console.log(`Original point in bounds: ${inBounds}`);
  } catch (error) {
    console.error('S2 conversion test failed:', error);
  }
}

// Helper functions for S2 coordinate conversion

function getFaceFromLatLng(lat: number, lng: number): number {
  // Simplified face selection based on lat/lng
  const absLat = Math.abs(lat);
  
  if (absLat > 45) {
    return lat > 0 ? 1 : 4; // North or South pole faces
  }
  
  // Equatorial faces
  if (lng < -90) return 5;
  if (lng < 0) return 0;
  if (lng < 90) return 2;
  return 3;
}

function latLngToUV(lat: number, lng: number, face: number): { u: number; v: number } {
  // Simplified UV projection
  const radLat = (lat * Math.PI) / 180;
  const radLng = (lng * Math.PI) / 180;
  
  let u: number, v: number;
  
  switch (face) {
    case 0: // Front face
      u = (lng + 90) / 180;
      v = (lat + 90) / 180;
      break;
    case 1: // North pole
      u = (lng + 180) / 360;
      v = (90 - lat) / 180;
      break;
    case 2: // Right face
      u = (lng - 90) / 180;
      v = (lat + 90) / 180;
      break;
    case 3: // Back face
      u = (lng - 180) / 180;
      v = (lat + 90) / 180;
      break;
    case 4: // South pole
      u = (lng + 180) / 360;
      v = (lat + 90) / 180;
      break;
    case 5: // Left face
      u = (lng + 180) / 180;
      v = (lat + 90) / 180;
      break;
    default:
      u = 0.5;
      v = 0.5;
  }
  
  return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
}

function uvToLatLngSimple(u: number, v: number, face: number): { lat: number; lng: number } {
  try {
    // Clamp UV to valid range
    u = Math.max(0, Math.min(1, u));
    v = Math.max(0, Math.min(1, v));
    
    let lat: number, lng: number;
    
    if (face === 1) { // North pole region
      lat = 45 + v * 45; // 45 to 90 degrees
      lng = (u * 360) - 180; // Full longitude range
    } else if (face === 4) { // South pole region  
      lat = -45 + v * 45; // -45 to 0 degrees
      lng = (u * 360) - 180; // Full longitude range
    } else { // Equatorial faces
      lat = (v * 180) - 90; // Full latitude range
      const baseLng = face * 90 - 45; // Base longitude for this face
      lng = baseLng + (u * 90); // 90-degree range for this face
    }
    
    // Normalize longitude to [-180, 180]
    lng = ((lng + 180) % 360) - 180;
    
    return { 
      lat: Math.max(-85, Math.min(85, lat)), 
      lng: Math.max(-180, Math.min(180, lng))
    };
  } catch (error) {
    console.warn('Error in uvToLatLngSimple:', error, { u, v, face });
    return { lat: 0, lng: 0 };
  }
}

function largestAbsComponent(x: number, y: number, z: number): number {
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);
  
  if (absX >= absY && absX >= absZ) {
    return x >= 0 ? 0 : 3; // +X or -X face
  } else if (absY >= absZ) {
    return y >= 0 ? 1 : 4; // +Y or -Y face
  } else {
    return z >= 0 ? 2 : 5; // +Z or -Z face
  }
}