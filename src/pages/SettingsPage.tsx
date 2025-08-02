import React, { useState, useContext } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Slider,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Notifications as NotificationsIcon,
  Visibility as VisibilityIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useSettings, Settings } from '../context/SettingsContext';

interface SettingsPageProps {
  // Add any props if needed
}

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { userRole, username } = useContext(AuthContext);
  const { mode, toggleTheme } = useContext(ThemeContext);
  const { settings, updateSettings, resetSettings, loading } = useSettings();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme: newTheme });
    if (newTheme === 'light' || newTheme === 'dark') {
      if (mode !== newTheme) {
        toggleTheme();
      }
    }
  };

  const handleNotificationChange = (key: keyof Settings['notifications'], value: boolean | number) => {
    updateSettings({
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
  };

  const handleDisplayChange = (key: keyof Settings['display'], value: any) => {
    updateSettings({
      display: {
        ...settings.display,
        [key]: value,
      },
    });
  };

  const handleSecurityChange = (key: keyof Settings['security'], value: boolean | number) => {
    updateSettings({
      security: {
        ...settings.security,
        [key]: value,
      },
    });
  };

  const handleDataChange = (key: keyof Settings['data'], value: boolean | number) => {
    updateSettings({
      data: {
        ...settings.data,
        [key]: value,
      },
    });
  };

  const handleSave = async () => {
    try {
      await updateSettings(settings);
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      console.error('Error saving settings:', err);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      await resetSettings();
      setSuccess('Settings reset to defaults!');
    }
  };

  const handleExport = async () => {
    try {
      const exportedData = await invoke('export_settings');
      const blob = new Blob([exportedData as string], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `elevation-manager-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('Settings exported successfully!');
    } catch (err) {
      setError('Failed to export settings. Please try again.');
      console.error('Error exporting settings:', err);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await invoke('import_settings', { settings_data: text });
      setSuccess('Settings imported successfully!');
    } catch (err) {
      setError('Failed to import settings. Please check the file format.');
      console.error('Error importing settings:', err);
    }
  };

  if (loading && !settings) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Settings
      </Typography>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Action Buttons */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Settings Management</Typography>
              <Box>
                <Button
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  variant="contained"
                  disabled={loading}
                  sx={{ mr: 1 }}
                >
                  Save Settings
                </Button>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  variant="outlined"
                  disabled={loading}
                >
                  Reset to Defaults
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <PaletteIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Appearance</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={settings.theme}
                    label="Theme"
                    onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">System</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Display Density</InputLabel>
                  <Select
                    value={settings.display.density}
                    label="Display Density"
                    onChange={(e) => handleDisplayChange('density', e.target.value)}
                  >
                    <MenuItem value="compact">Compact</MenuItem>
                    <MenuItem value="comfortable">Comfortable</MenuItem>
                    <MenuItem value="spacious">Spacious</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <Typography gutterBottom>Font Size: {settings.display.fontSize}px</Typography>
                <Slider
                  value={settings.display.fontSize}
                  onChange={(_, value) => handleDisplayChange('fontSize', value)}
                  min={10}
                  max={20}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.display.showAnimations}
                      onChange={(e) => handleDisplayChange('showAnimations', e.target.checked)}
                    />
                  }
                  label="Show Animations"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.display.autoRefresh}
                      onChange={(e) => handleDisplayChange('autoRefresh', e.target.checked)}
                    />
                  }
                  label="Auto Refresh"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <TextField
                  label="Refresh Interval (seconds)"
                  type="number"
                  value={settings.display.refreshInterval}
                  onChange={(e) => handleDisplayChange('refreshInterval', parseInt(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                  }}
                  disabled={!settings.display.autoRefresh}
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Notification Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <NotificationsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Notifications</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.enabled}
                      onChange={(e) => handleNotificationChange('enabled', e.target.checked)}
                    />
                  }
                  label="Enable Notifications"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.sound}
                      onChange={(e) => handleNotificationChange('sound', e.target.checked)}
                      disabled={!settings.notifications.enabled}
                    />
                  }
                  label="Sound Notifications"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.desktop}
                      onChange={(e) => handleNotificationChange('desktop', e.target.checked)}
                      disabled={!settings.notifications.enabled}
                    />
                  }
                  label="Desktop Notifications"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.email}
                      onChange={(e) => handleNotificationChange('email', e.target.checked)}
                      disabled={!settings.notifications.enabled}
                    />
                  }
                  label="Email Notifications"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <TextField
                  label="Polling Interval (seconds)"
                  type="number"
                  value={settings.notifications.pollingInterval}
                  onChange={(e) => handleNotificationChange('pollingInterval', parseInt(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                  }}
                  disabled={!settings.notifications.enabled}
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Security Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <SecurityIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Security</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.security.autoLock}
                      onChange={(e) => handleSecurityChange('autoLock', e.target.checked)}
                    />
                  }
                  label="Auto Lock"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <TextField
                  label="Lock Timeout (minutes)"
                  type="number"
                  value={settings.security.lockTimeout}
                  onChange={(e) => handleSecurityChange('lockTimeout', parseInt(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">min</InputAdornment>,
                  }}
                  disabled={!settings.security.autoLock}
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.security.requirePassword}
                      onChange={(e) => handleSecurityChange('requirePassword', e.target.checked)}
                    />
                  }
                  label="Require Password on Startup"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <TextField
                  label="Session Timeout (minutes)"
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">min</InputAdornment>,
                  }}
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Data Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <StorageIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Data & Cache</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.data.autoSave}
                      onChange={(e) => handleDataChange('autoSave', e.target.checked)}
                    />
                  }
                  label="Auto Save"
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <TextField
                  label="Save Interval (minutes)"
                  type="number"
                  value={settings.data.saveInterval}
                  onChange={(e) => handleDataChange('saveInterval', parseInt(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">min</InputAdornment>,
                  }}
                  disabled={!settings.data.autoSave}
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <TextField
                  label="Max History Items"
                  type="number"
                  value={settings.data.maxHistoryItems}
                  onChange={(e) => handleDataChange('maxHistoryItems', parseInt(e.target.value))}
                />
              </Box>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.data.clearCacheOnExit}
                      onChange={(e) => handleDataChange('clearCacheOnExit', e.target.checked)}
                    />
                  }
                  label="Clear Cache on Exit"
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Import/Export Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Import/Export</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                variant="outlined"
              >
                Export Settings
              </Button>
              <Button
                component="label"
                startIcon={<UploadIcon />}
                variant="outlined"
              >
                Import Settings
                <input
                  type="file"
                  hidden
                  accept=".json"
                  onChange={handleImport}
                />
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

export default SettingsPage; 