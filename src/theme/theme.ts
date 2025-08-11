// src/theme/theme.ts
import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    tertiary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    gradient: {
      primary: string;
      secondary: string;
      accent: string;
    };
  }

  interface PaletteOptions {
    tertiary?: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    gradient?: {
      primary: string;
      secondary: string;
      accent: string;
    };
  }
}

const createAppTheme = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#2563eb' : '#3b82f6',
      light: mode === 'light' ? '#60a5fa' : '#93c5fd',
      dark: mode === 'light' ? '#1d4ed8' : '#1e40af',
      contrastText: '#ffffff',
    },
    secondary: {
      main: mode === 'light' ? '#7c3aed' : '#8b5cf6',
      light: mode === 'light' ? '#a78bfa' : '#c4b5fd',
      dark: mode === 'light' ? '#5b21b6' : '#6d28d9',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: mode === 'light' ? '#059669' : '#10b981',
      light: mode === 'light' ? '#34d399' : '#6ee7b7',
      dark: mode === 'light' ? '#047857' : '#059669',
      contrastText: '#ffffff',
    },
    error: {
      main: mode === 'light' ? '#dc2626' : '#ef4444',
      light: mode === 'light' ? '#f87171' : '#fca5a5',
      dark: mode === 'light' ? '#b91c1c' : '#dc2626',
    },
    warning: {
      main: mode === 'light' ? '#d97706' : '#f59e0b',
      light: mode === 'light' ? '#fbbf24' : '#fcd34d',
      dark: mode === 'light' ? '#b45309' : '#d97706',
    },
    info: {
      main: mode === 'light' ? '#0ea5e9' : '#06b6d4',
      light: mode === 'light' ? '#38bdf8' : '#67e8f9',
      dark: mode === 'light' ? '#0284c7' : '#0891b2',
    },
    success: {
      main: mode === 'light' ? '#059669' : '#10b981',
      light: mode === 'light' ? '#34d399' : '#6ee7b7',
      dark: mode === 'light' ? '#047857' : '#059669',
    },
    background: {
      default: mode === 'light' ? '#f8fafc' : '#0f172a',
      paper: mode === 'light' ? '#ffffff' : '#1e293b',
    },
    text: {
      primary: mode === 'light' ? '#1e293b' : '#f1f5f9',
      secondary: mode === 'light' ? '#64748b' : '#94a3b8',
    },
    divider: mode === 'light' ? '#e2e8f0' : '#334155',
    gradient: {
      primary: mode === 'light' 
        ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
        : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      secondary: mode === 'light'
        ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'
        : 'linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%)',
      accent: mode === 'light'
        ? 'linear-gradient(135deg, #059669 0%, #0ea5e9 100%)'
        : 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      fontWeight: 400,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 12,
  },
  shadows: mode === 'light' ? [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  ] : [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 2px 0 rgba(0, 0, 0, 0.12)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: mode === 'light' ? '#cbd5e1 #f1f5f9' : '#475569 #1e293b',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: mode === 'light' ? '#f1f5f9' : '#1e293b',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: mode === 'light' ? '#cbd5e1' : '#475569',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: mode === 'light' ? '#94a3b8' : '#64748b',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: mode === 'light' ? '1px solid #f1f5f9' : '1px solid #334155',
          boxShadow: mode === 'light' 
            ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: mode === 'light'
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '10px 20px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
            '&.Mui-focused': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '2px 8px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            color: '#ffffff',
            '&:hover': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #5b21b6 100%)',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: mode === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
          background: mode === 'light' ? '#ffffff' : '#1e293b',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
          color: mode === 'light' ? '#1e293b' : '#f1f5f9',
          boxShadow: mode === 'light' 
            ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
  },
});

export const lightTheme = createTheme(createAppTheme('light'));
export const darkTheme = createTheme(createAppTheme('dark'));
export const theme = lightTheme; // Default theme