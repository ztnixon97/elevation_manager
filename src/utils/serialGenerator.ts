// src/utils/serialGenerator.ts
import { invoke } from '@tauri-apps/api/core';

interface SerialRecord {
  product_type_id: number;
  fiscal_year: string;
  last_serial: number;
}

/**
 * Get current fiscal year in format fyYY
 */
export const getCurrentFiscalYear = (): string => {
  const currentYear = new Date().getFullYear();
  return `fy${(currentYear % 100).toString().padStart(2, '0')}`;
};

/**
 * Generate next alphanumeric serial for a product type
 * Format: A001, A002, A003, etc.
 */
export const generateNextSerial = async (productTypeId: number): Promise<string> => {
  try {
    const fiscalYear = getCurrentFiscalYear();
    
    // Get or create serial record for this product type and fiscal year
    const response = await invoke<string>('get_next_serial', {
      product_type_id: productTypeId,
      fiscal_year: fiscalYear
    });
    
    const result = JSON.parse(response);
    
    if (result.success) {
      const serialNumber = result.serial_number;
      return `A${serialNumber.toString().padStart(3, '0')}`;
    } else {
      // Fallback to random if backend not available
      const randomSerial = Math.floor(Math.random() * 999) + 1;
      return `A${randomSerial.toString().padStart(3, '0')}`;
    }
  } catch (error) {
    console.error('Failed to generate serial:', error);
    // Fallback to random serial
    const randomSerial = Math.floor(Math.random() * 999) + 1;
    return `A${randomSerial.toString().padStart(3, '0')}`;
  }
};

/**
 * Generate site ID with proper sequential serial
 */
export const generateSiteId = async (productTypeAcronym: string, productTypeId: number): Promise<string> => {
  const fiscalYear = getCurrentFiscalYear();
  const serial = await generateNextSerial(productTypeId);
  return `${fiscalYear}-${productTypeAcronym}-${serial}`;
};

/**
 * Check if new fiscal year started (for cache invalidation)
 */
export const isNewFiscalYear = (lastFiscalYear: string): boolean => {
  const currentFiscalYear = getCurrentFiscalYear();
  return lastFiscalYear !== currentFiscalYear;
};

/**
 * Local cache for serial numbers to reduce backend calls
 * This is a simple in-memory cache that resets on page reload
 */
class SerialCache {
  private cache: Map<string, number> = new Map();
  private lastFiscalYear: string = getCurrentFiscalYear();

  /**
   * Get cached serial or fetch from backend
   */
  async getNextSerial(productTypeId: number): Promise<number> {
    const currentFiscalYear = getCurrentFiscalYear();
    const cacheKey = `${productTypeId}_${currentFiscalYear}`;

    // Clear cache if fiscal year changed
    if (this.lastFiscalYear !== currentFiscalYear) {
      this.cache.clear();
      this.lastFiscalYear = currentFiscalYear;
    }

    // Check cache first
    let nextSerial = this.cache.get(cacheKey) || 0;
    nextSerial += 1;

    // Update cache
    this.cache.set(cacheKey, nextSerial);

    return nextSerial;
  }

  /**
   * Reset cache for a specific product type (useful when creating fails)
   */
  resetForProductType(productTypeId: number): void {
    const currentFiscalYear = getCurrentFiscalYear();
    const cacheKey = `${productTypeId}_${currentFiscalYear}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const serialCache = new SerialCache();

/**
 * Generate sequential alphanumeric serial with caching
 */
export const generateCachedSerial = async (productTypeId: number): Promise<string> => {
  try {
    // Try to get from backend first for accuracy
    const response = await invoke<string>('get_next_serial', {
      product_type_id: productTypeId,
      fiscal_year: getCurrentFiscalYear()
    });
    
    const result = JSON.parse(response);
    
    if (result.success) {
      const serialNumber = result.serial_number;
      return `A${serialNumber.toString().padStart(3, '0')}`;
    }
  } catch (error) {
    console.warn('Backend serial generation failed, using cache:', error);
  }

  // Fallback to cache if backend unavailable
  const cachedSerial = await serialCache.getNextSerial(productTypeId);
  return `A${cachedSerial.toString().padStart(3, '0')}`;
};