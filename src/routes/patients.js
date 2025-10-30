const express = require('express');
const router = express.Router();
const database = require('../config/database');
const logger = require('../config/logger');

/**
 * Get all patients
 * GET /api/patients
 */
router.get('/', async (req, res) => {
  try {
    logger.info('Fetching all patients');
    
    await database.initialize();
    
    // Get patients with their identifiers
    const patients = await database.query(`
      SELECT 
        p.id,
        p.hetu,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.room,
        p.admission_date,
        p.discharge_date,
        p.status,
        p.blood_type,
        p.active,
        p.created_at,
        p.updated_at
      FROM patients p
      WHERE p.active = true
      ORDER BY p.last_name, p.first_name
    `);
    
    // Get allergies for all patients
    const allergies = await database.query(`
      SELECT patient_id, allergen
      FROM patient_allergies
      WHERE active = true
    `);
    
    // Get medical conditions for all patients
    const conditions = await database.query(`
      SELECT patient_id, name, icd10_code, diagnosis_date, severity, notes
      FROM medical_conditions
      WHERE active = true
    `);
    
    // Get medications for all patients
    const medications = await database.query(`
      SELECT patient_id, id, name, vnr_code, dosage, frequency, start_date, end_date, notes
      FROM medications
      WHERE active = true
    `);
    
    // Get emergency contacts for all patients
    const contacts = await database.query(`
      SELECT patient_id, name, relationship, phone, email, address, priority
      FROM emergency_contacts
      WHERE active = true
      ORDER BY priority
    `);
    
    // Transform data to match frontend interface
    const transformedPatients = patients.map(patient => {
      const patientAllergies = allergies
        .filter(a => a.patient_id === patient.id)
        .map(a => a.allergen);
      
      const patientConditions = conditions
        .filter(c => c.patient_id === patient.id)
        .map(c => ({
          name: c.name,
          diagnosisDate: c.diagnosis_date,
          notes: c.notes || '',
          severity: c.severity
        }));
      
      const patientMedications = medications
        .filter(m => m.patient_id === patient.id)
        .map(m => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          startDate: m.start_date,
          endDate: m.end_date,
          notes: m.notes
        }));
      
      const patientContacts = contacts
        .filter(c => c.patient_id === patient.id)
        .map(c => ({
          name: c.name,
          relationship: c.relationship,
          phone: c.phone,
          email: c.email,
          address: c.address
        }));
      
      return {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender === 'male' ? 'Male' : patient.gender === 'female' ? 'Female' : 'Other',
        hetu: patient.hetu,
        room: patient.room,
        admissionDate: patient.admission_date,
        dischargeDate: patient.discharge_date,
        status: patient.status,
        bloodType: patient.blood_type,
        allergies: patientAllergies,
        medicalConditions: patientConditions,
        medications: patientMedications,
        emergencyContacts: patientContacts,
        notes: '' // Add notes field to database schema if needed
      };
    });
    
    logger.info(`Retrieved ${transformedPatients.length} patients`);
    
    res.status(200).json({
      success: true,
      data: transformedPatients,
      count: transformedPatients.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to fetch patients:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch patients',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get a single patient by ID
 * GET /api/patients/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching patient with ID: ${id}`);
    
    await database.initialize();
    
    // Get patient
    const patients = await database.query(`
      SELECT 
        p.id,
        p.hetu,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.room,
        p.admission_date,
        p.discharge_date,
        p.status,
        p.blood_type,
        p.active,
        p.created_at,
        p.updated_at
      FROM patients p
      WHERE p.id = ? AND p.active = true
    `, [id]);
    
    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        timestamp: new Date().toISOString()
      });
    }
    
    const patient = patients[0];
    
    // Get related data
    const allergies = await database.query(`
      SELECT allergen FROM patient_allergies WHERE patient_id = ? AND active = true
    `, [id]);
    
    const conditions = await database.query(`
      SELECT name, icd10_code, diagnosis_date, severity, notes
      FROM medical_conditions WHERE patient_id = ? AND active = true
    `, [id]);
    
    const medications = await database.query(`
      SELECT id, name, vnr_code, dosage, frequency, start_date, end_date, notes
      FROM medications WHERE patient_id = ? AND active = true
    `, [id]);
    
    const contacts = await database.query(`
      SELECT name, relationship, phone, email, address, priority
      FROM emergency_contacts WHERE patient_id = ? AND active = true ORDER BY priority
    `, [id]);
    
    // Transform data
    const transformedPatient = {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender === 'male' ? 'Male' : patient.gender === 'female' ? 'Female' : 'Other',
      hetu: patient.hetu,
      room: patient.room,
      admissionDate: patient.admission_date,
      dischargeDate: patient.discharge_date,
      status: patient.status,
      bloodType: patient.blood_type,
      allergies: allergies.map(a => a.allergen),
      medicalConditions: conditions.map(c => ({
        name: c.name,
        diagnosisDate: c.diagnosis_date,
        notes: c.notes || '',
        severity: c.severity
      })),
      medications: medications.map(m => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: m.start_date,
        endDate: m.end_date,
        notes: m.notes
      })),
      emergencyContacts: contacts.map(c => ({
        name: c.name,
        relationship: c.relationship,
        phone: c.phone,
        email: c.email,
        address: c.address
      })),
      notes: ''
    };
    
    logger.info(`Retrieved patient: ${patient.first_name} ${patient.last_name}`);
    
    res.status(200).json({
      success: true,
      data: transformedPatient,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to fetch patient:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch patient',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;