/**
 * Request validation schemas for GCP API
 * Install: npm install joi
 * Usage: const { validateGCPSubmission } = require('./validation');
 */

// Example using Joi (install separately: npm install joi)
// const Joi = require('joi');

/**
 * Simple validation without dependencies
 */
function validateGCPSubmission(req, res, next) {
  const { formData } = req.body;
  
  // Check formData exists
  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Missing or invalid formData object in request body'
    });
  }
  
  // Check formData is not empty
  if (Object.keys(formData).length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'formData object cannot be empty'
    });
  }
  
  // Validate required fields (example - adjust based on your requirements)
  const requiredFields = ['memory_changes', 'fall_risk'];
  const missingFields = requiredFields.filter(field => !formData[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Missing required fields',
      missing_fields: missingFields
    });
  }
  
  next();
}

module.exports = {
  validateGCPSubmission
};
