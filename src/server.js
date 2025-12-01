const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const fhirRoutes = require('./routes/fhir');
const dbRoutes = require('./routes/db');
const patientsRoutes = require('./routes/patients');
const staffController = require('./controllers/staffController');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/fhir', fhirRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/patients', patientsRoutes);

// Staff routes (direct access for REST API)
// Note: More specific routes must come before generic :id routes
app.get('/api/staff', staffController.getAllStaff);
app.post('/api/staff', staffController.createStaff);
app.get('/api/staff/by-employee/:employeeId', staffController.getStaffByEmployeeId);
app.get('/api/staff/:id', staffController.getStaffById);
app.put('/api/staff/:id', staffController.updateStaff);
app.patch('/api/staff/:id/status', staffController.updateStaffStatus);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`FHIR API available at http://localhost:${PORT}/api/fhir`);
  console.log(`Database API available at http://localhost:${PORT}/api/db`);
});

module.exports = app;