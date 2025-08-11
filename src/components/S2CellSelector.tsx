// src/components/S2CellSelector.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Map as MapIcon
} from '@mui/icons-material';

interface S2CellSelectorProps {
  level: number;
  onCellSelect: (cellToken: string) => void;
}

const S2CellSelector: React.FC<S2CellSelectorProps> = ({ level, onCellSelect }) => {
  // const [searchQuery, setSearchQuery] = useState(''); // TODO: Implement search
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestedCells, setSuggestedCells] = useState<string[]>([]);
  const [manualCellToken, setManualCellToken] = useState('');

  // Common locations for quick selection
  const commonLocations = [
    { name: 'New York City', lat: 40.7128, lng: -74.0060 },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
    { name: 'Houston', lat: 29.7604, lng: -95.3698 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 }
  ];

  // Generate S2 cell tokens for a given location
  const generateS2CellsForLocation = (lat: number, lng: number) => {
    // This is a simplified S2 cell generation
    // In a real implementation, you'd use the S2 geometry library
    const cells: string[] = [];
    
    // Generate some sample S2 cell tokens for demonstration
    // These are mock tokens - in production you'd use actual S2 library
    const baseToken = Math.floor(Math.abs(lat * lng * 1000000)).toString(16);
    for (let i = 0; i < 5; i++) {
      const token = baseToken.substring(0, 8 + level) + i.toString();
      cells.push(token);
    }
    
    return cells;
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    const cells = generateS2CellsForLocation(lat, lng);
    setSuggestedCells(cells);
  };

  const handleManualTokenSubmit = () => {
    if (manualCellToken.trim()) {
      onCellSelect(manualCellToken.trim());
    }
  };

  const isValidS2Token = (token: string): boolean => {
    // Basic validation for S2 token format
    return /^[0-9a-f]+$/i.test(token) && token.length >= 8 && token.length <= 16;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select S2 Cell (Level {level})
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Choose an S2 cell by selecting a location or entering a cell token directly.
        Level {level} provides cells with approximately {Math.pow(2, -level) * 180} degree resolution.
      </Alert>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Manual Token Input */}
        <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SearchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Enter S2 Cell Token
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  label="S2 Cell Token"
                  value={manualCellToken}
                  onChange={(e) => setManualCellToken(e.target.value)}
                  placeholder="e.g., 89c25a31c"
                  error={manualCellToken.length > 0 && !isValidS2Token(manualCellToken)}
                  helperText={manualCellToken.length > 0 && !isValidS2Token(manualCellToken) 
                    ? "Invalid S2 token format" 
                    : "Enter a valid S2 cell token"}
                />
                <Button
                  variant="contained"
                  onClick={handleManualTokenSubmit}
                  disabled={!isValidS2Token(manualCellToken)}
                >
                  Select
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary">
                S2 tokens are hexadecimal strings that uniquely identify a cell in the S2 geometry system.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Location-based Selection */}
        <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Select by Location
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose a common location to see S2 cells in that area:
              </Typography>

              <List dense>
                {commonLocations.map((location, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton
                      onClick={() => handleLocationSelect(location.lat, location.lng)}
                      selected={selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng}
                    >
                      <ListItemText
                        primary={location.name}
                        secondary={`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Generated S2 Cells */}
        {suggestedCells.length > 0 && (
          <Box sx={{ width: '100%' }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <MapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  S2 Cells for Selected Location
                </Typography>
                
                {selectedLocation && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Location: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)} 
                    (Level {level} cells)
                  </Typography>
                )}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {suggestedCells.map((cell, index) => (
                    <Chip
                      key={index}
                      label={cell}
                      onClick={() => onCellSelect(cell)}
                      color="primary"
                      variant="outlined"
                      clickable
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  Click on any cell token above to select it. These are sample S2 cells for the selected location.
                </Alert>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="body2" color="text.secondary">
        <strong>Note:</strong> This is a simplified S2 cell selector. In production, this would integrate with 
        a proper S2 geometry library to generate actual S2 cell tokens and provide visual cell boundaries on a map.
      </Typography>
    </Box>
  );
};

export default S2CellSelector;