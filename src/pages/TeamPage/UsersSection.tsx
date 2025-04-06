import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  TextField,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import {
  DataGrid,
  GridColDef,
  GridToolbarQuickFilter,
  GridToolbarContainer,
} from "@mui/x-data-grid";

const roleOptions = [
  { value: "manager", label: "Manager" },
  { value: "team_lead", label: "Team Lead" },
  { value: "member", label: "Member" },
];

const UsersSection = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const parsedTeamId = teamId ? parseInt(teamId, 10) : null;

  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
  const [users, setUsers] = useState<{ id: number; name: string; role: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("member");

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      if (!parsedTeamId) return;
      setIsLoading(true);
      try {
        const response = await invoke<string>("get_team_users", { team_id: parsedTeamId });
        const parsed = JSON.parse(response);

        if (Array.isArray(parsed.data?.members)) {
          const parsedUsers = parsed.data.members.map((user: any) => ({
            id: user.user_id ?? user.id,
            name: user.username ?? user.name,
            role: user.role ?? "member",
          }));
          setUsers(parsedUsers);
        } else {
          setUsers([]); // ✅ No members, show an empty table
        }
      } catch (error: any) {
        if (error?.message?.includes("404")) {
          console.info("✅ No team members found (404) – Showing empty table.");
          setUsers([]); // ✅ Treat 404 as an empty state instead of an error
        } else if (error?.message?.includes("Team not found")) {
          setErrorMessage("Team not found."); // ❌ Legitimate error (404 for non-existent team)
        } else {
          setErrorMessage("Failed to load team members.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, [parsedTeamId]);

  const openAddUserDialog = async () => {
    setIsAddUserDialogOpen(true);
    try {
      const response = await invoke<string>("get_all_users");
      const parsedUsers = JSON.parse(response).data.map((user: any) => ({
        id: user.id,
        name: user.username,
      }));
      setAvailableUsers(parsedUsers || []);
    } catch (error) {
      setErrorMessage("Failed to fetch users.");
    }
  };

  const addUserToTeam = async () => {
    if (!selectedUser || !parsedTeamId) return;

    try {
      await invoke("add_user_to_team", {
        team_id: parsedTeamId,
        user_id: selectedUser.id,
        role: selectedRole,
      });

      setUsers((prev) => [...prev, { id: selectedUser.id, name: selectedUser.name, role: selectedRole }]);
      setIsAddUserDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("member"); // ✅ Reset role selection after adding user
    } catch (error) {
      setErrorMessage("Failed to add user.");
    }
  };

  const removeSelectedUsers = async () => {
    if (!parsedTeamId || selectedUserIds.length === 0) return;

    try {
      console.log(`📡 Removing users: ${selectedUserIds.join(", ")} from Team ${parsedTeamId}`);

      await Promise.all(
        selectedUserIds.map((userId) =>
          invoke("remove_user_from_team", { team_id: parsedTeamId, user_id: userId })
        )
      );

      setUsers((prev) => prev.filter((user) => !selectedUserIds.includes(user.id)));
      setSelectedUserIds([]);
      setIsDeleteDialogOpen(false);
      console.info("✅ Users removed successfully!");
    } catch (error) {
      console.error("❌ Error removing users:", error);
      setErrorMessage("Failed to remove users.");
    }
  };

  const userColumns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      renderCell: (params) => (
        <Select
          size="small"
          value={params.value}
          onChange={async (event) => {
            try {
              await invoke("update_user_role", {
                team_id: parsedTeamId,
                user_id: params.row.id,
                role: event.target.value,
              });
              setUsers((prev) =>
                prev.map((u) => (u.id === params.row.id ? { ...u, role: event.target.value } : u))
              );
            } catch (error) {
              setErrorMessage("Failed to update role.");
            }
          }}
          fullWidth
        >
          {roleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      ),
    },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
      <GridToolbarQuickFilter />
      <Box>
        <Button variant="contained" color="primary" onClick={openAddUserDialog} sx={{ mr: 1 }}>
          Add User
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={selectedUserIds.length === 0}
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          Remove Selected
        </Button>
      </Box>
    </GridToolbarContainer>
  );

  return (
    <Box>
      {errorMessage && (
        <Snackbar open={!!errorMessage} autoHideDuration={4000} onClose={() => setErrorMessage(null)}>
          <Alert severity="error">{errorMessage}</Alert>
        </Snackbar>
      )}

      <Typography variant="h6" sx={{ mt: 2 }}>
        Users
      </Typography>

      <DataGrid
        rows={users}
        columns={userColumns}
        getRowId={(row) => row.id}
        checkboxSelection
        onRowSelectionModelChange={(ids) => setSelectedUserIds(ids as number[])}
        loading={isLoading}
        autoHeight
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5, 10, 20, 50]}
        slots={{ toolbar: CustomToolbar }}
        sx={{ minHeight: "400px", mt: 2 }}
      />

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onClose={() => setIsAddUserDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add User to Team</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={availableUsers}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => <TextField {...params} label="Search User" />}
            onChange={(_, value) => setSelectedUser(value)}
            fullWidth
          />
          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel>Select Role</InputLabel>
            <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              {roleOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={addUserToTeam} variant="contained" disabled={!selectedUser}>
            Add
          </Button>
          <Button onClick={() => setIsAddUserDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Remove Selected Users</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove {selectedUserIds.length} users?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={removeSelectedUsers} variant="contained" color="error">
            Remove
          </Button>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersSection;
