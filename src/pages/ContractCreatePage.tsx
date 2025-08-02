import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';

interface ContractFormData {
  number: string;
  name: string;
  awarding_agency: string;
  award_date: string;
  start_date: string;
  end_date: string;
  current_obligation: number;
  current_spend: number;
  spend_ceiling: number;
  base_value: number;
  funding_source: string;
  status: string;
  prime_contractor: string;
  contract_type: string;
  classification: string;
}

const ContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  
  const [formData, setFormData] = useState<ContractFormData>({
    number: '',
    name: '',
    awarding_agency: '',
    award_date: '',
    start_date: '',
    end_date: '',
    current_obligation: 0,
    current_spend: 0,
    spend_ceiling: 0,
    base_value: 0,
    funding_source: '',
    status: 'Active',
    prime_contractor: '',
    contract_type: '',
    classification: 'Unclassified'
  });

  const handleInputChange = (field: keyof ContractFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await invoke<string | object>('create_contract', {
        contract: formData
      });

      const data = typeof response === 'string' ? JSON.parse(response) : response;

      if (data.success) {
        setMessage({ text: 'Contract created successfully!', severity: 'success' });
        setTimeout(() => {
          navigate('/contracts');
        }, 1500);
      } else {
        throw new Error(data.message || 'Failed to create contract');
      }
    } catch (err) {
      console.error('Error creating contract:', err);
      setMessage({ 
        text: typeof err === 'string' ? err : 'Failed to create contract', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/contracts')}
          sx={{ mr: 2 }}
        >
          Back to Contracts
        </Button>
        <Typography variant="h4" component="h1">
          Create New Contract
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <TextField
                fullWidth
                label="Contract Number"
                value={formData.number}
                onChange={(e) => handleInputChange('number', e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Contract Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Awarding Agency"
                value={formData.awarding_agency}
                onChange={(e) => handleInputChange('awarding_agency', e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Prime Contractor"
                value={formData.prime_contractor}
                onChange={(e) => handleInputChange('prime_contractor', e.target.value)}
                sx={{ mb: 2 }}
              />
            </Grid>

            {/* Dates */}
            <Grid xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Dates
              </Typography>
              
              <TextField
                fullWidth
                type="date"
                label="Award Date"
                value={formData.award_date}
                onChange={(e) => handleInputChange('award_date', e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
            </Grid>

            {/* Financial Information */}
            <Grid xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Financial Information
              </Typography>
              
              <TextField
                fullWidth
                type="number"
                label="Base Value"
                value={formData.base_value}
                onChange={(e) => handleInputChange('base_value', parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: '$',
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                type="number"
                label="Spend Ceiling"
                value={formData.spend_ceiling}
                onChange={(e) => handleInputChange('spend_ceiling', parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: '$',
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                type="number"
                label="Current Obligation"
                value={formData.current_obligation}
                onChange={(e) => handleInputChange('current_obligation', parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: '$',
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                type="number"
                label="Current Spend"
                value={formData.current_spend}
                onChange={(e) => handleInputChange('current_spend', parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: '$',
                }}
                sx={{ mb: 2 }}
              />
            </Grid>

            {/* Status and Classification */}
            <Grid xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Status & Classification
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Expired">Expired</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Contract Type"
                value={formData.contract_type}
                onChange={(e) => handleInputChange('contract_type', e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Funding Source"
                value={formData.funding_source}
                onChange={(e) => handleInputChange('funding_source', e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Classification</InputLabel>
                <Select
                  value={formData.classification}
                  label="Classification"
                  onChange={(e) => handleInputChange('classification', e.target.value)}
                >
                  <MenuItem value="Unclassified">Unclassified</MenuItem>
                  <MenuItem value="Confidential">Confidential</MenuItem>
                  <MenuItem value="Secret">Secret</MenuItem>
                  <MenuItem value="Top Secret">Top Secret</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/contracts')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Contract'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Message Snackbar */}
      {message && (
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={message.severity} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default ContractCreatePage; 