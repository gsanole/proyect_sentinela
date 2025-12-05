const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/me', auth, (req, res) => {
  res.json({ message: 'Get user profile - to be implemented' });
});

router.put('/me', auth, (req, res) => {
  res.json({ message: 'Update user profile - to be implemented' });
});

module.exports = router;
