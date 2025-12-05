const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const artistService = require('../services/artist.service');

// Middleware to check if user is an artist
const requireArtist = (req, res, next) => {
  if (req.user.role !== 'artist') {
    return res.status(403).json({
      success: false,
      error: { message 'Access denied. Artist role required.' }
    });
  }
  next();
};

// GET /api/v1/artists/profile
router.get('/profile', auth, requireArtist, async (req, res, next) => {
  try {
    const profile = await artistService.getArtistProfile(req.user.id);
    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/artists/profile
router.put('/profile', auth, requireArtist, async (req, res, next) => {
  try {
    const profile = await artistService.updateArtistProfile(req.user.id, req.body);
    res.json({ success: true, data: { profile }, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/artists/apply
router.post('/apply', auth, async (req, res, next) => {
  try {
    const result = await artistService.applyAsArtist(req.user.id, req.body);
    res.status(201).json({ success: true, data: result, message: 'Artist application submitted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/artists/dashboard
router.get('/dashboard', auth, requireArtist, async (req, res, next) => {
  try {
    const stats = await artistService.getDashboardStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/artists/my-art-pieces
router.get('/my-art-pieces', auth, requireArtist, async (req, res, next) => {
  try {
    const { status, search, limit, offset } = req.query;
    const result = await artistService.getMyArtPieces(req.user.id, { status, search, limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/artists/sales
router.get('/sales', auth, requireArtist, async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const result = await artistService.getSalesHistory(req.user.id, { limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/artists/payouts
router.get('/payouts', auth, requireArtist, async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const result = await artistService.getPayoutHistory(req.user.id, { limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/artists/earnings
router.get('/earnings', auth, requireArtist, async (req, res, next) => {
  try {
    const earnings = await artistService.getEarningsSummary(req.user.id);
    res.json({ success: true, data: { earnings } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/artists/:id
router.get('/:id', async (req, res, next) => {
  try {
    const profile = await artistService.getArtistProfile(req.params.id);
    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
