import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  Paper,
  Link,
  Divider,
  Stack,
} from "@mui/material";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  useEffect(() => {
    if (auth?.isAuthenticated) {
      navigate("/dashboard");
    }
  }, [auth?.isAuthenticated, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      if (isRegistering) {
        await auth?.register(username, password);
      } else {
        await auth?.login(username, password);
      }
    } catch (err) {
      console.error("Auth error:", err);
      
      // Better error handling to extract message from API response
      let errorMessage = "An unexpected error occurred.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        try {
          // Try to parse the error as JSON
          const parsedError = JSON.parse(err);
          
          // Extract the message field from the response
          if (parsedError.message) {
            errorMessage = parsedError.message;
          } else if (parsedError.errors?.error) {
            errorMessage = parsedError.errors.error;
          }
        } catch (parseError) {
          // If parsing fails, use the original error string
          errorMessage = err;
        }
      }
      
      setError(errorMessage);
    }
  };

  return (
    <Box className="login-page">
      <Box className="login-container">
        <Paper className="login-box" elevation={3}>
          {/* Enhanced Title Section */}
          <Box className="login-title">
            <Typography 
              variant="h4" 
              fontWeight="bold"
              color="primary"
              className="app-title"
            >
              TERRA
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Terrain Enterprise Review & Reporting Application
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {isRegistering ? "Create Account" : "Welcome Back"}
          </Typography>

          <form onSubmit={handleAuth}>
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              label="Password"
              variant="outlined"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              required
            />

            {isRegistering && (
              <TextField
                label="Confirm Password"
                variant="outlined"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{ mb: 2 }}
                required
              />
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              variant="contained"
              color="primary"
              fullWidth
              type="submit"
              sx={{ mb: 2 }}
            >
              {isRegistering ? "Sign Up" : "Login"}
            </Button>
          </form>

          <Button
            variant="text"
            fullWidth
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
              setPassword("");
              setConfirmPassword("");
            }}
          >
            {isRegistering
              ? "Already have an account? Login"
              : "Don't have an account? Register"}
          </Button>
          
          {/* Footer with additional information */}
          <Box className="login-footer" sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee" }}>
            <Stack spacing={1} sx={{ textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Version 1.0.0 • © 2025 Zac Nixon
              </Typography>
              <Box>
                <Link href="#" underline="hover" sx={{ mx: 1 }} fontSize="small">
                  Help
                </Link>
                <Link href="#" underline="hover" sx={{ mx: 1 }} fontSize="small">
                  Privacy
                </Link>
                <Link href="#" underline="hover" sx={{ mx: 1 }} fontSize="small">
                  Terms
                </Link>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Developed by Your Name • <Link href="mailto:support@example.com">support@example.com</Link>
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Login;
