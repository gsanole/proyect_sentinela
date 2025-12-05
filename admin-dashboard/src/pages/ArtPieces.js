import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
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
import { CheckCircle, Cancel, Image as ImageIcon } from '@mui/icons-material';
import api from '../services/api';

function ArtPieces() {
  const [artPieces, setArtPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: 'pending', search: '' });
  const [rejectDialog, setRejectDialog] = useState({ open: false, artPieceId: null, reason: '' });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadArtPieces();
  }, [filters]);

  const loadArtPieces = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getArtPieces(filters);
      setArtPieces(response.data.data.artPieces);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load art pieces');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (artPieceId) => {
    try {
      await api.approveArtPiece(artPieceId);
      setSuccessMessage('Art piece approved successfully');
      loadArtPieces();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to approve art piece');
    }
  };

  const handleRejectSubmit = async () => {
    try {
      await api.rejectArtPiece(rejectDialog.artPieceId, { reason: rejectDialog.reason });
      setSuccessMessage('Art piece rejected');
      setRejectDialog({ open: false, artPieceId: null, reason: '' });
      loadArtPieces();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reject art piece');
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: '#1a1a1a', mb: 1 }}>
          Art Pieces Approval
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review and approve art listings for the marketplace
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

      <Box sx={{ mb: 3, p: 2, bgcolor: 'white', border: '1px solid #e0e0e0', borderRadius: 2 }}>
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
            placeholder="Search by title, artist, or category..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            size="small"
            sx={{ flexGrow: 1 }}
          />
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : artPieces.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'white', border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <ImageIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography color="text.secondary">No art pieces found</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {artPieces.map((piece) => (
            <Grid item xs={12} sm={6} md={4} key={piece.id}>
              <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ position: 'relative', paddingTop: '75%', bgcolor: '#f5f5f5' }}>
                  {piece.primary_image ? (
                    <CardMedia
                      component="img"
                      image={piece.primary_image}
                      alt={piece.title}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ImageIcon sx={{ fontSize: 64, color: '#ccc' }} />
                    </Box>
                  )}
                  <Chip
                    label={piece.approval_status}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      bgcolor: `${getStatusColor(piece.approval_status)}`,
                      color: 'white',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom noWrap>
                    {piece.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    by {piece.artist_name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    {piece.category_name && (
                      <Chip label={piece.category_name} size="small" variant="outlined" />
                    )}
                    {piece.medium && (
                      <Chip label={piece.medium} size="small" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="#20b2c4" gutterBottom>
                    ${parseFloat(piece.price).toFixed(2)}
                  </Typography>
                  {piece.description && (
                    <Typography variant="body2" color="text.secondary" sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {piece.description}
                    </Typography>
                  )}
                </CardContent>
                {piece.approval_status === 'pending' && (
                  <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<CheckCircle />}
                      onClick={() => handleApprove(piece.id)}
                      sx={{ bgcolor: '#20b2c4', '&:hover': { bgcolor: '#178996' } }}
                    >
                      Approve
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={() => setRejectDialog({ open: true, artPieceId: piece.id, reason: '' })}
                      sx={{ borderColor: '#ca1687', color: '#ca1687', '&:hover': { borderColor: '#8f1060', bgcolor: '#ca168710' } }}
                    >
                      Reject
                    </Button>
                  </CardActions>
                )}
                {piece.approval_status === 'rejected' && piece.rejected_reason && (
                  <CardContent sx={{ pt: 0 }}>
                    <Alert severity="error" sx={{ fontSize: '0.75rem' }}>
                      {piece.rejected_reason}
                    </Alert>
                  </CardContent>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, artPieceId: null, reason: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Art Piece</DialogTitle>
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
          <Button onClick={() => setRejectDialog({ open: false, artPieceId: null, reason: '' })}>
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

export default ArtPieces;
