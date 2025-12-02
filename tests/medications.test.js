const request = require('supertest');
const express = require('express');
const medicationsRoutes = require('../src/routes/medications');
const database = require('../src/config/database');

// Mock the database module
jest.mock('../src/config/database');

const app = express();
app.use(express.json());
app.use('/api/medications', medicationsRoutes);

describe('Medications API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/medications/summary', () => {
    it('should return medication summary successfully', async () => {
      const mockMedicationSummary = [
        {
          name: 'Lisinopril',
          vnr_code: 'VNR001',
          dosage: '10mg',
          patient_count: 10,
          total_prescriptions: 10
        },
        {
          name: 'Metformin',
          vnr_code: 'VNR002',
          dosage: '500mg',
          patient_count: 7,
          total_prescriptions: 14
        }
      ];

      const mockTotalCounts = [{
        total_medications: 4,
        total_patients: 12,
        total_prescriptions: 28
      }];

      database.query
        .mockResolvedValueOnce(mockMedicationSummary)
        .mockResolvedValueOnce(mockTotalCounts);

      const response = await request(app)
        .get('/api/medications/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalMedications).toBe(4);
      expect(response.body.data.totalPatients).toBe(12);
      expect(response.body.data.medications).toHaveLength(2);
      expect(response.body.data.medications[0]).toEqual({
        name: 'Lisinopril',
        vnrCode: 'VNR001',
        dosage: '10mg',
        patientCount: 10,
        totalPrescriptions: 10
      });
    });

    it('should handle database errors', async () => {
      database.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/medications/summary')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch medication summary');
    });
  });

  describe('GET /api/medications/rounds/today', () => {
    it('should return medication rounds for today', async () => {
      const mockMorningMeds = [
        {
          name: 'Lisinopril',
          vnr_code: 'VNR001',
          dosage: '10mg',
          frequency: 'Once daily',
          patient_count: 10,
          total_prescriptions: 10,
          patient_names: 'Matti Virtanen,Aino Korhonen',
          rooms: '101,102'
        }
      ];

      const mockAfternoonMeds = [
        {
          name: 'Ibuprofen',
          vnr_code: 'VNR003',
          dosage: '400mg',
          frequency: 'Three times daily',
          patient_count: 1,
          total_prescriptions: 1,
          patient_names: 'Sirkka Rantanen',
          rooms: '106'
        }
      ];

      const mockEveningMeds = [
        {
          name: 'Metformin',
          vnr_code: 'VNR002',
          dosage: '500mg',
          frequency: 'Twice daily',
          patient_count: 7,
          total_prescriptions: 7,
          patient_names: 'Matti Virtanen,Eino Mäkinen',
          rooms: '101,103'
        }
      ];

      database.query
        .mockResolvedValueOnce(mockMorningMeds)
        .mockResolvedValueOnce(mockAfternoonMeds)
        .mockResolvedValueOnce(mockEveningMeds);

      const response = await request(app)
        .get('/api/medications/rounds/today')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rounds).toHaveLength(3);
      
      const morningRound = response.body.data.rounds[0];
      expect(morningRound.time).toBe('08:00');
      expect(morningRound.name).toBe('Morning Round');
      expect(morningRound.medications).toHaveLength(1);
      expect(morningRound.medications[0].name).toBe('Lisinopril');
      expect(morningRound.medications[0].patientCount).toBe(10);
    });

    it('should accept custom date parameter', async () => {
      database.query
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      const response = await request(app)
        .get('/api/medications/rounds/today?date=2025-12-03')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.date).toBe('2025-12-03');
    });

    it('should handle database errors', async () => {
      database.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/medications/rounds/today')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch medication rounds');
    });
  });

  describe('GET /api/medications/patient/:patientId', () => {
    it('should return medications for a specific patient', async () => {
      const mockPatientMedications = [
        {
          id: 'med-1',
          name: 'Lisinopril',
          vnr_code: 'VNR001',
          dosage: '10mg',
          frequency: 'Once daily',
          start_date: '2023-01-01',
          end_date: null,
          instructions: 'Take with water',
          active: 1,
          first_name: 'Matti',
          last_name: 'Virtanen',
          room: '101'
        },
        {
          id: 'med-2',
          name: 'Metformin',
          vnr_code: 'VNR002',
          dosage: '500mg',
          frequency: 'Twice daily',
          start_date: '2023-01-01',
          end_date: null,
          instructions: 'Take with food',
          active: 1,
          first_name: 'Matti',
          last_name: 'Virtanen',
          room: '101'
        }
      ];

      database.query.mockResolvedValue(mockPatientMedications);

      const response = await request(app)
        .get('/api/medications/patient/patient-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patient.name).toBe('Matti Virtanen');
      expect(response.body.data.patient.room).toBe('101');
      expect(response.body.data.medications).toHaveLength(2);
      expect(response.body.data.medications[0].name).toBe('Lisinopril');
      expect(response.body.data.medications[1].name).toBe('Metformin');
    });

    it('should return 404 when no medications found', async () => {
      database.query.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/medications/patient/nonexistent-patient')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No medications found for this patient');
    });

    it('should handle database errors', async () => {
      database.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/medications/patient/patient-123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch patient medications');
    });
  });
});