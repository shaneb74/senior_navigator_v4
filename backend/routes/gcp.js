const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { calculateRecommendation } = require('../services/gcpScoring');

// Load module config (same as frontend uses)
const MODULE_CONFIG_PATH = path.join(__dirname, '../../frontend/src/assets/configs/gcp_module.json');

function loadModuleConfig() {
  try {
    const data = fs.readFileSync(MODULE_CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[GCP API] Error loading module config:', error);
    return null;
  }
}

/**
 * POST /api/gcp/submit
 * Submit GCP assessment and get care recommendation
 */
router.post('/submit', async (req, res) => {
  console.log('[GCP API] Received submission');
  console.log('[GCP API] Form data keys:', Object.keys(req.body));
  
  try {
    const formData = req.body;
    
    // Validate input
    if (!formData || Object.keys(formData).length === 0) {
      return res.status(400).json({
        error: 'Missing form data',
        message: 'Request body must contain form responses'
      });
    }
    
    // Load module config for scoring
    const moduleConfig = loadModuleConfig();
    if (!moduleConfig) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Could not load module configuration'
      });
    }
    
    // Get LLM mode from environment (default: 'off')
    // Allowed values: 'off', 'shadow', 'assist'
    const llmMode = process.env.FEATURE_GCP_LLM_TIER || 'off';
    console.log('[GCP API] LLM mode:', llmMode);
    
    // Calculate recommendation using scoring engine (async now due to LLM)
    const recommendation = await calculateRecommendation(formData, moduleConfig, llmMode);
    
    console.log('[GCP API] Returning recommendation:', recommendation.tier);
    
    // Return recommendation
    res.json(recommendation);
    
  } catch (error) {
    console.error('[GCP API] Error processing submission:', error);
    res.status(500).json({
      error: 'Processing error',
      message: error.message
    });
  }
});

/**
 * GET /api/gcp/tiers
 * Get available care tiers and descriptions
 */
router.get('/tiers', (req, res) => {
  const tiers = {
    no_care_needed: {
      label: 'No Formal Care Needed',
      description: 'Individual is managing well independently',
      score_range: [0, 8]
    },
    in_home: {
      label: 'In-Home Support',
      description: 'Needs regular assistance at home',
      score_range: [9, 16]
    },
    assisted_living: {
      label: 'Assisted Living',
      description: 'Needs help with daily activities in supportive environment',
      score_range: [17, 24]
    },
    memory_care: {
      label: 'Memory Care',
      description: 'Needs specialized memory care support',
      score_range: [25, 39]
    },
    memory_care_high_acuity: {
      label: 'Memory Care (High Acuity)',
      description: 'Needs intensive memory care with 24/7 supervision',
      score_range: [40, 100]
    }
  };
  
  res.json(tiers);
});

module.exports = router;
