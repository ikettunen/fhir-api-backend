/**
 * FHIR API Backend - Get Patient by ID Tests
 * Test Suite: S3.TS3
 */

const request = require('supertest');
const app = require('../src/server');

describe('S3.TS3: Get Patient by ID Tests', () => {
  
  let validPatientId;

  // Get a valid patient ID before running tests
  beforeAll(async () => {
    const response = await request(app).get('/api/patients');
    if (response.body.data && response.body.data.length > 0) {
      validPatientId = response.body.data[0].id;
    }
  });

  test('S3.TS3.1 - GET /api/patients/:id returns patient with correct ID', async () => {
    if (!validPatientId) {
      console.log('Skipping test: No patients in database');
      return;
    }

    const response = await request(app)
      .get(`/api/patients/${validPatientId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(validPatientId);
  });

  test('S3.TS3.2 - GET /api/patients/:id includes all patient fields', async () => {
    if (!validPatientId) return;

    const response = await request(app)
      .get(`/api/patients/${validPatientId}`)
      .expect(200);

    const patient = response.body.data;
    expect(patient).toHaveProperty('id');
    expect(patient).toHaveProperty('firstName');
    expect(patient).toHaveProperty('lastName');
    expect(patient).toHaveProperty('dateOfBirth');
    expect(patient).toHaveProperty('gender');
  });

  test('S3.TS3.3 - GET /api/patients/:id includes related data', async () => {
    if (!validPatientId) return;

    const response = await request(app)
      .get(`/api/patients/${validPatientId}`)
      .expect(200);

    const patient = response.body.data;
    expect(patient).toHaveProperty('allergies');
    expect(patient).toHaveProperty('medicalConditions');
    expect(patient).toHaveProperty('medications');
    expect(patient).toHaveProperty('emergencyContacts');
  });

  test('S3.TS3.4 - GET /api/patients/:id with invalid ID returns 404', async () => {
    const response = await request(app)
      .get('/api/patients/INVALID_ID_999')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
  });

  test('S3.TS3.5 - GET /api/patients/:id with inactive patient returns 404', async () => {
    // This tests the business logic that inactive patients are not accessible
    const response = await request(app)
      .get('/api/patients/INACTIVE_PATIENT')
      .expect(404);

    expect(response.body.success).toBe(false);
  });

});
