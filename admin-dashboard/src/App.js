import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Components (to be created)
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Artists from './pages/Artists';
import ArtPieces from './pages/ArtPieces';
import Orders from './pages/Orders';
import Payouts from './pages/Payouts';
import InviteCodes from './pages/InviteCodes';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#20b2c4', // Teal - 50%
      light: '#5cc4d1',
      dark: '#178996',
      contrastText: '#fff',
    },
    secondary: {
      main: '#bd1398', // Magenta
      light: '#d145b3',
      dark: '#8a0d6b',
      contrastText: '#fff',
    },
    info: {
      main: '#a61f70', // Deep pink
      light: '#c24f8f',
      dark: '#75164f',
    },
    success: {
      main: '#20b2c4', // Using primary teal
      light: '#5cc4d1',
      dark: '#178996',
    },
    warning: {
      main: '#e8bde7', // Light pink
      light: '#f0d4ef',
      dark: '#d19ad0',
      contrastText: '#333',
    },
    error: {
      main: '#ca1687', // Pink
      light: '#d945a4',
      dark: '#8f1060',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="artists" element={<Artists />} />
          <Route path="art-pieces" element={<ArtPieces />} />
          <Route path="orders" element={<Orders />} />
          <Route path="payouts" element={<Payouts />} />
          <Route path="invite-codes" element={<InviteCodes />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
