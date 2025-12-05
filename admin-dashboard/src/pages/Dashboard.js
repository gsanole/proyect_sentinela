import React, { useState, useEffect } from 'react';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  PeopleAlt,
  Palette,
  ShoppingCart,
  AttachMoney,
  TrendingUp,
  Warning
} from '@mui/icons-material';
import api from '../services/api';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getDashboardStats();
      setStats(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <Card 
      elevation={0}
      sx={{
        background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
        border: `2px solid ${color}30`,
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${color}25`,
          borderColor: `${color}60`
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box flex={1}>
            <Typography 
              variant="overline" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: 1.2,
                fontSize: '0.7rem'
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h3" 
              component="div"
              sx={{ 
                fontWeight: 800,
                background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mt: 1,
                mb: 1
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 600
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`,
              borderRadius: 2.5,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 16px ${color}40`
            }}
          >
            <Icon sx={{ fontSize: 32, color: 'white' }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Box sx={{ p: 1 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 800,
            background: 'linear-gradient(135deg, #20b2c4 0%, #bd1398 50%, #a61f70 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1
          }}
        >
          Dashboard Overview
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
          Welcome back! Here's what's happening with your art marketplace today.
        </Typography>
      </Box>

      {/* Pending Approvals Alert */}
      {(stats.pending.artists > 0 || stats.pending.artPieces > 0) && (
        <Alert 
          severity="warning" 
          icon={<Warning />} 
          sx={{ 
            mb: 4,
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'warning.light',
            background: 'linear-gradient(135deg, #fff8e1 0%, #ffffff 100%)',
            '& .MuiAlert-icon': {
              fontSize: 28
            }
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            You have <strong>{stats.pending.artists}</strong> pending artist approval{stats.pending.artists !== 1 ? 's' : ''} and{' '}
            <strong>{stats.pending.artPieces}</strong> pending art piece{stats.pending.artPieces !== 1 ? 's' : ''}
          </Typography>
        </Alert>
      )}

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.overview.totalUsers}
            icon={PeopleAlt}
            color="#20b2c4"
            subtitle={`+${stats.recentActivity.usersLast30Days} this month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Artists"
            value={stats.overview.totalArtists}
            icon={Palette}
            color="#bd1398"
            subtitle={`${stats.pending.artists} pending approval`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Art Pieces"
            value={stats.overview.totalArtPieces}
            icon={ShoppingCart}
            color="#a61f70"
            subtitle={`${stats.pending.artPieces} pending review`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`$${stats.overview.totalRevenue.toLocaleString()}`}
            icon={AttachMoney}
            color="#ca1687"
            subtitle={`${stats.overview.totalOrders} total orders`}
          />
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4,
              borderRadius: 3,
              border: '2px solid',
              borderColor: 'grey.200',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#20b2c4',
                boxShadow: '0 8px 24px rgba(32, 178, 196, 0.15)'
              }
            }}
          >
            <Box display="flex" alignItems="center" mb={3}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #20b2c4 0%, #bd1398 100%)',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  mr: 2
                }}
              >
                <TrendingUp sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>Recent Activity (30 Days)</Typography>
            </Box>
            <Box>
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                mb={2.5}
                p={2}
                sx={{
                  borderRadius: 2,
                  background: 'white',
                  border: '1px solid',
                  borderColor: 'grey.100'
                }}
              >
                <Typography color="text.secondary" fontWeight={600}>New Orders</Typography>
                <Typography variant="h5" fontWeight={800} color="#20b2c4">
                  {stats.recentActivity.ordersLast30Days}
                </Typography>
              </Box>
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                mb={2.5}
                p={2}
                sx={{
                  borderRadius: 2,
                  background: 'white',
                  border: '1px solid',
                  borderColor: 'grey.100'
                }}
              >
                <Typography color="text.secondary" fontWeight={600}>New Users</Typography>
                <Typography variant="h5" fontWeight={800} color="#bd1398">
                  {stats.recentActivity.usersLast30Days}
                </Typography>
              </Box>
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                p={2}
                sx={{
                  borderRadius: 2,
                  background: 'white',
                  border: '1px solid',
                  borderColor: 'grey.100'
                }}
              >
                <Typography color="text.secondary" fontWeight={600}>Pending Approvals</Typography>
                <Typography variant="h5" fontWeight={800} color="#a61f70">
                  {stats.pending.artists + stats.pending.artPieces}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 4,
              borderRadius: 3,
              border: '2px solid',
              borderColor: 'grey.200',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#bd1398',
                boxShadow: '0 8px 24px rgba(189, 19, 152, 0.15)'
              }
            }}
          >
            <Box display="flex" alignItems="center" mb={3}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #bd1398 0%, #a61f70 100%)',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  mr: 2
                }}
              >
                <Palette sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>Top Categories</Typography>
            </Box>
            {stats.topCategories.length > 0 ? (
              <Box>
                {stats.topCategories.map((category, index) => (
                  <Box 
                    key={index} 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center"
                    mb={2.5}
                    p={2}
                    sx={{
                      borderRadius: 2,
                      background: 'white',
                      border: '1px solid',
                      borderColor: 'grey.100'
                    }}
                  >
                    <Typography color="text.secondary" fontWeight={600}>{category.name}</Typography>
                    <Typography variant="h6" fontWeight={800} color="#ca1687">
                      {category.sales_count} sales
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box 
                sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  background: 'white',
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'grey.300'
                }}
              >
                <Typography color="text.secondary" fontWeight={500}>
                  No sales data available yet
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
