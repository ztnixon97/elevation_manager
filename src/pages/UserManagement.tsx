import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  Snackbar,
  Alert,
  Container,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Switch,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridToolbarQuickFilter,
  GridToolbarContainer,
  GridRenderEditCellParams,
  useGridApiRef,
} from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type User = {
  id: number;
  username: string;
  email: string;
  org: string;
  role: string;
  account_locked: boolean;
  last_login: string | null;
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const apiRef = useGridApiRef();

  const [selectedUserIds, setSelectedUserIds] = useState<GridRowSelectionModel>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{ id: number; value: boolean } | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" } | null>(null);

  const fetchUsers = async (): Promise<User[]> => {
    const response = await invoke<string>("get_users");
    const parsed = JSON.parse(response);
    return parsed.data;
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 60000,
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, user_data }: { id: number; user_data: Record<string, any> }) => {
      return await invoke("update_user", {
        user_id: id,
        user_data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setMessage({ text: "User updated successfully!", severity: "success" });
    },
    onError: () => {
      setMessage({ text: "Failed to update user.", severity: "error" });
    },
  });

  const deleteUsers = useMutation({
    mutationFn: async (userIds: number[]) => {
      await Promise.all(userIds.map((id) => invoke("delete_user", { user_id: id })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setSelectedUserIds([]);
      setMessage({ text: "Users deleted successfully!", severity: "success" });
      setIsDeleteDialogOpen(false);
    },
    onError: () => {
      setMessage({ text: "Failed to delete users.", severity: "error" });
    },
  });

  const handleEditRequest = (id: number, field: string, value: any) => {
    updateUser.mutate({ id, user_data: { [field]: value } });
  };

  const handleLockToggle = (id: number, locked: boolean) => {
    setPendingEdit({ id, value: locked });
    setIsLockDialogOpen(true);
  };

  const handleConfirmLock = () => {
    if (pendingEdit) {
      updateUser.mutate({ id: pendingEdit.id, user_data: { account_locked: pendingEdit.value } });
      setPendingEdit(null);
      setIsLockDialogOpen(false);
    }
  };

  const handleCancelLock = () => {
    setPendingEdit(null);
    setIsLockDialogOpen(false);
  };

  const handleDeleteSelectedUsers = () => {
    if (selectedUserIds.length > 0) {
      deleteUsers.mutate(selectedUserIds as number[]);
    }
  };

  const RoleSelectEditCell = (params: GridRenderEditCellParams) => {
    const { id, value } = params;
    return (
      <Select
        value={value}
        onChange={(e) => handleEditRequest(Number(id), "role", e.target.value)}
        fullWidth
      >
        <MenuItem value="admin">Admin</MenuItem>
        <MenuItem value="manager">Manager</MenuItem>
        <MenuItem value="team_lead">Team Lead</MenuItem>
        <MenuItem value="editor">Editor</MenuItem>
        <MenuItem value="viewer">Viewer</MenuItem>
      </Select>
    );
  };

  const LockAccountToggle = ({ id, value }: { id: number; value: boolean }) => (
    <Switch
      checked={value}
      onChange={(e) => handleLockToggle(id, e.target.checked)}
      color={value ? "error" : "primary"}
    />
  );

  const columns: GridColDef[] = [
    { field: "username", headerName: "Username", flex: 1 },
    { field: "email", headerName: "Email", flex: 1, editable: true },
    { field: "org", headerName: "Organization", flex: 1, editable: true },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      editable: true,
      renderEditCell: RoleSelectEditCell,
    },
    {
      field: "account_locked",
      headerName: "Locked",
      flex: 1,
      renderCell: (params) => <LockAccountToggle id={params.row.id} value={params.value} />,
    },
    {
      field: "last_login",
      headerName: "Last Login",
      flex: 1,
      
    },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
      <GridToolbarQuickFilter />
      <Button
        variant="contained"
        color="error"
        disabled={selectedUserIds.length === 0}
        onClick={() => setIsDeleteDialogOpen(true)}
      >
        Delete Selected
      </Button>
    </GridToolbarContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {message && (
        <Snackbar open={!!message} autoHideDuration={6000} onClose={() => setMessage(null)}>
          <Alert onClose={() => setMessage(null)} severity={message.severity} sx={{ width: "100%" }}>
            {message.text}
          </Alert>
        </Snackbar>
      )}

      <Typography variant="h4" fontWeight="bold" mb={3}>
        Admin User Management
      </Typography>

      <Box sx={{ height: 500 }}>
        <DataGrid
          apiRef={apiRef}
          rows={users}
          columns={columns}
          getRowId={(row) => row.id}
          checkboxSelection
          disableSelectionOnClick
          slots={{ toolbar: CustomToolbar }}
          loading={isLoading}
          pageSizeOptions={[5, 10, 25, 100]}
          autoHeight
          onRowSelectionModelChange={(newSelection) => setSelectedUserIds(newSelection)}
          processRowUpdate={(updatedRow, originalRow) => {
            const { id, ...changes } = updatedRow;
            const user_data: Record<string, any> = {};
          
            for (const key of Object.keys(changes)) {
              if (changes[key] !== originalRow[key]) {
                user_data[key] = changes[key];
              }
            }
          
            if (Object.keys(user_data).length > 0) {
              updateUser.mutate({ id, user_data });
            }
          
            return updatedRow;
          }}
          
          
        />
      </Box>

      <Dialog open={isLockDialogOpen} onClose={handleCancelLock}>
        <DialogTitle>Confirm Account Status Change</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to {pendingEdit?.value ? "lock" : "unlock"} this account?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmLock} variant="contained" color="primary">Yes</Button>
          <Button onClick={handleCancelLock}>No</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete {selectedUserIds.length} selected user(s)?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteSelectedUsers} color="error" variant="contained">
            Delete
          </Button>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement;
