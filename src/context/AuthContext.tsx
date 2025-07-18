import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Define authentication context type
interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  userRole?: string;
  userId?: string;
  username?: string;
}

// ✅ Provide a Default Value (without authToken)
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  userRole: undefined, // Optional
  userId: undefined,
  username: undefined,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>(""); // Store user role
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");
    const storedUserId = localStorage.getItem("userId");
    const storedUsername = localStorage.getItem("username");

    if (token) {
      setIsAuthenticated(true);
      setAuthToken(token);
      setUserRole(role || ""); // Default to empty string if no role is set
      setUserId(storedUserId || undefined);
      setUsername(storedUsername || undefined);
    }

    const unlisten = listen("tauri://close-requested", () => {
      console.log("Application is closing, logging out...");
      logout();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const login = async (usernameInput: string, password: string) => {
    console.log(`🔄 Attempting login for user: "${usernameInput}"`);

    try {
      // 🔹 Invoke the Tauri backend login command expecting a tuple
      const [token, role]: [string, string] = await invoke("login", { username: usernameInput, password });

      if (!token || !role) {
        throw new Error("Authentication failed: Token or role missing.");
      }

      // Set token and role in localStorage before fetching user info
      localStorage.setItem("authToken", token);
      localStorage.setItem("userRole", role);

      // Fetch user info (id, username) after login
      const userInfoResponse = await invoke<string>("get_me");
      const userInfo = JSON.parse(userInfoResponse);
      const fetchedUserId = userInfo?.data?.id?.toString();
      const fetchedUsername = userInfo?.data?.username;

      if (fetchedUserId) localStorage.setItem("userId", fetchedUserId);
      if (fetchedUsername) localStorage.setItem("username", fetchedUsername);

      setIsAuthenticated(true);
      setAuthToken(token);
      setUserRole(role);
      setUserId(fetchedUserId);
      setUsername(fetchedUsername);

      console.log("✅ Login successful with role:", role);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("❌ Login error:", error);
      throw new Error(typeof error === "string" ? error : error?.message || "An unexpected error occurred.");
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const response = await invoke<string>("register", { username, password });
  
      console.log("✅ Registration response:", response);
  
      // 🔹 After registration, immediately try to log in
      await login(username, password);
    } catch (error) {
      console.error("❌ Registration failed:", error);
      throw new Error(
        error instanceof Error ? error.message : "Registration failed"
      );
    }
  };
  
  

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
    setAuthToken(null);
    setUserRole("");
    setUserId(undefined);
    setUsername(undefined);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, username, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
