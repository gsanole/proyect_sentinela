import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Palette,
  Image,
  ShoppingCart,
  Payment,
  CardGiftcard,
  Logout
} from '@mui/icons-material';
import authService from '../services/auth.service';

const drawerWidth = 280;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', color: '#20b2c4' },
  { text: 'Artists', icon: <Palette />, path: '/artists', color: '#bd1398' },
  { text: 'Art Pieces', icon: <Image />, path: '/art-pieces', color: '#a61f70' },
  { text: 'Orders', icon: <ShoppingCart />, path: '/orders', color: '#20b2c4' },
  { text: 'Payouts', icon: <Payment />, path: '/payouts', color: '#e8bde7' },
  { text: 'Invite Codes', icon: <CardGiftcard />, path: '/invite-codes', color: '#ca1687' },
];

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUserData();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          bgcolor: 'white',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ 
            flexGrow: 1,
            fontWeight: 700,
            color: '#1a1a1a'
          }}>
            Art Hub Milwaukee Admin
          </Typography>
          <Chip
            label={user?.email || 'Admin'}
            size="small"
            sx={{ 
              mr: 2,
              bgcolor: '#f0f0f0',
              fontWeight: 600,
              fontSize: '0.8rem'
            }}
          />
          <IconButton 
            onClick={handleLogout}
            sx={{
              color: '#666',
              '&:hover': {
                bgcolor: '#f5f5f5',
                color: '#bd1398'
              }
            }}
          >
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'white',
            borderRight: '1px solid #e0e0e0'
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid #e0e0e0',
          bgcolor: 'white'
        }}>
          <Typography variant="h5" fontWeight={800} sx={{ 
            color: '#20b2c4',
            mb: 0.5
          }}>
            🎨 Art Hub
          </Typography>
          <Typography variant="caption" sx={{ 
            color: '#666',
            letterSpacing: '0.5px',
            fontWeight: 500,
            textTransform: 'uppercase',
            fontSize: '0.7rem'
          }}>
            Milwaukee Admin
          </Typography>
        </Box>
        
        <List sx={{ px: 2, pt: 3 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    position: 'relative',
                    '&::before': isActive ? {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: item.color,
                      borderRadius: '0 4px 4px 0'
                    } : {},
                    bgcolor: isActive ? `${item.color}15` : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? `${item.color}20` : '#f5f5f5'
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: isActive ? item.color : '#666',
                    minWidth: 40
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ 
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.95rem',
                      color: isActive ? '#1a1a1a' : '#666'
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        
        <Box sx={{ 
          mt: 'auto', 
          p: 3, 
          borderTop: '1px solid #e0e0e0'
        }}>
          <Typography variant="caption" sx={{ 
            color: '#999',
            fontSize: '0.7rem',
            display: 'block',
            textAlign: 'center'
          }}>
            © 2025 Art Hub Milwaukee
          </Typography>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#f5f7fa',
          p: 4,
          width: `calc(100% - ${drawerWidth}px)`,
          mt: 8,
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
