const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const artistService = require('../services/artist.service');

const requireArtist = (req, res, next) => {
  if (req.user.role !== 'artist') {
    return res.status(403).json({ success: false, error: { message: 'Access denied. Artist role required.' } });
  }
  next();
};

router.get('/profile', auth, requireArtist, async (req, res, next) => {
  try {
    const profile = await artistService.getArtistProfile(req.user.id);
    res.json({ success: true, data: { profile } });
  } catch (error) { next(error); }
});

router.put('/profile', auth, requireArtist, async (req, res, next) => {
  try {
    const profile = await artistService.updateArtistProfile(req.user.id, req.body);
    res.json({ success: true, data: { profile }, message: 'Profile updated successfully' });
  } catch (error) { next(error); }
});

router.post('/apply', auth, async (req, res, next) => {
  try {
    const result = await artistService.applyAsArtist(req.user.id, req.body);
    res.status(201).json({ success: true, data: result, message: 'Artist application submitted successfully' });
  } catch (error) { next(error); }
});

router.post('/redeem-code', auth, async (req, res, next) => {
  try {
    if (!req.body.code) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Invite code is required' } 
      });
    }

    const result = await artistService.redeemInviteCode(req.user.id, req.body.code);
    res.status(200).json({ success: true, data: result, message: 'Invite code redeemed successfully. You are now an artist!' });
  } catch (error) { 
    console.error('Redeem code error:', error);
    res.status(400).json({ 
      success: false, 
      error: { message: error.message || 'Failed to redeem invite code' } 
    });
  }
});

router.get('/dashboard', auth, requireArtist, async (req, res, next) => {
  try {
    const stats = await artistService.getDashboardStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
});

router.get('/my-art-pieces', auth, requireArtist, async (req, res, next) => {
  try {
    const { status, search, limit, offset } = req.query;
    const result = await artistService.getMyArtPieces(req.user.id, { status, search, limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.get('/sales', auth, requireArtist, async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const result = await artistService.getSalesHistory(req.user.id, { limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.get('/payouts', auth, requireArtist, async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const result = await artistService.getPayoutHistory(req.user.id, { limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.get('/earnings', auth, requireArtist, async (req, res, next) => {
  try {
    const earnings = await artistService.getEarningsSummary(req.user.id);
    res.json({ success: true, data: { earnings } });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const profile = await artistService.getArtistProfile(req.params.id);
    res.json({ success: true, data: { profile } });
  } catch (error) { next(error); }
});

module.exports = router;
