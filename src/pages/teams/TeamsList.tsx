// src/pages/teams/TeamsList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid2,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem as MenuItemComponent,
  ListItemIcon,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  AvatarGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface Team {
  id: number;
  name: string;
  description?: string;
  team_lead_id?: number;
  team_lead_name?: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  active_products: number;
  completed_products: number;
  members?: TeamMember[];
}

interface TeamMember {
  id: number;
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  role: string;
  joined_at: string;
}

const TeamsList: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await invoke<string>('get_all_teams');
      const data = JSON.parse(response);
      
      if (Array.isArray(data)) {
        // Enrich teams with additional data
        const enrichedTeams = await Promise.all(
          data.map(async (team: Team) => {
            try {
              // Get team members
              const membersResponse = await invoke<string>('get_team_members', { team_id: team.id });
              const membersData = JSON.parse(membersResponse);
              
              // Get team statistics
              const statsResponse = await invoke<string>('get_team_stats', { team_id: team.id });
              const statsData = JSON.parse(statsResponse);
              
              return {
                ...team,
                members: Array.isArray(membersData) ? membersData : [],
                member_count: Array.isArray(membersData) ? membersData.length : 0,
                active_products: statsData.active_products || 0,
                completed_products: statsData.completed_products || 0,
              };
            } catch (err) {
              console.warn(`Failed to load additional data for team ${team.id}:`, err);
              return {
                ...team,
                members: [],
                member_count: 0,
                active_products: 0,
                completed_products: 0,
              };
            }
          })
        );
        
        setTeams(enrichedTeams);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      setMessage({ text: 'Failed to load teams', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, team: Team) => {
    setAnchorEl(event.currentTarget);
    setSelectedTeam(team);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTeam(null);
  };

  const handleCreateTeam = () => {
    navigate('/teams/create');
  };

  const handleEditTeam = () => {
    if (selectedTeam) {
      navigate(`/teams/edit/${selectedTeam.id}`);
    }
    handleMenuClose();
  };

  const handleViewTeam = () => {
    if (selectedTeam) {
      navigate(`/teams/${selectedTeam.id}`);
    }
    handleMenuClose();
  };

  const handleDeleteTeam = () => {
    setDeleteDialog(true);
    handleMenuClose();
  };

  const confirmDeleteTeam = async () => {
    if (!selectedTeam) return;

    try {
      await invoke('delete_team', { team_id: selectedTeam.id });
      setTeams(teams.filter(t => t.id !== selectedTeam.id));
      setMessage({ text: 'Team deleted successfully', severity: 'success' });
      setDeleteDialog(false);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Failed to delete team:', error);
      setMessage({ text: 'Failed to delete team', severity: 'error' });
    }
  };

  const canManageTeams = userRole === 'admin' || userRole === 'team_lead';

  const filteredTeams = teams.filter(team => {
    const matchesSearch = searchTerm === '' || 
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Teams
        </Typography>
        {canManageTeams && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTeam}
          >
            Create Team
          </Button>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid2 container spacing={3} sx={{ mb: 3 }}>
        <Grid2 xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Total Teams
                  </Typography>
                  <Typography variant="h4">
                    {teams.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <GroupIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Total Members
                  </Typography>
                  <Typography variant="h4">
                    {teams.reduce((sum, team) => sum + team.member_count, 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Active Products
                  </Typography>
                  <Typography variant="h4">
                    {teams.reduce((sum, team) => sum + team.active_products, 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <AssignmentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Completed Products
                  </Typography>
                  <Typography variant="h4">
                    {teams.reduce((sum, team) => sum + team.completed_products, 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <AnalyticsIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid2 container spacing={2} alignItems="center">
          <Grid2 xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>
          <Grid2 xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
            >
              More Filters
            </Button>
          </Grid2>
        </Grid2>
      </Paper>

      {/* Teams Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Team</TableCell>
              <TableCell>Team Lead</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Active Products</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTeams.map((team) => (
              <TableRow key={team.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {team.name}
                    </Typography>
                    {team.description && (
                      <Typography variant="caption" color="text.secondary">
                        {team.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {team.team_lead_name ? (
                    <Chip
                      icon={<PersonIcon />}
                      label={team.team_lead_name}
                      variant="outlined"
                      size="small"
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No lead assigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 32, height: 32 } }}>
                      {team.members?.slice(0, 4).map((member) => (
                        <Avatar key={member.id} sx={{ fontSize: '0.75rem' }}>
                          {member.first_name?.[0] || member.username?.[0]?.toUpperCase()}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    <Typography variant="body2" color="text.secondary">
                      {team.member_count}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={team.active_products}
                    color="warning"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={team.completed_products}
                    color="success"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(team.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={(e) => handleMenuClick(e, team)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredTeams.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No teams found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {teams.length === 0 ? 'Create your first team to get started' : 'Try adjusting your search'}
          </Typography>
        </Box>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemComponent onClick={handleViewTeam}>
          <ListItemIcon>
            <AnalyticsIcon />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItemComponent>
        {canManageTeams && (
          <>
            <MenuItemComponent onClick={handleEditTeam}>
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText>Edit Team</ListItemText>
            </MenuItemComponent>
            <MenuItemComponent onClick={handleDeleteTeam}>
              <ListItemIcon>
                <DeleteIcon />
              </ListItemIcon>
              <ListItemText>Delete Team</ListItemText>
            </MenuItemComponent>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Team</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedTeam?.name}"? 
            This action cannot be undone and will remove all team assignments.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteTeam}
            color="error"
            variant="contained"
          >
            Delete
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

export default TeamsList;