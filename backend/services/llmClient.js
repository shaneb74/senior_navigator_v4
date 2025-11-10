/**
 * OpenAI LLM Client for Senior Navigator
 * 
 * Handles LLM API calls with timeout, retry logic, and graceful fallback.
 * Reads API key from environment variables.
 */

const OpenAI = require('openai');

// Read model from environment, fallback to gpt-4o-mini
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_TEMPERATURE = 0.2; // Low temperature for consistent responses

let openaiClient = null;

/**
 * Initialize OpenAI client
 * @returns {OpenAI|null} OpenAI client instance or null if key not available
 */
function getClient() {
  if (openaiClient) {
    return openaiClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('[LLM] No OPENAI_API_KEY found - LLM features disabled');
    return null;
  }

  try {
    openaiClient = new OpenAI({
      apiKey: apiKey,
      timeout: DEFAULT_TIMEOUT,
    });
    
    console.log('[LLM] OpenAI client initialized successfully');
    return openaiClient;
  } catch (error) {
    console.error('[LLM] Failed to initialize OpenAI client:', error.message);
    return null;
  }
}

/**
 * Generate JSON response from LLM
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {object} options - Optional parameters (model, temperature, etc.)
 * @returns {Promise<object|null>} Parsed JSON response or null on failure
 */
async function generateJSON(systemPrompt, userPrompt, options = {}) {
  const client = getClient();
  
  if (!client) {
    console.log('[LLM] Client not available - skipping generation');
    return null;
  }

  const model = options.model || DEFAULT_MODEL;
  const temperature = options.temperature || DEFAULT_TEMPERATURE;

  try {
    console.log(`[LLM] Generating with model=${model} temp=${temperature}`);
    
    const response = await client.chat.completions.create({
      model: model,
      temperature: temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }, // Force JSON mode
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      console.log('[LLM] Empty response from API');
      return null;
    }

    // Parse JSON
    try {
      const parsed = JSON.parse(content);
      console.log('[LLM] Successfully parsed JSON response');
      return parsed;
    } catch (parseError) {
      console.error('[LLM] Failed to parse JSON:', parseError.message);
      console.error('[LLM] Raw content:', content.substring(0, 200));
      return null;
    }

  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.name === 'TimeoutError') {
      console.error('[LLM] Request timeout');
    } else if (error.status === 429) {
      console.error('[LLM] Rate limit exceeded');
    } else {
      console.error('[LLM] API error:', error.message);
    }
    return null;
  }
}

module.exports = {
  getClient,
  generateJSON,
};
