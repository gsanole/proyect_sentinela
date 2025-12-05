const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  res.json({ message: 'Get following - to be implemented' });
});

router.post('/:artistId', auth, (req, res) => {
  res.json({ message: 'Follow artist - to be implemented' });
});

router.delete('/:artistId', auth, (req, res) => {
  res.json({ message: 'Unfollow artist - to be implemented' });
});

module.exports = router;
