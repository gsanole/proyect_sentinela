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
import { Add, Block, ContentCopy } from '@mui/icons-material';
import api from '../services/api';

function InviteCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '' });
  const [createDialog, setCreateDialog] = useState({ open: false, maxUses: '', expiresInDays: '' });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadCodes();
  }, [filters]);

  const loadCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getInviteCodes(filters);
      setCodes(response.data.data.inviteCodes);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    try {
      const data = {};
      if (createDialog.maxUses) data.maxUses = parseInt(createDialog.maxUses);
      if (createDialog.expiresInDays) data.expiresInDays = parseInt(createDialog.expiresInDays);
      
      const response = await api.generateInviteCode(data);
      const newCode = response.data.data.code;
      
      // Copy to clipboard
      navigator.clipboard.writeText(newCode);
      
      setSuccessMessage(`Invite code generated: ${newCode} (copied to clipboard)`);
      setCreateDialog({ open: false, maxUses: '', expiresInDays: '' });
      loadCodes();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to generate invite code');
    }
  };

  const handleDeactivate = async (codeId) => {
    try {
      await api.deactivateInviteCode(codeId);
      setSuccessMessage('Invite code deactivated');
      loadCodes();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to deactivate code');
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setSuccessMessage('Code copied to clipboard');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const isCodeActive = (code) => {
    if (!code.is_active) return false;
    if (code.expires_at && new Date(code.expires_at) < new Date()) return false;
    if (code.max_uses && code.uses_count >= code.max_uses) return false;
    return true;
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#1a1a1a', mb: 1 }}>
            Invite Codes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate and manage artist invite codes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialog({ open: true, maxUses: '', expiresInDays: '' })}
          sx={{ bgcolor: '#20b2c4', '&:hover': { bgcolor: '#178996' } }}
        >
          Generate Code
        </Button>
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
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f7fa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Uses</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Max Uses</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Expires</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
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
            ) : codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No invite codes found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => (
                <TableRow key={code.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                        {code.code}
                      </Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(code.code)}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isCodeActive(code) ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        bgcolor: isCodeActive(code) ? '#20b2c415' : '#99999915',
                        color: isCodeActive(code) ? '#20b2c4' : '#999',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{code.uses_count}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{code.max_uses || 'Unlimited'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{code.created_by_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(code.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {isCodeActive(code) && (
                      <Tooltip title="Deactivate">
                        <IconButton
                          size="small"
                          onClick={() => handleDeactivate(code.id)}
                          sx={{ color: '#ca1687', '&:hover': { bgcolor: '#ca168715' } }}
                        >
                          <Block fontSize="small" />
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

      <Dialog open={createDialog.open} onClose={() => setCreateDialog({ open: false, maxUses: '', expiresInDays: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Invite Code</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Max Uses (optional)"
            type="number"
            value={createDialog.maxUses}
            onChange={(e) => setCreateDialog({ ...createDialog, maxUses: e.target.value })}
            placeholder="Leave empty for unlimited"
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Expires in Days (optional)"
            type="number"
            value={createDialog.expiresInDays}
            onChange={(e) => setCreateDialog({ ...createDialog, expiresInDays: e.target.value })}
            placeholder="Leave empty for no expiration"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog({ open: false, maxUses: '', expiresInDays: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateCode}
            variant="contained"
            sx={{ bgcolor: '#20b2c4', '&:hover': { bgcolor: '#178996' } }}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InviteCodes;
