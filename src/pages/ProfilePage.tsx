import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Snackbar,
} from '@mui/material';

import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

interface UserProfile {
  id: number;
  username: string;
  email?: string;
  org?: string;
  role: string;
  account_locked: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

interface TeamMembership {
  team_id: number;
  team_name: string;
  role: string;
}

interface ProfilePageProps {
  // Add any props if needed
}

const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { logout } = useContext(AuthContext);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});

  // Password change states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user profile
      const profileResponse = await invoke<string>('get_me_profile');
      const profileData = JSON.parse(profileResponse);
      
      if (profileData.success) {
        setProfile(profileData.data);
      } else {
        throw new Error(profileData.message || 'Failed to load profile');
      }

      // Load team memberships
      const teamsResponse = await invoke<string>('get_user_teams');
      const teamsData = JSON.parse(teamsResponse);
      
      if (teamsData.success) {
        setTeams(teamsData.data || []);
      }

    } catch (err: any) {
      console.error('Error loading profile data:', err);
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (profile) {
      setEditData({
        username: profile.username,
        email: profile.email,
        org: profile.org,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const updateData = {
        username: editData.username,
        email: editData.email,
        org: editData.org,
      };

      const response = await invoke<string>('update_user', {
        user_id: profile?.id,
        user_data: updateData,
      });

      const result = JSON.parse(response);
      
      if (result.success) {
        setSuccess('Profile updated successfully');
        await loadProfileData(); // Reload to get updated data
        setIsEditing(false);
      } else {
        throw new Error(result.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordData.new_password !== passwordData.confirm_password) {
        setError('New passwords do not match');
        return;
      }

      if (passwordData.new_password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      setLoading(true);
      setError(null);

      const response = await invoke<string>('change_password', {
        user_id: profile?.id,
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });

      const result = JSON.parse(response);
      
      if (result.success) {
        setSuccess('Password changed successfully');
        setShowPasswordDialog(false);
        setPasswordData({
          old_password: '',
          new_password: '',
          confirm_password: '',
        });
      } else {
        throw new Error(result.message || 'Failed to change password');
      }
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getRoleColor = (role?: string) => {
    if (!role) return 'default';
    switch (role.toLowerCase()) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'team_lead': return 'info';
      case 'editor': return 'success';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  if (loading && !profile) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Failed to load profile data. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>

      {/* Success/Error Messages */}
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
        {/* Profile Information */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Profile Information
              </Typography>
              {!isEditing ? (
                <Button
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  variant="outlined"
                  size="small"
                >
                  Edit
                </Button>
              ) : (
                <Box>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    variant="contained"
                    size="small"
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    Save
                  </Button>
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    variant="outlined"
                    size="small"
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <TextField
                fullWidth
                label="Username"
                value={isEditing ? editData.username || '' : profile.username}
                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                disabled={!isEditing}
                margin="normal"
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                fullWidth
                label="Email"
                value={isEditing ? editData.email || '' : profile.email || ''}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                disabled={!isEditing}
                margin="normal"
                type="email"
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                fullWidth
                label="Organization"
                value={isEditing ? editData.org || '' : profile.org || ''}
                onChange={(e) => setEditData({ ...editData, org: e.target.value })}
                disabled={!isEditing}
                margin="normal"
                sx={{ minWidth: 200, flex: 1 }}
              />
                                <FormControl fullWidth margin="normal" sx={{ minWidth: 200, flex: 1 }}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={profile.role || ''}
                      label="Role"
                      disabled
                    >
                      <MenuItem value={profile.role || ''}>
                        <Chip
                          label={profile.role || 'Unknown'}
                          color={getRoleColor(profile.role) as any}
                          size="small"
                        />
                      </MenuItem>
                    </Select>
                  </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Account Security
            </Typography>

            <Box mb={2}>
              <Typography variant="body2" color="textSecondary">
                Account Status
              </Typography>
              <Chip
                label={profile.account_locked ? 'Locked' : 'Active'}
                color={profile.account_locked ? 'error' : 'success'}
                size="small"
              />
            </Box>

            <Box mb={2}>
              <Typography variant="body2" color="textSecondary">
                Last Login
              </Typography>
              <Typography variant="body1">
                {formatDate(profile.last_login)}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="body2" color="textSecondary">
                Member Since
              </Typography>
              <Typography variant="body1">
                {formatDate(profile.created_at)}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={() => setShowPasswordDialog(true)}
              sx={{ mt: 2 }}
            >
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Team Memberships */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Team Memberships
            </Typography>

            {teams.length > 0 ? (
              <List>
                {teams.map((team) => (
                  <ListItem key={team.team_id}>
                    <ListItemAvatar>
                      <Avatar>
                        <GroupIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={team.team_name}
                      secondary={`Role: ${team.role}`}
                    />
                                          <Chip
                        label={team.role || 'Unknown'}
                        color={getRoleColor(team.role) as any}
                        size="small"
                      />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                You are not a member of any teams.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Password Change Dialog */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <TextField
              fullWidth
              label="Current Password"
              type={showPasswords.old ? 'text' : 'password'}
              value={passwordData.old_password}
              onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                    edge="end"
                  >
                    {showPasswords.old ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    edge="end"
                  >
                    {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    edge="end"
                  >
                    {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePasswordChange}
            variant="contained"
            disabled={loading || !passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password}
          >
            {loading ? <CircularProgress size={20} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage; 