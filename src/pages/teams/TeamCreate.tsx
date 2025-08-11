// src/pages/teams/TeamCreate.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid2,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Snackbar,
  Divider,
  Chip,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  PersonAdd,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  role: string;
  email?: string;
}

interface TeamFormData {
  name: string;
  description: string;
  team_lead_id: number | null;
}

interface TeamMember {
  user_id: number;
  role: string;
  username: string;
  first_name?: string;
  last_name?: string;
}

const TeamCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [memberDialog, setMemberDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [memberRole, setMemberRole] = useState('member');
  
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: '',
    team_lead_id: null,
  });
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await invoke<string>('get_all_users');
      const data = JSON.parse(response);
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setMessage({ text: 'Failed to load users', severity: 'error' });
    }
  };

  const handleInputChange = (field: keyof TeamFormData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddMember = () => {
    setMemberDialog(true);
  };

  const confirmAddMember = () => {
    if (!selectedUser) return;

    // Check if user is already a member
    if (teamMembers.some(member => member.user_id === selectedUser.id)) {
      setMessage({ text: 'User is already a team member', severity: 'error' });
      return;
    }

    const newMember: TeamMember = {
      user_id: selectedUser.id,
      role: memberRole,
      username: selectedUser.username,
      first_name: selectedUser.first_name,
      last_name: selectedUser.last_name,
    };

    setTeamMembers(prev => [...prev, newMember]);
    setMemberDialog(false);
    setSelectedUser(null);
    setMemberRole('member');
  };

  const handleRemoveMember = (userId: number) => {
    setTeamMembers(prev => prev.filter(member => member.user_id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setMessage({ text: 'Team name is required', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Create the team
      const teamResponse = await invoke<string>('create_team', {
        team: {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          team_lead_id: formData.team_lead_id,
        }
      });

      const teamData = JSON.parse(teamResponse);
      if (!teamData.success) {
        throw new Error(teamData.message || 'Failed to create team');
      }

      const teamId = teamData.data.id;

      // Add team members
      if (teamMembers.length > 0) {
        await Promise.all(
          teamMembers.map(member =>
            invoke('add_team_member', {
              team_id: teamId,
              user_id: member.user_id,
              role: member.role,
            })
          )
        );
      }

      setMessage({ text: 'Team created successfully!', severity: 'success' });
      setTimeout(() => {
        navigate('/teams');
      }, 1500);
    } catch (err) {
      console.error('Error creating team:', err);
      setMessage({ 
        text: typeof err === 'string' ? err : 'Failed to create team', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name} (${user.username})`;
    }
    return user.username;
  };

  const teamLeadCandidates = users.filter(user => 
    ['admin', 'team_lead', 'manager'].includes(user.role)
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/teams')}
          sx={{ mr: 2 }}
        >
          Back to Teams
        </Button>
        <Typography variant="h4" component="h1">
          Create New Team
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={3}>
            {/* Basic Information */}
            <Grid2 xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <TextField
                fullWidth
                label="Team Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={3}
                sx={{ mb: 2 }}
                helperText="Optional description of the team's purpose"
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Team Lead</InputLabel>
                <Select
                  value={formData.team_lead_id || ''}
                  label="Team Lead"
                  onChange={(e) => handleInputChange('team_lead_id', e.target.value ? Number(e.target.value) : null)}
                >
                  <MenuItem value="">No Team Lead</MenuItem>
                  {teamLeadCandidates.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {getUserDisplayName(user)} - {user.role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>

            {/* Team Members */}
            <Grid2 xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Team Members ({teamMembers.length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<PersonAdd />}
                  onClick={handleAddMember}
                >
                  Add Member
                </Button>
              </Box>
              
              {teamMembers.length > 0 ? (
                <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                  <List>
                    {teamMembers.map((member) => (
                      <ListItem key={member.user_id}>
                        <ListItemText
                          primary={getUserDisplayName(member)}
                          secondary={
                            <Chip
                              label={member.role}
                              size="small"
                              color={member.role === 'team_lead' ? 'primary' : 'default'}
                            />
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              ) : (
                <Alert severity="info">
                  No team members added yet. Click "Add Member" to add users to this team.
                </Alert>
              )}
            </Grid2>
          </Grid2>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/teams')}
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
              {loading ? 'Creating...' : 'Create Team'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Add Member Dialog */}
      <Dialog open={memberDialog} onClose={() => setMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Autocomplete
              options={users.filter(user => 
                !teamMembers.some(member => member.user_id === user.id)
              )}
              getOptionLabel={(user) => getUserDisplayName(user)}
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select User"
                  fullWidth
                />
              )}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={memberRole}
                label="Role"
                onChange={(e) => setMemberRole(e.target.value)}
              >
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="senior_member">Senior Member</MenuItem>
                <MenuItem value="team_lead">Team Lead</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmAddMember}
            variant="contained"
            disabled={!selectedUser}
          >
            Add Member
          </Button>
        </DialogActions>
      </Dialog>

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

export default TeamCreate;