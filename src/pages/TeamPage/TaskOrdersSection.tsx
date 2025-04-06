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
  Snackbar,
  Alert,
  TextField,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridToolbarQuickFilter,
  GridToolbarContainer,
} from "@mui/x-data-grid";

const TaskOrdersSection = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const parsedTeamId = teamId ? parseInt(teamId, 10) : null;

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const [tasks, setTasks] = useState<{ id: number; name: string; producer?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" } | null>(null);

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState("");

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchTasks() {
      if (!parsedTeamId) return;
      setIsLoading(true);
      try {
        console.log("📡 Fetching Task Orders...");
        const response = await invoke<string>("get_team_tasks", { team_id: parsedTeamId });
        console.log("✅ Task Orders Response:", response);

        const parsed = JSON.parse(response);
        console.log("📦 Parsed Task Data:", parsed.data?.task_orders || []);

        setTasks(parsed.data?.task_orders || []);
      } catch (error) {
        console.error("❌ Error fetching tasks:", error);
        setMessage({ text: "Failed to load task orders.", severity: "error" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchTasks();
  }, [parsedTeamId]);

  const openAddTaskDialog = () => {
    setIsAddTaskDialogOpen(true);
  };

  const addTaskToTeam = async () => {
    if (!taskName.trim() || !parsedTeamId) return;

    try {
      console.log(`📡 Assigning Task Order: ${taskName} to Team ${parsedTeamId}...`);
      await invoke("assign_task_order_to_team", {
        team_id: parsedTeamId,
        task_name: taskName.trim(),
      });

      console.log("✅ Task Order Assigned!");

      const updatedResponse = await invoke<string>("get_team_tasks", { team_id: parsedTeamId });
      console.log("📡 Fetching Updated Task Orders...");
      console.log("✅ Updated Tasks Response:", updatedResponse);

      setTasks(JSON.parse(updatedResponse).data?.task_orders || []);
      setTaskName("");
      setIsAddTaskDialogOpen(false);
      setMessage({ text: "Task order assigned successfully!", severity: "success" });
    } catch (error) {
      console.error("❌ Error assigning task order:", error);
      setMessage({ text: "Failed to assign task order.", severity: "error" });
    }
  };

  const removeSelectedTasks = async () => {
    if (!parsedTeamId || selectedTaskIds.length === 0) return;

    try {
      console.log(`📡 Removing Task Orders: ${selectedTaskIds.join(", ")} from Team ${parsedTeamId}...`);

      await Promise.all(
        selectedTaskIds.map((taskId) =>
          invoke("remove_task_order_from_team", { team_id: parsedTeamId, task_id: taskId })
        )
      );

      console.log("✅ Task Orders Removed!");

      setTasks((prev) => prev.filter((task) => !selectedTaskIds.includes(task.id)));
      setMessage({ text: "Task orders removed successfully!", severity: "success" });
      setSelectedTaskIds([]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("❌ Error removing task orders:", error);
      setMessage({ text: "Failed to remove task orders.", severity: "error" });
    }
  };

  const taskColumns: GridColDef[] = [
    { field: "name", headerName: "Task Order", flex: 1 },
    { field: "producer", headerName: "Producer", flex: 1, sortable: false },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
      <GridToolbarQuickFilter />
      <Box>
        <Button variant="contained" color="primary" onClick={openAddTaskDialog} sx={{ mr: 1 }}>
          Assign Task Order
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={selectedTaskIds.length === 0}
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          Remove Selected
        </Button>
      </Box>
    </GridToolbarContainer>
  );

  return (
    <Box>
      {message && (
        <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}>
          <Alert severity={message.severity}>{message.text}</Alert>
        </Snackbar>
      )}

      <Typography variant="h6" sx={{ mt: 2 }}>
        Task Orders
      </Typography>

      <DataGrid
        rows={tasks}
        columns={taskColumns}
        getRowId={(row) => row.id}
        checkboxSelection
        onRowSelectionModelChange={(ids) => setSelectedTaskIds(ids as number[])}
        pageSizeOptions={[5, 10]} // Pagination: default to 10, allow user to change
        paginationModel={paginationModel} // Controlled pagination
        onPaginationModelChange={setPaginationModel} // Update page state
        loading={isLoading}
        autoHeight
        slots={{ toolbar: CustomToolbar }}
        sx={{ minHeight: "400px", mt: 2 }}
      />

      {/* Add Task Order Dialog */}
      <Dialog open={isAddTaskDialogOpen} onClose={() => setIsAddTaskDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Task Order to Team</DialogTitle>
        <DialogContent>
          <TextField
            label="Task Order"
            placeholder="Enter task name"
            fullWidth
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={addTaskToTeam} variant="contained" disabled={!taskName}>
            Assign
          </Button>
          <Button onClick={() => setIsAddTaskDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Remove Selected Task Orders</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove {selectedTaskIds.length} task order(s)?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={removeSelectedTasks} variant="contained" color="error">
            Remove
          </Button>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskOrdersSection;
