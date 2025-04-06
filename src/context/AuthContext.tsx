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
}

// ✅ Provide a Default Value (without authToken)
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  userRole: undefined, // Optional
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>(""); // Store user role
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");

    if (token) {
      setIsAuthenticated(true);
      setAuthToken(token);
      setUserRole(role || ""); // Default to empty string if no role is set
    }

    const unlisten = listen("tauri://close-requested", () => {
      console.log("Application is closing, logging out...");
      logout();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const login = async (username: string, password: string) => {
    console.log(`🔄 Attempting login for user: "${username}"`);

    try {
      // 🔹 Invoke the Tauri backend login command expecting a tuple
      const [token, role]: [string, string] = await invoke("login", { username, password });

      if (!token || !role) {
        throw new Error("Authentication failed: Token or role missing.");
      }

      localStorage.setItem("authToken", token);
      localStorage.setItem("userRole", role);

      setIsAuthenticated(true);
      setAuthToken(token);
      setUserRole(role);

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
    setIsAuthenticated(false);
    setAuthToken(null);
    setUserRole("");
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
