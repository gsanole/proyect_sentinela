const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  res.json({ message: 'Get favorites - to be implemented' });
});

router.post('/:artPieceId', auth, (req, res) => {
  res.json({ message: 'Add to favorites - to be implemented' });
});

router.delete('/:artPieceId', auth, (req, res) => {
  res.json({ message: 'Remove from favorites - to be implemented' });
});

module.exports = router;
