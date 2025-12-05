const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/artist/:artistId', (req, res) => {
  res.json({ message: 'Get artist reviews - to be implemented' });
});

router.post('/', auth, (req, res) => {
  res.json({ message: 'Create review - to be implemented' });
});

module.exports = router;
