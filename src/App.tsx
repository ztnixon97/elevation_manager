// src/App.tsx - Modified to include NotificationProvider
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProviderWrapper } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
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
import ReviewPage from "./pages/ReviewPage";


const queryClient = new QueryClient();

// Component to handle conditional sidebar rendering
function AppLayout() {
  const { isAuthenticated } = useContext(AuthContext);

  // Start notification polling when app starts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      invoke('start_notification_polling').catch(err => {
        console.error('Failed to start notification polling:', err);
      });
    }
  }, [isAuthenticated]);

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
          <Route path="/reviews" element={isAuthenticated ? <ReviewPage /> : <Login />} />
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
            <NotificationProvider>
              <AppLayout />
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProviderWrapper>
  );
}
