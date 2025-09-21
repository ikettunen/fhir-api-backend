const express = require('express');
const router = express.Router();

// FHIR middleware for content-type handling and request validation
const fhirMiddleware = require('../middleware/fhirMiddleware');

// FHIR CapabilityStatement endpoint
router.get('/metadata', (req, res) => {
  res.set('Content-Type', 'application/fhir+json');
  res.json({
    resourceType: 'CapabilityStatement',
    id: 'nursing-home-fhir-server',
    status: 'active',
    date: new Date().toISOString(),
    publisher: 'Nursing Home Management System',
    kind: 'instance',
    software: {
      name: 'Nursing Home FHIR Server',
      version: '1.0.0'
    },
    implementation: {
      description: 'FHIR R4 server for nursing home management with Kanta integration',
      url: 'http://localhost:8080/api/fhir'
    },
    fhirVersion: '4.0.1',
    format: ['application/fhir+json'],
    rest: [{
      mode: 'server',
      resource: [{
        type: 'Patient',
        interaction: [
          { code: 'read' },
          { code: 'create' },
          { code: 'update' },
          { code: 'delete' },
          { code: 'search-type' }
        ]
      }]
    }]
  });
});

// FHIR Patient resource endpoints
router.get('/Patient', (req, res) => {
  res.set('Content-Type', 'application/fhir+json');
  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: 0,
    entry: []
  });
});

router.post('/Patient', fhirMiddleware.validateContentType, fhirMiddleware.validateFHIRRequest, (req, res) => {
  res.set('Content-Type', 'application/fhir+json');
  const patient = req.body;
  patient.id = `patient-${Date.now()}`;
  patient.meta = {
    versionId: '1',
    lastUpdated: new Date().toISOString()
  };
  res.status(201).json(patient);
});

router.get('/Patient/:id', (req, res) => {
  res.set('Content-Type', 'application/fhir+json');
  res.json({
    resourceType: 'Patient',
    id: req.params.id,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString()
    },
    active: true,
    name: [{
      use: 'official',
      family: 'Test',
      given: ['Patient']
    }]
  });
});

router.put('/Patient/:id', fhirMiddleware.validateContentType, fhirMiddleware.validateFHIRRequest, (req, res) => {
  res.set('Content-Type', 'application/fhir+json');
  const patient = req.body;
  patient.id = req.params.id;
  patient.meta = {
    versionId: '2',
    lastUpdated: new Date().toISOString()
  };
  res.json(patient);
});

router.delete('/Patient/:id', (req, res) => {
  res.status(204).send();
});

// FHIR Bundle endpoint for bulk operations
router.post('/', fhirMiddleware.validateContentType, fhirMiddleware.validateFHIRRequest, (req, res) => {
  res.set('Content-Type', 'application/fhir+json');
  const bundle = req.body;
  
  if (!bundle.resourceType || bundle.resourceType !== 'Bundle') {
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'invalid',
        diagnostics: 'Resource must be of type Bundle'
      }]
    });
  }

  // Simple bundle processing - just return success response
  res.json({
    resourceType: 'Bundle',
    type: 'transaction-response',
    entry: bundle.entry?.map(() => ({
      response: {
        status: '201 Created'
      }
    })) || []
  });
});

module.exports = router;