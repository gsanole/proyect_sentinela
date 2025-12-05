import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import api from '../services/api';

function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: 'pending' });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadPayouts();
  }, [filters]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getPayouts(filters);
      setPayouts(response.data.data.payouts);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (payoutId) => {
    try {
      await api.processPayout(payoutId);
      setSuccessMessage('Payout processed successfully');
      loadPayouts();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to process payout');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed': return '#20b2c4';
      case 'pending': return '#e8bde7';
      case 'failed': return '#ca1687';
      default: return '#999';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: '#1a1a1a', mb: 1 }}>
          Payouts Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Process artist payouts and track payment history
        </Typography>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <TextField
          select
          label="Status"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="processed">Processed</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
        </TextField>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f7fa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Artist</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Orders</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Processed</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : payouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No payouts found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              payouts.map((payout) => (
                <TableRow key={payout.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {payout.artist_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {payout.artist_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="#20b2c4">
                      ${parseFloat(payout.amount).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{payout.orders_count}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payout.status}
                      size="small"
                      sx={{
                        bgcolor: `${getStatusColor(payout.status)}15`,
                        color: getStatusColor(payout.status),
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {payout.status === 'pending' && (
                      <Tooltip title="Process Payout">
                        <IconButton
                          size="small"
                          onClick={() => handleProcessPayout(payout.id)}
                          sx={{ color: '#20b2c4', '&:hover': { bgcolor: '#20b2c415' } }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Payouts;
