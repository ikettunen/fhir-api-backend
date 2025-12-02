const express = require('express');
const router = express.Router();
const database = require('../config/database');
const logger = require('../config/logger');

/**
 * GET /api/medications/summary
 * Get medication distribution summary across all patients
 */
router.get('/summary', async (req, res) => {
  try {
    logger.info('Fetching medication summary');

    // Get medication distribution
    const medicationSummary = await database.query(`
      SELECT 
        name,
        vnr_code,
        dosage,
        COUNT(DISTINCT patient_id) as patient_count,
        COUNT(*) as total_prescriptions
      FROM medications 
      WHERE active = 1
      GROUP BY name, vnr_code, dosage
      ORDER BY patient_count DESC, name ASC
    `);

    // Get total counts
    const totalCounts = await database.query(`
      SELECT 
        COUNT(DISTINCT name) as total_medications,
        COUNT(DISTINCT patient_id) as total_patients,
        COUNT(*) as total_prescriptions
      FROM medications 
      WHERE active = 1
    `);

    const response = {
      success: true,
      data: {
        totalMedications: totalCounts[0].total_medications,
        totalPatients: totalCounts[0].total_patients,
        totalPrescriptions: totalCounts[0].total_prescriptions,
        medications: medicationSummary.map(med => ({
          name: med.name,
          vnrCode: med.vnr_code,
          dosage: med.dosage,
          patientCount: med.patient_count,
          totalPrescriptions: med.total_prescriptions
        }))
      }
    };

    logger.info(`Medication summary: ${medicationSummary.length} unique medications`);
    res.json(response);

  } catch (error) {
    logger.error('Error fetching medication summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medication summary',
      details: error.message
    });
  }
});

/**
 * GET /api/medications/rounds/today
 * Get today's medication rounds with patient counts
 */
router.get('/rounds/today', async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    logger.info(`Fetching medication rounds for date: ${targetDate}`);

    // Define medication round times based on our daily schedule
    const medicationRounds = [
      { time: '08:00', name: 'Morning Round', description: 'Morning medication administration' },
      { time: '14:00', name: 'Afternoon Round', description: 'Afternoon medication administration' },
      { time: '20:00', name: 'Evening Round', description: 'Evening medication administration' }
    ];

    const roundsWithMedications = [];

    for (const round of medicationRounds) {
      // Get medications for this round based on frequency patterns
      let frequencyFilter = '';
      
      if (round.time === '08:00') {
        // Morning: Once daily, twice daily (1st dose), three times daily (1st dose)
        frequencyFilter = `(
          frequency LIKE '%Once daily%' OR 
          frequency LIKE '%Twice daily%' OR 
          frequency LIKE '%Three times daily%'
        )`;
      } else if (round.time === '14:00') {
        // Afternoon: Three times daily (2nd dose), as needed
        frequencyFilter = `(
          frequency LIKE '%Three times daily%' OR
          frequency LIKE '%As needed%'
        )`;
      } else if (round.time === '20:00') {
        // Evening: Twice daily (2nd dose), three times daily (3rd dose)
        frequencyFilter = `(
          frequency LIKE '%Twice daily%' OR 
          frequency LIKE '%Three times daily%'
        )`;
      }

      const medications = await database.query(`
        SELECT 
          m.name,
          m.vnr_code,
          m.dosage,
          m.frequency,
          COUNT(DISTINCT m.patient_id) as patient_count,
          COUNT(*) as total_prescriptions,
          GROUP_CONCAT(DISTINCT CONCAT(p.first_name, ' ', p.last_name) ORDER BY p.room ASC) as patient_names,
          GROUP_CONCAT(DISTINCT p.room ORDER BY p.room ASC) as rooms
        FROM medications m
        JOIN patients p ON m.patient_id = p.id
        WHERE m.active = 1 AND p.active = 1 AND ${frequencyFilter}
        GROUP BY m.name, m.vnr_code, m.dosage, m.frequency
        ORDER BY patient_count DESC, m.name ASC
      `);

      const totalMedications = medications.reduce((sum, med) => sum + med.total_prescriptions, 0);
      const totalPatients = new Set(medications.flatMap(med => med.patient_names.split(','))).size;

      roundsWithMedications.push({
        time: round.time,
        name: round.name,
        description: round.description,
        medications: medications.map(med => ({
          name: med.name,
          vnrCode: med.vnr_code,
          dosage: med.dosage,
          frequency: med.frequency,
          patientCount: med.patient_count,
          totalPrescriptions: med.total_prescriptions,
          patientNames: med.patient_names ? med.patient_names.split(',') : [],
          rooms: med.rooms ? med.rooms.split(',') : []
        })),
        totalMedications,
        totalPatients: totalPatients || 0
      });
    }

    const response = {
      success: true,
      data: {
        date: targetDate,
        rounds: roundsWithMedications,
        summary: {
          totalRounds: roundsWithMedications.length,
          totalMedications: roundsWithMedications.reduce((sum, round) => sum + round.totalMedications, 0),
          totalPatients: new Set(roundsWithMedications.flatMap(round => 
            round.medications.flatMap(med => med.patientNames)
          )).size
        }
      }
    };

    logger.info(`Medication rounds: ${roundsWithMedications.length} rounds for ${targetDate}`);
    res.json(response);

  } catch (error) {
    logger.error('Error fetching medication rounds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medication rounds',
      details: error.message
    });
  }
});

/**
 * GET /api/medications/patient/:patientId
 * Get medications for a specific patient
 */
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    logger.info(`Fetching medications for patient: ${patientId}`);

    const medications = await database.query(`
      SELECT 
        m.*,
        p.first_name,
        p.last_name,
        p.room
      FROM medications m
      JOIN patients p ON m.patient_id = p.id
      WHERE m.patient_id = ? AND m.active = 1 AND p.active = 1
      ORDER BY m.name ASC
    `, [patientId]);

    if (medications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No medications found for this patient'
      });
    }

    const response = {
      success: true,
      data: {
        patient: {
          id: patientId,
          name: `${medications[0].first_name} ${medications[0].last_name}`,
          room: medications[0].room
        },
        medications: medications.map(med => ({
          id: med.id,
          name: med.name,
          vnrCode: med.vnr_code,
          dosage: med.dosage,
          frequency: med.frequency,
          startDate: med.start_date,
          endDate: med.end_date,
          instructions: med.instructions,
          active: med.active
        }))
      }
    };

    logger.info(`Found ${medications.length} medications for patient ${patientId}`);
    res.json(response);

  } catch (error) {
    logger.error('Error fetching patient medications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient medications',
      details: error.message
    });
  }
});

module.exports = router;