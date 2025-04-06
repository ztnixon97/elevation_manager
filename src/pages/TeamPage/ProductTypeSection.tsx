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
import Autocomplete from "@mui/material/Autocomplete";
import {
  DataGrid,
  GridColDef,
  GridToolbarQuickFilter,
  GridToolbarContainer,
} from "@mui/x-data-grid";

const ProductTypesSection = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const parsedTeamId = teamId ? parseInt(teamId, 10) : null;

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const [productTypes, setProductTypes] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [availableProductTypes, setAvailableProductTypes] = useState<{ id: number; name: string }[]>([]);
  const [selectedProductType, setSelectedProductType] = useState<{ id: number; name: string } | null>(null);

  const [selectedProductTypeIds, setSelectedProductTypeIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchProductTypes() {
      if (!parsedTeamId) return;

      setIsLoading(true);
      try {
        const response = await invoke<string>("get_team_product_types", { team_id: parsedTeamId });
        const parsed = JSON.parse(response);

        if (Array.isArray(parsed.data)) {
          setProductTypes(parsed.data);
          console.info("✅ Product types successfully loaded.");
        } else {
          setProductTypes([]);
          console.info("✅ No product types assigned.");
        }
      } catch (error: any) {
        if (error?.message?.includes("404")) {
          console.info("✅ No product types found (404) – Showing empty table.");
          setProductTypes([]);
        } else if (error?.message?.includes("Team not found")) {
          setErrorMessage("Team not found.");
        } else {
          console.error("❌ Failed to load product types:", error);
          setErrorMessage("Failed to load product types.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProductTypes();
  }, [parsedTeamId]);

  const openAddDialog = async () => {
    setIsAddDialogOpen(true);
    try {
      const response = await invoke<string>("get_all_product_types");
      const parsedProductTypes = JSON.parse(response).data.map((type: any) => ({
        id: type.id,
        name: type.name,
      }));
      setAvailableProductTypes(parsedProductTypes || []);
    } catch (error) {
      setErrorMessage("Failed to fetch product types.");
    }
  };

  const addProductTypeToTeam = async () => {
    if (!selectedProductType || !parsedTeamId) return;

    try {
      await invoke("assign_product_type_to_team", {
        team_id: parsedTeamId,
        product_type_id: selectedProductType.id,
      });

      setProductTypes((prev) => [...prev, { id: selectedProductType.id, name: selectedProductType.name }]);
      setIsAddDialogOpen(false);
      setSelectedProductType(null);
    } catch (error) {
      setErrorMessage("Failed to assign product type.");
    }
  };

  const removeSelectedProductTypes = async () => {
    if (!parsedTeamId || selectedProductTypeIds.length === 0) return;

    try {
      console.log(`📡 Removing product types: ${selectedProductTypeIds.join(", ")} from Team ${parsedTeamId}`);

      await Promise.all(
        selectedProductTypeIds.map((typeId) =>
          invoke("remove_product_type_from_team", { team_id: parsedTeamId, product_type_id: typeId })
        )
      );

      setProductTypes((prev) => prev.filter((type) => !selectedProductTypeIds.includes(type.id)));
      setSelectedProductTypeIds([]);
      setIsDeleteDialogOpen(false);
      console.info("✅ Product types removed successfully!");
    } catch (error) {
      console.error("❌ Error removing product types:", error);
      setErrorMessage("Failed to remove product types.");
    }
  };

  const productTypeColumns: GridColDef[] = [{ field: "name", headerName: "Product Type", flex: 1 }];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
      <GridToolbarQuickFilter />
      <Box>
        <Button variant="contained" color="primary" onClick={openAddDialog} sx={{ mr: 1 }}>
          Add Product Type
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={selectedProductTypeIds.length === 0}
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
        Product Types
      </Typography>

      <DataGrid
        rows={productTypes}
        columns={productTypeColumns}
        getRowId={(row) => row.id}
        checkboxSelection
        onRowSelectionModelChange={(ids) => setSelectedProductTypeIds(ids as number[])}
        pageSizeOptions={[5, 10]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={isLoading}
        autoHeight
        slots={{ toolbar: CustomToolbar }}
        sx={{ minHeight: "400px", mt: 2 }}
        localeText={{ noRowsLabel: "No product types assigned. Click 'Add Product Type' to assign one." }}
      />

      {/* Add Product Type Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Product Type to Team</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={availableProductTypes}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => <TextField {...params} label="Search Product Type" />}
            onChange={(_, value) => setSelectedProductType(value)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={{ mt: 2 }}
            fullWidth
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={addProductTypeToTeam} variant="contained" disabled={!selectedProductType}>
            Assign
          </Button>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Remove Selected Product Types</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove {selectedProductTypeIds.length} product types?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={removeSelectedProductTypes} variant="contained" color="error">
            Remove
          </Button>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductTypesSection;
