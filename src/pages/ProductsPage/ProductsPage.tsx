import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Snackbar,
  Alert,
  Typography,
  CircularProgress,
  Link,
  Chip,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridToolbarQuickFilter,
  GridToolbarContainer,
} from "@mui/x-data-grid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReviewEditor from '../../components/ReviewEditor';

// Fetch assigned products from backend with better error handling
const fetchAssignedProducts = async () => {
  try {
    console.log("Fetching assigned products...");
    const response = await invoke<string | object>("get_user_products");
    
    // Handle response whether it's a string or already parsed
    const parsedResponse = typeof response === 'string' 
      ? JSON.parse(response) 
      : response;
    
    console.log("Assigned products response:", parsedResponse);
    
    if (parsedResponse.success) {
      // Check different possible response structures
      let products = [];
      
      if (Array.isArray(parsedResponse.data)) {
        products = parsedResponse.data;
      } else if (parsedResponse.data && parsedResponse.data.products) {
        products = parsedResponse.data.products;
      } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
        products = parsedResponse.data;
      }
      
      // Transform the products to ensure they have all required fields
      return products.map((product: any) => ({
        id: product.id,
        site_id: product.site_id || `Product #${product.id}`,
        item_id: product.item_id || 'N/A',
        product_type: product.product_type_name || `Type ${product.product_type_id}`,
        status: product.status || 'unknown',
        team: product.team_name || 'Not assigned',
      }));
    }
    
    throw new Error(parsedResponse.message || "Error fetching assigned products.");
  } catch (err) {
    console.error("Error in fetchAssignedProducts:", err);
    throw new Error(typeof err === 'string' ? err : "Failed to load assigned products");
  }
};

// Fetch all available products
const fetchAllProducts = async () => {
  try {
    console.log("Fetching all products...");
    const response = await invoke<string | object>("get_all_products");
    
    // Handle response whether it's a string or already parsed
    const parsedResponse = typeof response === 'string' 
      ? JSON.parse(response) 
      : response;
    
    console.log("All products response:", parsedResponse);
    
    if (parsedResponse.success) {
      // Check different possible response structures
      let products = [];
      
      if (parsedResponse.data && parsedResponse.data.products) {
        products = parsedResponse.data.products;
      } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
        products = parsedResponse.data;
      }
      
      // Transform the products
      return products.map((product: any) => ({
        id: product.id,
        site_id: product.site_id || `Product #${product.id}`,
        item_id: product.item_id || 'N/A',
        product_type: product.product_type_name || `Type ${product.product_type_id}`,
        status: product.status || 'unknown',
        team: product.team_name || 'Not assigned',
      }));
    }
    
    throw new Error(parsedResponse.message || "Error fetching products.");
  } catch (err) {
    console.error("Error in fetchAllProducts:", err);
    throw new Error(typeof err === 'string' ? err : "Failed to load all products");
  }
};

const ProductsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null); // Track selected product for editing

  // Fetch assigned products using React Query
  const { 
    data: assignedProducts, 
    error: assignedError, 
    isLoading: assignedLoading,
    refetch: refetchAssigned
  } = useQuery({
    queryKey: ["assigned-products"],
    queryFn: fetchAssignedProducts,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Fetch all products using React Query
  const { 
    data: allProducts, 
    error: allError, 
    isLoading: allLoading,
    refetch: refetchAll
  } = useQuery({
    queryKey: ["all-products"],
    queryFn: fetchAllProducts,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: activeTab === 1, // Only fetch when this tab is active
  });

  // Add useEffect to help debug assigned products loading
  useEffect(() => {
    console.log("Assigned products state:", {
      data: assignedProducts,
      error: assignedError,
      loading: assignedLoading
    });
  }, [assignedProducts, assignedError, assignedLoading]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Refetch data when switching tabs
    if (newValue === 0) {
      refetchAssigned();
    } else if (newValue === 1) {
      refetchAll();
    }
  };

  const handleRowClick = async (params: any) => {
    const productId = params.id;

    try {
      // Fetch draft review for the selected product
      const response = await invoke('get_product_reviews', { product_id: productId });
      const reviews = response.data;

      // Check if there's a draft review
      const draftReview = reviews.find((review: any) => review.review_status === 'Draft');
      if (draftReview) {
        // Navigate to ReviewEditor with the draft review
        navigate(`/reviews/${draftReview.id}`);
      } else {
        setMessage({ text: 'No draft review found for this product.', severity: 'info' });
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setMessage({ text: 'Failed to fetch reviews for this product.', severity: 'error' });
    }
  };

  const columns: GridColDef[] = [
    {
      field: "site_id",
      headerName: "Site ID",
      flex: 1,
      renderCell: (params) => (
        <Link
          onClick={() => navigate(`/products/${params.row.id}`)}
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
    { field: "item_id", headerName: "Item ID", flex: 1 },
    { field: "product_type", headerName: "Product Type", flex: 1 },
    { field: "team", headerName: "Team", flex: 1 },
    { 
      field: "status", 
      headerName: "Status", 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small"
          color={
            params.value === 'completed' ? 'success' : 
            params.value === 'in_progress' ? 'warning' : 
            params.value === 'pending' ? 'info' : 
            params.value === 'rejected' ? 'error' : 
            'default'
          }
        />
      )
    },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );

  if (selectedProduct) {
    return (
      <ReviewEditor
        productId={selectedProduct}
        productName={`Product #${selectedProduct}`}
        onReviewUpdated={() => {
          setSelectedProduct(null); // Return to ProductsPage after editing
          queryClient.invalidateQueries(['assigned-products']);
        }}
      />
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Products
      </Typography>

      {message && (
        <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}>
          <Alert severity={message.severity}>{message.text}</Alert>
        </Snackbar>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="My Assigned Products" />
          <Tab label="All Available Products" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <>
          {assignedError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {assignedError instanceof Error ? assignedError.message : "Error loading assigned products"}
            </Alert>
          )}
          
          {assignedLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {assignedProducts && assignedProducts.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You don't have any assigned products yet.
                </Alert>
              ) : (
                <DataGrid
                  rows={assignedProducts || []}
                  columns={columns}
                  getRowId={(row) => row.id}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={[5, 10, 25]}
                  autoHeight
                  slots={{ toolbar: CustomToolbar }}
                  sx={{ 
                    '& .MuiDataGrid-row:hover': {
                      cursor: 'pointer',
                      backgroundColor: 'action.hover',
                    }
                  }}
                  onRowClick={handleRowClick} // Navigate to ReviewEditor on row click
                />
              )}
            </>
          )}
        </>
      )}

      {activeTab === 1 && (
        <>
          {allError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {allError instanceof Error ? allError.message : "Error loading products"}
            </Alert>
          )}
          
          {allLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {allProducts && allProducts.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No products available.
                </Alert>
              ) : (
                <DataGrid
                  rows={allProducts || []}
                  columns={columns}
                  getRowId={(row) => row.id}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={[5, 10, 25]}
                  autoHeight
                  slots={{ toolbar: CustomToolbar }}
                  sx={{ 
                    '& .MuiDataGrid-row:hover': {
                      cursor: 'pointer',
                      backgroundColor: 'action.hover',
                    }
                  }}
                  onRowClick={handleRowClick} // Navigate to ReviewEditor on row click
                />
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default ProductsPage;
