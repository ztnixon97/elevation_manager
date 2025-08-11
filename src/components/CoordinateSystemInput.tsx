// src/components/CoordinateSystemInput.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import { getAvailableDegreeGridSizes } from '../utils/degreeGridUtils';

interface CoordinateSystemInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const CoordinateSystemInput: React.FC<CoordinateSystemInputProps> = ({
  value,
  onChange,
  label = "Coordinate Reference System"
}) => {
  const [systemType, setSystemType] = useState<'wgs84' | 'wgs84-grid' | 's2' | 'utm'>('wgs84');
  const [utmZone, setUtmZone] = useState('');
  const [utmHemisphere, setUtmHemisphere] = useState<'N' | 'S'>('N');
  const [s2Level, setS2Level] = useState('10');
  const [degreeGridSize, setDegreeGridSize] = useState('1.0');

  // Parse existing value to determine current system
  useEffect(() => {
    if (value.startsWith('WGS84-GRID:')) {
      setSystemType('wgs84-grid');
      const gridMatch = value.match(/WGS84-GRID:([0-9.]+)/);
      if (gridMatch) {
        setDegreeGridSize(gridMatch[1]);
      }
    } else if (value.startsWith('EPSG:4326')) {
      setSystemType('wgs84');
    } else if (value.startsWith('S2:')) {
      setSystemType('s2');
      const levelMatch = value.match(/S2:(\d+)/);
      if (levelMatch) {
        setS2Level(levelMatch[1]);
      }
    } else if (value.startsWith('EPSG:') && (value.includes('326') || value.includes('327'))) {
      setSystemType('utm');
      // Parse UTM zone from EPSG code
      const epsgCode = parseInt(value.replace('EPSG:', ''));
      if (epsgCode >= 32601 && epsgCode <= 32660) {
        // UTM North
        setUtmZone((epsgCode - 32600).toString());
        setUtmHemisphere('N');
      } else if (epsgCode >= 32701 && epsgCode <= 32760) {
        // UTM South
        setUtmZone((epsgCode - 32700).toString());
        setUtmHemisphere('S');
      }
    }
  }, [value]);

  const handleSystemTypeChange = (newType: 'wgs84' | 'wgs84-grid' | 's2' | 'utm') => {
    setSystemType(newType);
    
    // Set default values based on system type
    switch (newType) {
      case 'wgs84':
        onChange('EPSG:4326');
        break;
      case 'wgs84-grid':
        onChange(`WGS84-GRID:${degreeGridSize}`);
        break;
      case 's2':
        onChange(`S2:${s2Level}`);
        break;
      case 'utm':
        const zone = utmZone || '33';
        const epsgCode = utmHemisphere === 'N' ? 32600 + parseInt(zone) : 32700 + parseInt(zone);
        onChange(`EPSG:${epsgCode}`);
        break;
    }
  };

  const handleUtmChange = () => {
    if (utmZone && parseInt(utmZone) >= 1 && parseInt(utmZone) <= 60) {
      const epsgCode = utmHemisphere === 'N' ? 32600 + parseInt(utmZone) : 32700 + parseInt(utmZone);
      onChange(`EPSG:${epsgCode}`);
    }
  };

  const handleS2Change = (level: string) => {
    setS2Level(level);
    if (parseInt(level) >= 0 && parseInt(level) <= 30) {
      onChange(`S2:${level}`);
    }
  };

  const handleDegreeGridChange = (gridSize: string) => {
    setDegreeGridSize(gridSize);
    onChange(`WGS84-GRID:${gridSize}`);
  };

  const getSystemDescription = () => {
    switch (systemType) {
      case 'wgs84':
        return 'World Geodetic System 1984 - Global geographic coordinate system using decimal degrees';
      case 'wgs84-grid':
        return `WGS84 Degree Grid - Regular grid system with ${degreeGridSize}° x ${degreeGridSize}° cells`;
      case 's2':
        return `S2 Geometry - Google's spherical geometry library with level ${s2Level} precision`;
      case 'utm':
        return `Universal Transverse Mercator - Zone ${utmZone}${utmHemisphere} projected coordinate system in meters`;
      default:
        return '';
    }
  };

  return (
    <Box>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>{label} Type</InputLabel>
        <Select
          value={systemType}
          onChange={(e) => handleSystemTypeChange(e.target.value as 'wgs84' | 'wgs84-grid' | 's2' | 'utm')}
          label={`${label} Type`}
        >
          <MenuItem value="wgs84">WGS84 (Geographic)</MenuItem>
          <MenuItem value="wgs84-grid">WGS84 Degree Grid</MenuItem>
          <MenuItem value="s2">S2 Index System</MenuItem>
          <MenuItem value="utm">UTM (Projected)</MenuItem>
        </Select>
      </FormControl>

      {systemType === 'utm' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="UTM Zone"
            type="number"
            value={utmZone}
            onChange={(e) => {
              setUtmZone(e.target.value);
              setTimeout(handleUtmChange, 100);
            }}
            inputProps={{ min: 1, max: 60 }}
            helperText="1-60"
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Hemisphere</InputLabel>
            <Select
              value={utmHemisphere}
              onChange={(e) => {
                setUtmHemisphere(e.target.value as 'N' | 'S');
                setTimeout(handleUtmChange, 100);
              }}
              label="Hemisphere"
            >
              <MenuItem value="N">North</MenuItem>
              <MenuItem value="S">South</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {systemType === 'wgs84-grid' && (
        <Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Grid Size</InputLabel>
            <Select
              value={degreeGridSize}
              onChange={(e) => handleDegreeGridChange(e.target.value)}
              label="Grid Size"
            >
              {getAvailableDegreeGridSizes().map((size) => (
                <MenuItem key={size.value} value={size.value.toString()}>
                  {size.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Alert severity="info">
            <Typography variant="body2">
              Regular degree-based grid cells will be displayed on the interactive map. Click any cell to select it as your coverage area.
            </Typography>
          </Alert>
        </Box>
      )}

      {systemType === 's2' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="S2 Level"
              type="number"
              value={s2Level}
              onChange={(e) => handleS2Change(e.target.value)}
              inputProps={{ min: 0, max: 30 }}
              helperText="0-30 (higher = more precise)"
              size="small"
              sx={{ flexGrow: 1 }}
            />
          </Box>
          
          <Alert severity="info">
            <Typography variant="body2">
              S2 cells will be displayed on the interactive map. Click any cell to select it as your coverage area.
            </Typography>
          </Alert>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Current System:
        </Typography>
        <Chip
          label={value}
          color="primary"
          size="small"
          variant="outlined"
        />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          {getSystemDescription()}
        </Typography>
      </Alert>

      {systemType === 'utm' && (!utmZone || parseInt(utmZone) < 1 || parseInt(utmZone) > 60) && (
        <Alert severity="warning">
          Please enter a valid UTM zone (1-60)
        </Alert>
      )}

      {systemType === 's2' && (!s2Level || parseInt(s2Level) < 0 || parseInt(s2Level) > 30) && (
        <Alert severity="warning">
          Please enter a valid S2 level (0-30)
        </Alert>
      )}

    </Box>
  );
};

export default CoordinateSystemInput;