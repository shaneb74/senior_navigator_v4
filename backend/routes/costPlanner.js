const express = require('express');
const router = express.Router();

const { calculateFinancialProfile } = require('../services/costPlannerCalculator');

router.post('/submit', (req, res) => {
  console.log('[Cost Planner API] Received submission');
  const formData = req.body || {};

  try {
    const profile = calculateFinancialProfile(formData);
    console.log('[Cost Planner API] Returning financial profile', profile.profile_id);
    res.json(profile);
  } catch (error) {
    console.error('[Cost Planner API] Error processing submission:', error);
    res.status(500).json({
      error: 'Processing error',
      message: error.message,
    });
  }
});

module.exports = router;
