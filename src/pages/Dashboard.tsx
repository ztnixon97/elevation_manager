import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { fromLonLat } from "ol/proj";
import { CircularProgress, Box, Typography, Button, Snackbar, Alert } from "@mui/material";

export default function Dashboard() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<Map | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const tileLayer = new TileLayer({ source: new OSM() });
    tileLayerRef.current = tileLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [tileLayer],
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2,
        projection: "EPSG:3857",
      }),
    });

    mapInstance.current = map;
    setLoading(false);

    return () => {
      map.setTarget("");
    };
  }, []);

  /** 📍 Try to fetch user location */
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstance.current) {
          const view = mapInstance.current.getView();
          view.setCenter(fromLonLat([longitude, latitude]));
          view.setZoom(14);
          setLocationError(null);
        }
      },
      (error) => {
        setLocationError(`Failed to get location: ${error.message}`);
      }
    );
  };

  return (
    <Box
      sx={{
        flexGrow: 1, // Let it fill remaining space dynamically
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Title Bar */}
      <Box sx={{ backgroundColor: "#333", color: "white", textAlign: "center" }}>
        <Typography variant="h6">🌍 OpenLayers 2D Viewer</Typography>
      </Box>

      {/* Map Container */}
      <Box ref={mapRef} sx={{ flexGrow: 1, width: "100%", height: "100%" }} />

      {/* Locate Me Button */}
      <Box sx={{ position: "absolute", bottom: 20, right: 20 }}>
        <Button variant="contained" onClick={getUserLocation}>
          📍 Locate Me
        </Button>
      </Box>

      {/* Location Error */}
      {locationError && (
        <Snackbar open={!!locationError} autoHideDuration={4000} onClose={() => setLocationError(null)}>
          <Alert severity="error">{locationError}</Alert>
        </Snackbar>
      )}
    </Box>
  );
}
