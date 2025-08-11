// src/pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { Login as LoginIcon, PersonAdd as RegisterIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const LoginPage: React.FC = () => {
  const { login, register, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError('');
    setFormData({ username: '', password: '', confirmPassword: '' });
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError('');
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.username, formData.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      await register(formData.username, formData.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          Elevation Manager
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Digital elevation product management system
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab
          icon={<LoginIcon />}
          label="Sign In"
          iconPosition="start"
        />
        <Tab
          icon={<RegisterIcon />}
          label="Register"
          iconPosition="start"
        />
      </Tabs>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Login Tab */}
      <TabPanel value={activeTab} index={0}>
        <Box component="form" onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={formData.username}
            onChange={handleInputChange('username')}
            disabled={loading}
            sx={{ mb: 2 }}
            autoComplete="username"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            value={formData.password}
            onChange={handleInputChange('password')}
            disabled={loading}
            sx={{ mb: 3 }}
            autoComplete="current-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </Box>
      </TabPanel>

      {/* Register Tab */}
      <TabPanel value={activeTab} index={1}>
        <Box component="form" onSubmit={handleRegister}>
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={formData.username}
            onChange={handleInputChange('username')}
            disabled={loading}
            sx={{ mb: 2 }}
            autoComplete="username"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            value={formData.password}
            onChange={handleInputChange('password')}
            disabled={loading}
            sx={{ mb: 2 }}
            autoComplete="new-password"
            helperText="Minimum 6 characters"
          />
          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            variant="outlined"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            disabled={loading}
            sx={{ mb: 3 }}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <RegisterIcon />}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default LoginPage;