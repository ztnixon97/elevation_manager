// src/App.tsx - Modified to include NotificationProvider
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProviderWrapper } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SettingsProvider } from "./context/SettingsContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TeamsPage from "./pages/TeamsPage";
import Sidebar from "./components/Sidebar";
import UserTeamPage from "./pages/UserTeamPage/UserTeamPage";
import { useContext, useEffect } from "react";
import { Box } from "@mui/material";
import TeamManagement from "./pages/TeamPage/TeamManagement";
import UserManagement from "./pages/UserManagement";
import { GraphQLPlayground } from "./pages/GraphQLPlayground";
import NotificationsPage from "./pages/NotificationsPage";
import { invoke } from "@tauri-apps/api/core";
import TeamDashboard from "./pages/TeamDashboard/TeamDashboard";
import ReviewsPage from "./pages/ReviewsPage";
import ProductsPage from "./pages/ProductsPage/ProductsPage";
import ProductDetailsPage from "./pages/ProductDetailsPage.tsx";
import CreateReviewPage from "./pages/CreraateReviewPage.tsx";
import ReviewEditor from './components/ReviewEditor';
import ContractsPage from "./pages/ContractsPage.tsx";
import ContractDetailsPage from "./pages/ContractDetailsPage.tsx";
import ContractCreatePage from "./pages/ContractCreatePage.tsx";
import TaskOrderPage from "./pages/TaskOrdersPage.tsx";
import TaskOrderCreatePage from "./pages/TaskOrderCreatePage.tsx";
import TaskOrdersListPage from "./pages/TaskOrdersListPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

// Component to handle conditional sidebar rendering
function AppLayout() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* ✅ Sidebar is displayed only when authenticated */}
      {isAuthenticated && <Sidebar />}

      {/* ✅ Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto", // ✅ Allow scrolling!
          transition: "padding-left 0.s ease-in-out",
        }}
      >
        <Routes>
          {/* ✅ Redirect to /dashboard if authenticated */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Login />} />
          <Route path="/admin/teams" element={isAuthenticated ? <TeamsPage /> : <Login />} />
          <Route path="/admin/teams/:teamId" element={isAuthenticated ? <TeamManagement /> : <Login />} />
          <Route path="/admin/users" element={isAuthenticated ? <UserManagement /> : <Login />} />
          <Route path="/dev/graphql" element={isAuthenticated ? <GraphQLPlayground /> : <Login />} />
          <Route path="/teams" element={isAuthenticated ? <UserTeamPage /> : <Login />} />
          <Route path="/notifications" element={isAuthenticated ? <NotificationsPage /> : <Login />} />
          <Route path="/teams/:teamId" element={isAuthenticated ? <TeamDashboard /> : <Login />} />
          <Route path="/reviews" element={isAuthenticated ? <ReviewsPage /> : <Login />} />
          <Route path="/products" element={isAuthenticated ? <ProductsPage /> : <Login /> } />
          <Route path="/products/:productId" element= {<ProductDetailsPage /> } />
          <Route path="/reviews/create/:productId" element={<CreateReviewPage />} />
          <Route path="/reviews/:reviewId" element={<ReviewEditor />} />
          <Route path ="/contracts" element={isAuthenticated ? <ContractsPage /> : <Login />} />
          <Route path = "/contracts/:contractId" element={isAuthenticated ? <ContractDetailsPage /> : <Login />} />
          <Route path = "/contracts/create" element={isAuthenticated ? <ContractCreatePage /> : <Login />} />
          <Route path = "/task-orders" element={isAuthenticated ? <TaskOrdersListPage /> : <Login />} />
          <Route path = "/task-orders/:taskOrderId" element={isAuthenticated ? <TaskOrderPage /> : <Login />} />
          <Route path = "/task-orders/create" element={isAuthenticated ? <TaskOrderCreatePage /> : <Login />} />
          <Route path = "/profile" element={isAuthenticated ? <ProfilePage /> : <Login />} />
          <Route path = "/settings" element={isAuthenticated ? <SettingsPage /> : <Login />} />
          {/* Add more routes here */}
          {/* Redirect to login if not authenticated */}
        </Routes>
      </Box>
    </Box>
  );
}

// ✅ Wrap everything in ThemeProviderWrapper for Dark/Light mode support
export default function App() {
  return (
    <ThemeProviderWrapper>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <SettingsProvider>
              <NotificationProvider>
                <AppLayout />
              </NotificationProvider>
            </SettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProviderWrapper>
  );
}
