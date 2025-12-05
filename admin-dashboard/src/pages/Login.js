import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import authService from '../services/auth.service';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#f5f7fa'
    }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ 
          p: 5,
          border: '1px solid #e0e0e0',
          borderRadius: 3
        }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
            <Box
              sx={{
                bgcolor: '#20b2c4',
                borderRadius: 2,
                p: 2,
                mb: 3
              }}
            >
              <LockOutlined sx={{ color: 'white', fontSize: 40 }} />
            </Box>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#1a1a1a' }}>
              Admin Login
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Art Hub Milwaukee Administration
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoFocus
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5, bgcolor: '#20b2c4', '&:hover': { bgcolor: '#178996' } }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
            </Button>
          </form>

          <Box mt={3} p={2.5} bgcolor="#f5f7fa" borderRadius={2} border="1px solid #e0e0e0">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Default credentials:
            </Typography>
            <Typography variant="body2" fontFamily="monospace" mt={1}>
              admin@arthubmke.com
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              Admin123!
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;
