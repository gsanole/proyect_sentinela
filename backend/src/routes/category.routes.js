const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get categories - to be implemented' });
});

module.exports = router;
