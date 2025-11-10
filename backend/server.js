require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const gcpRouter = require('./routes/gcp');
const costPlannerRouter = require('./routes/costPlanner');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:4200', 'http://127.0.0.1:4200'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());

// Routes
app.use('/api/gcp', gcpRouter);
app.use('/api/cost-planner', costPlannerRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    path: req.path
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Senior Navigator Backend running on port ${PORT}`);
  console.log(`📍 API endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/gcp/submit`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`\n🤖 LLM Configuration:`);
  console.log(`   API Key: ${process.env.OPENAI_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`   Model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini (default)'}`);
  console.log(`   GCP LLM Mode: ${process.env.FEATURE_GCP_LLM_TIER || 'off (default)'}`);
});
