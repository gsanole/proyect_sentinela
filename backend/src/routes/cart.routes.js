const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  res.json({ message: 'Get cart - to be implemented' });
});

router.post('/', auth, (req, res) => {
  res.json({ message: 'Add to cart - to be implemented' });
});

module.exports = router;
