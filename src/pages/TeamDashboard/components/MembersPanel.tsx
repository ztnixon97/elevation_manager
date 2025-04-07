// src/pages/TeamDashboard/components/MembersPanel.tsx
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbarQuickFilter, GridToolbarContainer } from '@mui/x-data-grid';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface MembersPanelProps {
  teamId: number;
  members: any[];
  isTeamLead: boolean;
}

interface User {
  id: number;
  username: string;
}

const MembersPanel: React.FC<MembersPanelProps> = ({ teamId, members, isTeamLead }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState('member');
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Columns for the members DataGrid
  const columns: GridColDef[] = [
    { field: 'username', headerName: 'Username', flex: 1 },
    { field: 'role', headerName: 'Role', flex: 1, 
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'team_lead' ? 'primary' : 
            params.value === 'editor' ? 'secondary' : 
            'default'
          }
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        isTeamLead && (
          <Box>
            <IconButton 
              size="small" 
              onClick={() => handleEditClick(params.row)}
              title="Edit Role"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleDeleteClick(params.row)}
              title="Remove from Team"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )
      ),
    },
  ];

  // Handle opening the add user dialog
  const handleAddClick = async () => {
    if (!isTeamLead) return;
    
    setLoading(true);
    try {
      const response = await invoke<string>('get_all_users');
      const parsed = JSON.parse(response);
      const users = parsed.data || [];
      
      // Filter out users that are already team members
      const memberIds = members.map((m) => m.user_id);
      const filteredUsers = users.filter((user: User) => !memberIds.includes(user.id));
      
      setAvailableUsers(filteredUsers);
      setIsAddDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to fetch users',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle edit role click
  const handleEditClick = (member: any) => {
    if (!isTeamLead) return;
    setSelectedMember(member);
    setSelectedRole(member.role);
    setIsEditDialogOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (member: any) => {
    if (!isTeamLead) return;
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  // Add user to team
  const handleAddUser = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      await invoke('add_user_to_team', {
        team_id: teamId,
        userId: selectedUser,
        role: selectedRole,
      });
      
      // Refresh member list
      const response = await invoke<string>('get_team_users', { team_id: teamId });
      const data = JSON.parse(response);
      if (data.data && data.data.members) {
        members = data.data.members;
      }
      
      setMessage({
        text: 'User added successfully',
        severity: 'success',
      });
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to add user:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to add user',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update user role
  const handleUpdateRole = async () => {
    if (!selectedMember) return;
    
    setLoading(true);
    try {
      await invoke('update_user_role', {
        teamId,
        userId: selectedMember.user_id,
        role: selectedRole,
      });
      
      // Refresh member list
      const response = await invoke<string>('get_team_users', { team_id: teamId });
      const data = JSON.parse(response);
      if (data.data && data.data.members) {
        members = data.data.members;
      }
      
      setMessage({
        text: 'Role updated successfully',
        severity: 'success',
      });
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update role:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to update role',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove user from team
  const handleRemoveUser = async () => {
    if (!selectedMember) return;
    
    setLoading(true);
    try {
      await invoke('remove_user_from_team', {
        team_id: teamId,
        user_id: selectedMember.user_id,
      });
      
      // Refresh member list
      const response = await invoke<string>('get_team_users', { team_id: teamId });
      const data = JSON.parse(response);
      if (data.data && data.data.members) {
        members = data.data.members;
      }
      
      setMessage({
        text: 'User removed successfully',
        severity: 'success',
      });
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to remove user:', err);
      setMessage({
        text: typeof err === 'string' ? err : 'Failed to remove user',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const CustomToolbar = () => (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Team Members</Typography>
        {isTeamLead && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleAddClick}
            disabled={loading}
          >
            Add Member
          </Button>
        )}
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <DataGrid
          rows={members.map(m => ({ ...m, id: m.user_id }))}
          columns={columns}
          loading={loading}
          pagination
          disableRowSelectionOnClick
          autoHeight
          slots={{ toolbar: CustomToolbar }}
        />
      </Box>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Select User</InputLabel>
            <Select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value as number)}
              label="Select User"
            >
              {availableUsers.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              label="Role"
            >
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="team_lead">Team Lead</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            color="primary"
            disabled={!selectedUser || loading}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Member Role</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            User: {selectedMember?.username}
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              label="Role"
            >
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="team_lead">Team Lead</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {selectedMember?.username} from the team?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRemoveUser}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setMessage(null)} severity={message?.severity} variant="filled">
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MembersPanel;