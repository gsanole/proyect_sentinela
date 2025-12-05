const express = require('express');
const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  res.json({ message: 'Stripe webhook - to be implemented' });
});

module.exports = router;
