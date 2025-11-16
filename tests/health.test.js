/**
 * FHIR API Backend - Health Endpoint Tests
 * Test Suite: S3.TS1
 * 
 * Tests the health check endpoint to ensure the service is running
 * and responding correctly.
 */

const request = require('supertest');
const app = require('../src/server');

describe('S3.TS1: Health Endpoint Tests', () => {
  
  /**
   * Test: S3.TS1.1
   * Verify that the health endpoint returns 200 status with service status
   * 
   * Expected behavior:
   * - Status code should be 200
   * - Response should contain status: 'healthy'
   * - Response should contain timestamp
   * - Response should contain version
   */
  test('S3.TS1.1 - GET /health returns 200 with service status', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });

});
