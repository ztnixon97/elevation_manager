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
  Tooltip,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridToolbarQuickFilter,
  GridToolbarContainer,
} from "@mui/x-data-grid";

const ProductsSection = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const parsedTeamId = teamId ? parseInt(teamId, 10) : null;

  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
  const [products, setProducts] = useState<{ id: number; site_id: string; product_type: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [productName, setProductName] = useState("");

  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      if (!parsedTeamId) return;

      setIsLoading(true);
      try {
        const response = await invoke<string>("get_team_products", { team_id: parsedTeamId });
        const parsed = JSON.parse(response);

        if (Array.isArray(parsed.data?.products)) {
          setProducts(parsed.data.products);
          console.info("✅ Products successfully loaded.");
        } else {
          setProducts([]);
          console.info("✅ No products assigned to this team.");
        }
      } catch (error: any) {
        if (error?.message?.includes("404")) {
          console.info("✅ No products found (404) – Showing empty table.");
          setProducts([]);
        } else if (error?.message?.includes("Team not found")) {
          setErrorMessage("Team not found.");
        } else {
          console.error("❌ Failed to load products:", error);
          setErrorMessage("Failed to load products.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [parsedTeamId]);

  const openAddDialog = () => {
    setIsAddDialogOpen(true);
    setProductName("");
  };

  const addProductToTeam = async () => {
    if (!productName.trim() || !parsedTeamId) return;

    try {
      await invoke("assign_product_to_team", {
        team_id: parsedTeamId,
        site_id: productName.trim(),
      });

      const updatedProductsResponse = await invoke<string>("get_team_products", { team_id: parsedTeamId });
      const parsedResponse = JSON.parse(updatedProductsResponse);
      const updatedProducts = parsedResponse.data?.products || [];

      setProducts(updatedProducts);
      setIsAddDialogOpen(false);
      setProductName("");
    } catch (error) {
      setErrorMessage("Failed to assign product.");
    }
  };

  const removeSelectedProducts = async () => {
    if (!parsedTeamId || selectedProductIds.length === 0) return;

    try {
      console.log(`📡 Removing products: ${selectedProductIds.join(", ")} from Team ${parsedTeamId}`);

      await Promise.all(
        selectedProductIds.map((productId) =>
          invoke("remove_product_from_team", { team_id: parsedTeamId, product_id: productId })
        )
      );

      setProducts((prev) => prev.filter((product) => !selectedProductIds.includes(product.id)));
      setSelectedProductIds([]);
      setIsDeleteDialogOpen(false);
      console.info("✅ Products removed successfully!");
    } catch (error) {
      console.error("❌ Error removing products:", error);
      setErrorMessage("Failed to remove products.");
    }
  };

  const productColumns: GridColDef[] = [
    { field: "site_id", headerName: "Site ID", flex: 1 },
    { field: "product_type", headerName: "Product Type", flex: 1 },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
      <GridToolbarQuickFilter />
      <Box>
        {/* 🛠️ Wrapped the "Add Product" button in a Tooltip */}
        <Tooltip title="Product assignments are for products not already assigned via a task order or product type.">
          <Button variant="contained" color="primary" onClick={openAddDialog} sx={{ mr: 1 }}>
            Add Product
          </Button>
        </Tooltip>
        <Button
          variant="contained"
          color="error"
          disabled={selectedProductIds.length === 0}
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
        Products
      </Typography>

      <DataGrid
        rows={products}
        columns={productColumns}
        getRowId={(row) => row.id}
        checkboxSelection
        onRowSelectionModelChange={(ids) => setSelectedProductIds(ids as number[])}
        pageSizeOptions={[5, 10]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={isLoading}
        autoHeight
        slots={{ toolbar: CustomToolbar }}
        sx={{ minHeight: "400px", mt: 2 }}
        localeText={{ noRowsLabel: "No products assigned. Click 'Add Product' to assign one." }}
      />

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Product to Team</DialogTitle>
        <DialogContent>
          <TextField
            label="Product Name (Site ID)"
            placeholder="Enter site ID"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={addProductToTeam} variant="contained" disabled={!productName.trim()}>
            Assign
          </Button>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Remove Selected Products</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove {selectedProductIds.length} products?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={removeSelectedProducts} variant="contained" color="error">
            Remove
          </Button>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsSection;
