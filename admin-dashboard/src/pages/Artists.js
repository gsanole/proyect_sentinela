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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import api from '../services/api';

function Artists() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [rejectDialog, setRejectDialog] = useState({ open: false, artistId: null, reason: '' });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadArtists();
  }, [filters]);

  const loadArtists = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getArtists(filters);
      setArtists(response.data.data.artists);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load artists');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (artistId) => {
    try {
      await api.approveArtist(artistId);
      setSuccessMessage('Artist approved successfully');
      loadArtists();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to approve artist');
    }
  };

  const handleRejectSubmit = async () => {
    try {
      await api.rejectArtist(rejectDialog.artistId, { reason: rejectDialog.reason });
      setSuccessMessage('Artist rejected');
      setRejectDialog({ open: false, artistId: null, reason: '' });
      loadArtists();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reject artist');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#20b2c4';
      case 'pending': return '#e8bde7';
      case 'rejected': return '#ca1687';
      default: return '#999';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#1a1a1a', mb: 1 }}>
            Artists Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and manage artist applications
          </Typography>
        </Box>
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
        <Box sx={{ display: 'flex', gap: 2 }}>
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
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
          <TextField
            label="Search"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            size="small"
            sx={{ flexGrow: 1 }}
          />
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f7fa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Artist</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Art Pieces</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Total Sales</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : artists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No artists found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              artists.map((artist) => (
                <TableRow key={artist.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {artist.full_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {artist.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={artist.approval_status || 'pending'}
                      size="small"
                      sx={{
                        bgcolor: `${getStatusColor(artist.approval_status)}15`,
                        color: getStatusColor(artist.approval_status),
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{artist.art_pieces_count}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      ${parseFloat(artist.total_sales || 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(artist.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {artist.approval_status === 'pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              onClick={() => handleApprove(artist.id)}
                              sx={{ color: '#20b2c4', '&:hover': { bgcolor: '#20b2c415' } }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              onClick={() => setRejectDialog({ open: true, artistId: artist.id, reason: '' })}
                              sx={{ color: '#ca1687', '&:hover': { bgcolor: '#ca168715' } }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {artist.approval_status === 'rejected' && artist.rejected_reason && (
                        <Tooltip title={`Rejected: ${artist.rejected_reason}`}>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, artistId: null, reason: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Artist Application</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
            placeholder="Provide a reason for rejection..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, artistId: null, reason: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectSubmit}
            variant="contained"
            disabled={!rejectDialog.reason}
            sx={{ bgcolor: '#ca1687', '&:hover': { bgcolor: '#8f1060' } }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Artists;
