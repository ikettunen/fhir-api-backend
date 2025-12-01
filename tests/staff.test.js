const request = require('supertest');
const app = require('../src/server-test');
const database = require('../src/config/database');

describe('Staff Management Tests', () => {
  beforeAll(async () => {
    await database.initialize();
  });

  afterAll(async () => {
    await database.close();
  });

  describe('GET /api/staff', () => {
    test('should return all active staff members', async () => {
      const response = await request(app)
        .get('/api/staff')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('should include FHIR practitioner data', async () => {
      const response = await request(app)
        .get('/api/staff')
        .expect(200);

      const staff = response.body.data[0];
      expect(staff).toHaveProperty('id');
      expect(staff).toHaveProperty('first_name');
      expect(staff).toHaveProperty('last_name');
      expect(staff).toHaveProperty('email');
      expect(staff).toHaveProperty('status');
    });
  });

  describe('GET /api/staff/:id', () => {
    test('should return staff member by ID', async () => {
      const response = await request(app)
        .get('/api/staff/S1003')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('S1003');
    });

    test('should return 404 for non-existent staff', async () => {
      const response = await request(app)
        .get('/api/staff/INVALID_ID')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/staff/by-employee/:employeeId', () => {
    test('should return staff member by employee ID', async () => {
      const response = await request(app)
        .get('/api/staff/by-employee/1003')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.employee_id).toBe(1003);
    });

    test('should return 404 for non-existent employee ID', async () => {
      const response = await request(app)
        .get('/api/staff/by-employee/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/staff', () => {
    test('should create staff from Oracle employee', async () => {
      const newStaff = {
        employee_id: 1001,
        role: 'Registered Nurse',
        department: 'Nursing',
        valvira_id: 'VL123456',
        terhikki_id: 'TH789012',
        qualifications: [
          {
            code: 'RN',
            display: 'Registered Nurse',
            identifier: 'CERT123',
            period: {
              start: '2020-01-01',
              end: '2025-12-31'
            },
            issuer: 'Finnish Nurses Association'
          }
        ]
      };

      const response = await request(app)
        .post('/api/staff')
        .send(newStaff)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.employee_id).toBe(1001);
      expect(response.body.data.fhir_practitioner).toBeDefined();
    });

    test('should return 404 if employee not found in HR system', async () => {
      const response = await request(app)
        .post('/api/staff')
        .send({
          employee_id: 99999,
          role: 'Nurse',
          department: 'Nursing'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 if staff already exists', async () => {
      // First create
      await request(app)
        .post('/api/staff')
        .send({
          employee_id: 1002,
          role: 'Care Assistant',
          department: 'Care'
        });

      // Try to create again
      const response = await request(app)
        .post('/api/staff')
        .send({
          employee_id: 1002,
          role: 'Care Assistant',
          department: 'Care'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/staff/:id', () => {
    test('should update staff FHIR data', async () => {
      const updates = {
        role: 'Senior Nurse',
        valvira_id: 'VL999999',
        qualifications: [
          {
            code: 'SN',
            display: 'Senior Nurse',
            identifier: 'CERT999'
          }
        ]
      };

      const response = await request(app)
        .put('/api/staff/S1003')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('Senior Nurse');
    });

    test('should return 404 for non-existent staff', async () => {
      const response = await request(app)
        .put('/api/staff/INVALID_ID')
        .send({ role: 'Nurse' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/staff/:id/status', () => {
    test('should deactivate staff member', async () => {
      const response = await request(app)
        .patch('/api/staff/S1003/status')
        .send({ status: 'inactive' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should reactivate staff member', async () => {
      const response = await request(app)
        .patch('/api/staff/S1003/status')
        .send({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 for non-existent staff', async () => {
      const response = await request(app)
        .patch('/api/staff/INVALID_ID/status')
        .send({ status: 'inactive' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
