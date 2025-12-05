const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/', (req, res) => {
  res.json({ message: 'Get art pieces feed - to be implemented' });
});

router.get('/search', (req, res) => {
  res.json({ message: 'Search art pieces - to be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get art piece by ID - to be implemented' });
});

router.post('/', auth, (req, res) => {
  res.json({ message: 'Create art piece - to be implemented' });
});

module.exports = router;
