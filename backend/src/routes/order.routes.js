const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  res.json({ message: 'Get orders - to be implemented' });
});

router.post('/checkout', auth, (req, res) => {
  res.json({ message: 'Checkout - to be implemented' });
});

module.exports = router;
