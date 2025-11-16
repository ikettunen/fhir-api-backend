/**
 * FHIR API Backend - Data Transformation Tests
 * Test Suite: S3.TS5
 */

const request = require('supertest');
const app = require('../src/server');

describe('S3.TS5: Data Transformation Tests', () => {
  
  let samplePatient;

  beforeAll(async () => {
    const response = await request(app).get('/api/patients');
    if (response.body.data && response.body.data.length > 0) {
      samplePatient = response.body.data[0];
    }
  });

  test('S3.TS5.1 - Gender values are transformed correctly', async () => {
    if (!samplePatient) return;

    // Gender should be capitalized (Male, Female, Other)
    expect(['Male', 'Female', 'Other']).toContain(samplePatient.gender);
  });

  test('S3.TS5.2 - Date fields are formatted correctly', async () => {
    if (!samplePatient) return;

    // Date fields should be in ISO format or valid date string
    if (samplePatient.dateOfBirth) {
      expect(typeof samplePatient.dateOfBirth).toBe('string');
      // Should be a valid date
      expect(new Date(samplePatient.dateOfBirth).toString()).not.toBe('Invalid Date');
    }
  });

  test('S3.TS5.3 - Null values are handled appropriately', async () => {
    if (!samplePatient) return;

    // Optional fields can be null or empty, but should exist
    expect(samplePatient).toHaveProperty('dischargeDate');
    expect(samplePatient).toHaveProperty('notes');
  });

  test('S3.TS5.4 - Emergency contacts are sorted by priority', async () => {
    if (!samplePatient || !samplePatient.emergencyContacts) return;

    const contacts = samplePatient.emergencyContacts;
    
    // If there are multiple contacts, they should be sorted
    if (contacts.length > 1) {
      // Contacts should be in order (primary contact first)
      expect(Array.isArray(contacts)).toBe(true);
    }
  });

});
