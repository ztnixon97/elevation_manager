import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { DataGrid, GridColDef, GridToolbarQuickFilter, GridToolbarContainer } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

type Team = {
  id: number;
  name: string;
};

type RoleOption = "member" | "team_lead" | "viewer";

const UserTeamPage = () => {
  const queryClient = useQueryClient();
  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" } | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<number | "">("");
  const [selectedRole, setSelectedRole] = useState<RoleOption>("member");
  const [justification, setJustification] = useState("");

  // 🔹 User teams
  const { data: userTeams = [], isLoading: loadingUserTeams } = useQuery({
    queryKey: ["user_teams"],
    queryFn: async (): Promise<Team[]> => {
      const res = await invoke<string>("get_user_teams");
      const parsed = JSON.parse(res);
      return parsed.data || [];
    },
    staleTime: 60000,
  });

  // 🔸 All teams (lazy)
  const {
    data: allTeams = [],
    isLoading: loadingAllTeams,
    refetch: refetchAllTeams,
  } = useQuery({
    queryKey: ["all_teams"],
    queryFn: async (): Promise<Team[]> => {
      const res = await invoke<string>("get_all_teams");
      const parsed = JSON.parse(res);
      return parsed.data?.teams || [];
    },
    enabled: false,
  });

  const availableTeams = useMemo(() => {
    const userTeamIds = new Set(userTeams.map((t) => t.id));
    return allTeams.filter((t) => !userTeamIds.has(t.id));
  }, [userTeams, allTeams]);

  const requestTeam = useMutation({
    mutationFn: async () => {
      if (!selectedTeam || typeof selectedTeam !== "number") throw new Error("No team selected");
      return await invoke("request_team_join", {
        team_id: selectedTeam,
        role: selectedRole,
        justification,
      });
    },
    onSuccess: () => {
      setMessage({ text: "Request submitted!", severity: "success" });
      setIsDialogOpen(false);
      setSelectedTeam("");
      setSelectedRole("member");
      setJustification("");
      queryClient.invalidateQueries(["user_teams"]);
    },
    onError: (err) => {
      console.error(err);
      setMessage({ text: "Request failed.", severity: "error" });
    },
  });

  const handleOpenDialog = async () => {
    setIsDialogOpen(true);
    await refetchAllTeams();
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "name", headerName: "Team Name", flex: 1 },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
      <GridToolbarQuickFilter />
      <Button variant="contained" onClick={handleOpenDialog}>
        Request Access
      </Button>
    </GridToolbarContainer>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        My Teams
      </Typography>

      {message && (
        <Snackbar open autoHideDuration={5000} onClose={() => setMessage(null)}>
          <Alert severity={message.severity} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </Snackbar>
      )}

      <Box sx={{ height: 500, mt: 2 }}>
        {loadingUserTeams ? (
          <CircularProgress />
        ) : (
          <DataGrid
            rows={userTeams}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[5, 10]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            autoHeight
            disableRowSelectionOnClick
            hideFooterSelectedRowCount
            slots={{ toolbar: CustomToolbar }}
          />
        )}
      </Box>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request Team Access</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            select
            label="Select Team"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(Number(e.target.value))}
            fullWidth
            disabled={loadingAllTeams}
          >
            {availableTeams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Requested Role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as RoleOption)}
            fullWidth
          >
            <MenuItem value="member">Member</MenuItem>
            <MenuItem value="team_lead">Team Lead</MenuItem>
            <MenuItem value="viewer">Viewer</MenuItem>
          </TextField>

          <TextField
            label="Justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            placeholder="Explain why you need access..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => requestTeam.mutate()}
            disabled={!selectedTeam || !justification.trim()}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserTeamPage;
