import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  CircularProgress,
  Typography,
  Container,
  Divider,
} from "@mui/material";

import { useQueryClient } from "@tanstack/react-query";
import TaskOrdersSection from "./TaskOrdersSection";
import UsersSection from "./UsersSection";
import ProductTypeSection from "./ProductTypeSection";
import ProductsSection from "./ProductsSection";

const TeamManagement = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const parsedTeamId = teamId ? parseInt(teamId, 10) : null;
  const queryClient = useQueryClient();

  const [team, setTeam] = useState<{ id: number; name: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchTeamDetails() {
      if (!parsedTeamId) return;

      setIsLoading(true);
      try {
        const teamResponse = await invoke<string>("get_team", { team_id: parsedTeamId });
        setTeam(JSON.parse(teamResponse).data);
      } catch (err) {
        console.error("Error fetching team data:", err);
        setMessage({ text: "Failed to load team data.", severity: "error" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeamDetails();
  }, [parsedTeamId]);

  const deleteTeam = async () => {
    if (!parsedTeamId) return;
    try {
      await invoke("delete_team", { team_id: parsedTeamId });
      setMessage({ text: "Team deleted successfully!", severity: "success" });

      queryClient.invalidateQueries({ queryKey: ["teams"] });

      setTimeout(() => {
        navigate("/admin/teams");
      }, 500);
    } catch (error) {
      console.error("Error deleting team:", error);
      setMessage({ text: "Failed to delete team.", severity: "error" });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {message && (
        <Snackbar open={!!message} autoHideDuration={6000} onClose={() => setMessage(null)}>
          <Alert onClose={() => setMessage(null)} severity={message.severity} sx={{ width: "100%" }}>
            {message.text}
          </Alert>
        </Snackbar>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h4" fontWeight="bold">
              Manage Team: {team?.name}
            </Typography>
            <Button variant="outlined" onClick={() => navigate("/admin/teams")}>
              ← Back to Teams
            </Button>
          </Box>

          <Divider sx={{ mb: 4 }} />

          <UsersSection />
          <Divider sx={{ my: 4 }} />

          <TaskOrdersSection />
          <Divider sx={{ my: 4 }} />

          <ProductTypeSection />
          <Divider sx={{ my: 4 }} />

          <ProductsSection />

          <Box sx={{ mt: 6, textAlign: "center" }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setIsDeleteDialogOpen(true)}
              sx={{ px: 4 }}
            >
              Delete Team
            </Button>
          </Box>

          <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete this team? This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={deleteTeam} variant="contained" color="error">
                Delete
              </Button>
              <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Container>
  );
};

export default TeamManagement;
