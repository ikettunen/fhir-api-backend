const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const fhirRoutes = require('./routes/fhir');
const dbRoutes = require('./routes/db');
const patientsRoutes = require('./routes/patients');
const staffController = require('./controllers/staffController');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.get('/api/staff', staffController.getAllStaff);
app.get('/api/staff/:id', staffController.getStaffById);
app.post('/api/staff', staffController.createStaff);
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

module.exports = app;
