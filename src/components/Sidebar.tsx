// src/components/Sidebar.tsx
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Collapse,
  Button,
  Box,
  Typography,
  Badge,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Inventory,
  Groups,
  VerifiedUser,
  Settings,
  Logout,
  AdminPanelSettings,
  People,
  Person,
  DarkMode,
  LightMode,
  TextSnippet,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import NotificationDrawer from "./NotificationDrawer";
import { useNotifications } from "../context/NotificationContext";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext);
  const { mode, toggleTheme } = useContext(ThemeContext);
  const { unreadCount } = useNotifications();

  if (!auth) return null;
  const { logout, userRole } = auth;

  // Sidebar Collapsed State (Persisted)
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  // Admin Section Expanded State
  const [isAdminExpanded, setIsAdminExpanded] = useState<boolean>(
    () => localStorage.getItem("adminExpanded") === "true"
  );

  // Notification drawer state
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
    localStorage.setItem("adminExpanded", String(isAdminExpanded));
  }, [collapsed, isAdminExpanded]);

  // Toggle Sidebar
  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  // Toggle Admin Section
  const toggleAdminSection = () => {
    setIsAdminExpanded((prev) => !prev);
  };

  // Open notification drawer
  const openNotificationDrawer = () => {
    setNotificationDrawerOpen(true);
  };

  // **Dynamic Theme Colors**
  const iconColor = mode === "dark" ? "#90caf9" : "#1976d2"; // Adjust icon color based on theme
  const hoverBgColor = mode === "dark" ? "rgba(144, 202, 249, 0.2)" : "rgba(33, 150, 243, 0.2)";

  // Sidebar Links
  const navLinks = [
    { name: "Dashboard", url: "/dashboard", icon: <Home /> },
    { name: "Products", url: "/products", icon: <Inventory /> },
    { name: "Teams", url: "/teams", icon: <Groups /> },
    { name: "Reviews", url: "/reviews", icon: <VerifiedUser /> },
    { name: "GraphQL", url: "/dev/graphql", icon: <TextSnippet /> },
    { 
      name: "Notifications", 
      url: "/notifications", 
      icon: (
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          invisible={unreadCount === 0}
        >
          <NotificationsIcon />
        </Badge>
      ) 
    },
    { name: "Settings", url: "/settings", icon: <Settings /> },
  ];

  // Admin Section Links (If user is admin)
  const adminLinks =
    userRole === "admin"
      ? [
          { name: "Team Management", url: "/admin/teams", icon: <People /> },
          { name: "User Management", url: "/admin/users", icon: <Person /> },
        ]
      : [];

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: collapsed ? 64 : 240,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)", // 🔥 Smooth width transition
          "& .MuiDrawer-paper": {
            width: collapsed ? 64 : 240,
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease-in-out",
            backgroundColor: mode === "dark" ? "#1E1E1E" : "#FFF",
            color: mode === "dark" ? "#FFF" : "#000",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${mode === "dark" ? "#333" : "#ddd"}`,
          },
        }}
      >
        {/* Sidebar Header with Toggle Button */}
        <List sx={{ flexShrink: 0 }}>
          <ListItemButton onClick={toggleSidebar} sx={{ justifyContent: "center", p: 1 }}>
            <ListItemIcon
              sx={{
                color: iconColor,
                transition: "transform 0.3s ease-in-out",
                transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
              }}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </ListItemIcon>
          </ListItemButton>
        </List>

        <Divider sx={{ backgroundColor: mode === "dark" ? "#333" : "#ddd" }} />

        {/* Sidebar Content (Scrollable) */}
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}> {/* This makes the main content scrollable */}
          <List>
            {navLinks.map((link) => (
              <ListItemButton
                key={link.name}
                selected={location.pathname === link.url}
                onClick={() => {
                  if (link.name === "Notifications" && unreadCount > 0) {
                    openNotificationDrawer();
                  } else {
                    navigate(link.url);
                  }
                }}
                sx={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  transition: "all 0.3s ease-in-out",
                  "&.Mui-selected": { backgroundColor: hoverBgColor, color: iconColor },
                  "&:hover": { backgroundColor: hoverBgColor },
                }}
              >
                <ListItemIcon
                  sx={{
                      transform: collapsed? "scaleX(1)" : "scaleX(1)",
                      color: iconColor,
                      transition: "opacity 0.2s ease-in-out, transform 0.3s ease-in-out",
                      minWidth: 40 }}>{link.icon}</ListItemIcon>
                {!collapsed && <ListItemText primary={link.name} />}
              </ListItemButton>
            ))}
          </List>

         {/* Admin Section */}
          {adminLinks.length > 0 && (
            <>
              <Divider sx={{ backgroundColor: mode === "dark" ? "#333" : "#ddd" }} />
              
              {/* Admin Section Expander (Aligned with Sidebar Buttons) */}
              <ListItemButton
                onClick={toggleAdminSection}
                sx={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  px: collapsed ? 1.5 : 2,
                  py: 0.5, // Keep height consistent
                  minHeight: 40, // Align with other buttons
                }}
              >
                <ListItemIcon sx={{ color: iconColor, minWidth: 40 }}>
                  <AdminPanelSettings />
                </ListItemIcon>
                {!collapsed && (
                  <>
                    <ListItemText
                      primary="Admin"
                      sx={{
                        textTransform: "uppercase",
                        fontWeight: "bold",
                        color: iconColor,
                        fontSize: "0.875rem",
                      }}
                    />
                    <ListItemIcon sx={{ color: iconColor, minWidth: 24 }}>
                      {isAdminExpanded ? <ChevronLeft /> : <ChevronRight />}
                    </ListItemIcon>
                  </>
                )}
              </ListItemButton>

              {/* Admin Links (Properly Aligned with Sidebar Buttons) */}
              <Collapse in={isAdminExpanded} timeout="auto" unmountOnExit>
                <List sx={{ pl: collapsed ? 0 : 2 }}>
                  {adminLinks.map((link) => (
                    <ListItemButton
                      key={link.name}
                      onClick={() => navigate(link.url)}
                      sx={{
                        justifyContent: collapsed ? "center" : "flex-start",
                        px: collapsed ? 1.5 : 2,
                        py: 0.5, // Keep height consistent
                        minHeight: 40, // Align with other buttons
                      }}
                    >
                      <ListItemIcon sx={{ color: iconColor, minWidth: 40 }}>
                        {link.icon}
                      </ListItemIcon>
                      {!collapsed && <ListItemText primary={link.name} />}
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </>
          )}
        </Box>

        {/* Bottom Buttons (Fixed at Bottom) */}
        <Box sx={{ flexShrink: 0, pb: 2 }}>
          <Button
            onClick={toggleTheme}
            variant="contained"
            sx={{
              width: "90%",
              mx: "auto",
              mt: 2,
              backgroundColor: mode === "dark" ? "#424242" : "#f0f0f0",
              color: mode === "dark" ? "#ffffff" : "#000000",
              "&:hover": { backgroundColor: mode === "dark" ? "#616161" : "#d9d9d9" },
            }}
          >
            {mode === "dark" ? <LightMode sx={{ mr: 1, color: "#ffeb3b" }} /> : <DarkMode sx={{ mr: 1, color: "#ff9800" }} />}
            {collapsed ? "" : mode === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>

          <ListItemButton onClick={logout}>
            <ListItemIcon sx={{ color: iconColor }}>
              <Logout />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Logout" />}
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Notification Drawer */}
      <NotificationDrawer 
        open={notificationDrawerOpen} 
        onClose={() => setNotificationDrawerOpen(false)} 
      />
    </>
  );
};

export default Sidebar;
