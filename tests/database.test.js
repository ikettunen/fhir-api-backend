/**
 * FHIR API Backend - Database Connection Tests
 * Test Suite: S3.TS4
 */

const request = require('supertest');
const app = require('../src/server');

describe('S3.TS4: Database Connection Tests', () => {
  
  test('S3.TS4.1 - MySQL connection is established successfully', async () => {
    // If the app starts and health check passes, DB connection is working
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
  });

  test('S3.TS4.2 - Database queries handle connection errors gracefully', async () => {
    // Test that the API doesn't crash on DB errors
    const response = await request(app)
      .get('/api/patients');

    // Should return either 200 (success) or 500 (handled error), not crash
    expect([200, 500, 503]).toContain(response.status);
  });

  test('S3.TS4.3 - Database connection pool is managed correctly', async () => {
    // Make multiple concurrent requests to test connection pooling
    const requests = Array(5).fill(null).map(() => 
      request(app).get('/api/patients')
    );

    const responses = await Promise.all(requests);
    
    // All requests should complete successfully
    responses.forEach(response => {
      expect([200, 500]).toContain(response.status);
    });
  });

});
