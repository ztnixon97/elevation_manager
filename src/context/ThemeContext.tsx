import React, { createContext, useState, useMemo, useEffect } from "react";
import { ThemeProvider, createTheme, PaletteMode, CssBaseline, GlobalStyles } from "@mui/material";

// Define Theme Context
export const ThemeContext = createContext({
  toggleTheme: () => {},
  mode: "light" as PaletteMode,
});

// Function to create Light and Dark Themes
const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      background: { default: mode === "dark" ? "#1E1E1E" : "#f5f5f5" },
      text: { primary: mode === "dark" ? "#ffffff" : "#000000" },
    },
  });

export const ThemeProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storedTheme = (localStorage.getItem("appTheme") as PaletteMode) || "light";
  const [mode, setMode] = useState<PaletteMode>(storedTheme);

  useEffect(() => {
    localStorage.setItem("appTheme", mode);
  }, [mode]);

  const toggleTheme = () => setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            "::-webkit-scrollbar": {
              width: "10px",
            },
            "::-webkit-scrollbar-thumb": {
              background: mode === "dark" ? "#888" : "#ccc",
              borderRadius: "5px",
            },
            "::-webkit-scrollbar-thumb:hover": {
              background: mode === "dark" ? "#555" : "#999",
            },
            "::-webkit-scrollbar-track": {
              background: mode === "dark" ? "#222" : "#eee",
            },
            "*": {
              scrollbarColor: mode === "dark" ? "#888 #222" : "#ccc #eee",
            },
          }}
        />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
