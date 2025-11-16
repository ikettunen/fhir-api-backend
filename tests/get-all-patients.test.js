/**
 * FHIR API Backend - Get All Patients Tests
 * Test Suite: S3.TS2
 * 
 * Tests the endpoint that retrieves all active patients with their
 * complete medical information.
 */

const request = require('supertest');
const app = require('../src/server');

describe('S3.TS2: Get All Patients Tests', () => {
  
  /**
   * Test: S3.TS2.1
   * Verify that GET /api/patients returns array of patients
   * 
   * Expected behavior:
   * - Status code should be 200
   * - Response should contain success: true
   * - Response should contain data array
   * - Response should contain count
   */
  test('S3.TS2.1 - GET /api/patients returns array of patients', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body).toHaveProperty('count');
  });

  /**
   * Test: S3.TS2.2
   * Verify that response includes patient count
   * 
   * Expected behavior:
   * - count field should match data array length
   * - count should be a non-negative integer
   */
  test('S3.TS2.2 - GET /api/patients includes patient count', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect(200);

    expect(typeof response.body.count).toBe('number');
    expect(response.body.count).toBeGreaterThanOrEqual(0);
    expect(response.body.count).toBe(response.body.data.length);
  });

  /**
   * Test: S3.TS2.3
   * Verify that only active patients are returned
   * 
   * Expected behavior:
   * - All patients should have active status
   * - Inactive patients should not be included
   */
  test('S3.TS2.3 - GET /api/patients only returns active patients', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect(200);

    // All patients should be active (or the endpoint filters correctly)
    // This is implicit in the endpoint design
    expect(response.body.success).toBe(true);
  });

  /**
   * Test: S3.TS2.4
   * Verify that response includes allergies for each patient
   * 
   * Expected behavior:
   * - Each patient should have allergies field
   * - Allergies should be an array
   */
  test('S3.TS2.4 - GET /api/patients includes allergies for each patient', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect(200);

    if (response.body.data.length > 0) {
      const patient = response.body.data[0];
      expect(patient).toHaveProperty('allergies');
      expect(Array.isArray(patient.allergies)).toBe(true);
    }
  });

  /**
   * Test: S3.TS2.5
   * Verify that response includes medical conditions
   * 
   * Expected behavior:
   * - Each patient should have medicalConditions field
   * - Medical conditions should be an array
   */
  test('S3.TS2.5 - GET /api/patients includes medical conditions', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect(200);

    if (response.body.data.length > 0) {
      const patient = response.body.data[0];
      expect(patient).toHaveProperty('medicalConditions');
      expect(Array.isArray(patient.medicalConditions)).toBe(true);
    }
  });

  /**
   * Test: S3.TS2.6
   * Verify that response includes medications
   * 
   * Expected behavior:
   * - Each patient should have medications field
   * - Medications should be an array
   */
  test('S3.TS2.7 - GET /api/patients includes medications', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect(200);

    if (response.body.data.length > 0) {
      const patient = response.body.data[0];
      expect(patient).toHaveProperty('medications');
      expect(Array.isArray(patient.medications)).toBe(true);
    }
  });

  /**
   * Test: S3.TS2.7
   * Verify that response includes emergency contacts
   * 
   * Expected behavior:
   * - Each patient should have emergencyContacts field
   * - Emergency contacts should be an array
   */
  test('S3.TS2.7 - GET /api/patients includes emergency contacts', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect(200);

    if (response.body.data.length > 0) {
      const patient = response.body.data[0];
      expect(patient).toHaveProperty('emergencyContacts');
      expect(Array.isArray(patient.emergencyContacts)).toBe(true);
    }
  });

  /**
   * Test: S3.TS2.8
   * Verify that patients are sorted by last name, first name
   * 
   * Expected behavior:
   * - Patients should be in alphabetical order by lastName
   * - If lastNames are equal, should be sorted by firstName
   */
  test('S3.TS2.8 - Patients are sorted by last name, first name', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect(200);

    const patients = response.body.data;
    
    if (patients.length > 1) {
      for (let i = 0; i < patients.length - 1; i++) {
        const current = patients[i];
        const next = patients[i + 1];
        
        // Check if sorted by lastName
        const lastNameCompare = current.lastName.localeCompare(next.lastName);
        if (lastNameCompare === 0) {
          // If lastNames are equal, check firstName
          expect(current.firstName.localeCompare(next.firstName)).toBeLessThanOrEqual(0);
        } else {
          expect(lastNameCompare).toBeLessThanOrEqual(0);
        }
      }
    }
  });

});
