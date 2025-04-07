import  { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  TextField,
  Typography,
  CircularProgress,
  Link,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridToolbarQuickFilter,
  GridToolbarContainer,
} from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch teams from backend
const fetchTeams = async () => {
  const response = await invoke<string>("get_all_teams");
  const parsedResponse = JSON.parse(response);
  if (parsedResponse.success && parsedResponse.data?.teams) {
    return parsedResponse.data.teams;
  }
  throw new Error(parsedResponse.message || "Error fetching teams.");
};

const TeamsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });

  // UI State
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  // Fetch Teams using React Query
  const { data: teams, error, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Mutation to create a new team
  const createTeamMutation = useMutation({
    mutationFn: async (teamName: string) => {
      if (!teamName.trim()) throw new Error("Team name cannot be empty.");
      const response = await invoke<string>("create_team", { name: teamName });
      const parsedResponse = JSON.parse(response);
      if (!parsedResponse.success || !parsedResponse.data) {
        throw new Error(parsedResponse.message || "Unexpected response.");
      }
      return parsedResponse.data;
    },
    onSuccess: (newTeam) => {
      setMessage({ text: "Team created successfully!", severity: "success" });
      setIsDialogOpen(false);
      setNewTeamName("");
      queryClient.setQueryData(["teams"], (oldData: any) => [...(oldData || []), newTeam]);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error: any) => {
      setMessage({ text: error.message || "Failed to create team.", severity: "error" });
    },
  });

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Team Name",
      flex: 1,
      renderCell: (params) => (
        <Link
          onClick={() => navigate(`/admin/teams/${params.row.id}`)}
          sx={{
            cursor: "pointer",
            textDecoration: "underline",
            "&:hover": { color: "primary.dark" },
          }}
        >
          {params.value}
        </Link>
      ),
    },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
      <GridToolbarQuickFilter />
      <Button variant="contained" onClick={() => setIsDialogOpen(true)}>
        Create Team
      </Button>
    </GridToolbarContainer>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Team Management
      </Typography>

      {message && (
        <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}>
          <Alert severity={message.severity}>{message.text}</Alert>
        </Snackbar>
      )}

      {error && <Alert severity="error">{error.message}</Alert>}

      <Box sx={{ height: 500, mt: 2 }}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <DataGrid
            rows={teams || []}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[5, 10]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            autoHeight
            slots={{ toolbar: CustomToolbar }}
            sx={{
              cursor: "pointer",
              "& .MuiDataGrid-row:hover": { backgroundColor: "action.hover" },
            }}
          />
        )}
      </Box>

      {/* Create Team Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          <TextField
            label="Team Name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => createTeamMutation.mutate(newTeamName)}
            variant="contained"
            disabled={createTeamMutation.isPending}
          >
            Create
          </Button>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamsPage;
