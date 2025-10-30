const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const database = require('../config/database');
const logger = require('../config/logger');

const samplePatients = [
  {
    id: uuidv4(),
    hetu: '010101-123N',
    first_name: 'Matti',
    last_name: 'Virtanen',
    date_of_birth: '1901-01-01',
    gender: 'male',
    room: '101',
    admission_date: '2023-05-10',
    status: 'Stable',
    blood_type: 'O+',
    active: true
  },
  {
    id: uuidv4(),
    hetu: '151240-321X',
    first_name: 'Aino',
    last_name: 'Korhonen',
    date_of_birth: '1940-12-15',
    gender: 'female',
    room: '102',
    admission_date: '2023-04-15',
    status: 'Improving',
    blood_type: 'A+',
    active: true
  },
  {
    id: uuidv4(),
    hetu: '030650-456Y',
    first_name: 'Eino',
    last_name: 'Mäkinen',
    date_of_birth: '1950-06-03',
    gender: 'male',
    room: '103',
    admission_date: '2023-06-01',
    status: 'Stable',
    blood_type: 'B+',
    active: true
  }
];

const sampleMedicalConditions = [
  { name: 'Hypertension', icd10_code: 'I10', severity: 'Moderate' },
  { name: 'Type 2 Diabetes', icd10_code: 'E11', severity: 'Mild' },
  { name: 'Osteoarthritis', icd10_code: 'M15', severity: 'Moderate' },
  { name: 'Congestive Heart Failure', icd10_code: 'I50', severity: 'Severe' }
];

const sampleMedications = [
  { name: 'Lisinopril', vnr_code: 'VNR001', dosage: '10mg', frequency: 'Once daily' },
  { name: 'Metformin', vnr_code: 'VNR002', dosage: '500mg', frequency: 'Twice daily' },
  { name: 'Ibuprofen', vnr_code: 'VNR003', dosage: '400mg', frequency: 'As needed' }
];

const sampleAllergies = [
  'Penicillin', 'Peanuts', 'Shellfish', 'Latex', 'Sulfa drugs'
];

const sampleStaff = [
  {
    id: 'S0001',
    first_name: 'Anna',
    last_name: 'Virtanen',
    role: 'Nurse',
    department: 'Nursing',
    email: 'anna.virtanen@nursinghome.com',
    phone: '+358-40-123-4567',
    hire_date: '2020-01-15',
    status: 'active'
  },
  {
    id: 'S0002',
    first_name: 'Mikko',
    last_name: 'Korhonen',
    role: 'Doctor',
    department: 'Medical',
    email: 'mikko.korhonen@nursinghome.com',
    phone: '+358-40-234-5678',
    hire_date: '2019-03-10',
    status: 'active'
  },
  {
    id: 'S0003',
    first_name: 'Liisa',
    last_name: 'Mäkinen',
    role: 'Physical Therapist',
    department: 'Therapy',
    email: 'liisa.makinen@nursinghome.com',
    phone: '+358-40-345-6789',
    hire_date: '2021-06-01',
    status: 'active'
  },
  {
    id: 'S0098',
    first_name: 'Zachariah',
    last_name: 'Kiehn',
    role: 'Administrator',
    department: 'Administration',
    email: 'zachariah.kiehn36@nursinghome.com',
    phone: '872-220-3587',
    hire_date: '2018-01-01',
    status: 'active'
  }
];

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Close any existing connection first
    await database.close();

    // Initialize connection pool
    await database.initialize();

    // Explicitly select the database
    const dbName = process.env.DB_NAME || 'nursing_home_db';
    await database.query(`USE \`${dbName}\``);
    logger.info(`Using database: ${dbName}`);

    // Verify required tables exist before seeding
    logger.info('Verifying required tables exist...');
    const tables = await database.query('SHOW TABLES');
    let tableNames = [];
    if (tables && tables.length > 0) {
      const firstKey = Object.keys(tables[0])[0];
      tableNames = tables.map(row => row[firstKey]);
    }

    if (tableNames.length === 0) {
      throw new Error('No tables found in database. Please run migrations first.');
    }

    logger.info(`Found ${tableNames.length} tables: ${tableNames.join(', ')}`);

    // Clear existing data (in reverse order of dependencies)
    // Use TRUNCATE for better performance, but fall back to DELETE if table doesn't exist
    const tablesToClear = [
      'visit_photos',
      'vital_signs',
      'visit_tasks',
      'visits',
      'patient_allergies',
      'emergency_contacts',
      'medications',
      'medical_conditions',
      'patient_identifiers',
      'patients',
      'fhir_resources',
      'fhir_audit_log'
    ];

    for (const tableName of tablesToClear) {
      if (tableNames.includes(tableName)) {
        try {
          // Try TRUNCATE first (faster), fall back to DELETE if foreign key constraints prevent it
          await database.query(`TRUNCATE TABLE \`${tableName}\``);
          logger.info(`Cleared table: ${tableName}`);
        } catch (truncateError) {
          // If TRUNCATE fails (e.g., due to foreign keys), use DELETE
          if (truncateError.code === 'ER_TRUNCATE_ILLEGAL_FK' ||
            truncateError.message.includes('foreign key')) {
            await database.query(`DELETE FROM \`${tableName}\``);
            logger.info(`Cleared table: ${tableName} (using DELETE)`);
          } else {
            throw truncateError;
          }
        }
      } else {
        logger.warn(`Table '${tableName}' not found, skipping clear operation`);
      }
    }

    logger.info('Cleared existing data');

    // Insert sample patients
    for (const patient of samplePatients) {
      await database.query(`
        INSERT INTO patients (id, hetu, first_name, last_name, date_of_birth, gender, room, admission_date, status, blood_type, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patient.id, patient.hetu, patient.first_name, patient.last_name,
        patient.date_of_birth, patient.gender, patient.room, patient.admission_date,
        patient.status, patient.blood_type, patient.active
      ]);

      // Add Finnish identifier
      await database.query(`
        INSERT INTO patient_identifiers (patient_id, \`system\`, value, use_type)
        VALUES (?, ?, ?, ?)
      `, [patient.id, 'urn:oid:1.2.246.21', patient.hetu, 'official']);

      // Add some medical conditions
      const numConditions = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numConditions; i++) {
        const condition = sampleMedicalConditions[Math.floor(Math.random() * sampleMedicalConditions.length)];
        await database.query(`
          INSERT INTO medical_conditions (patient_id, name, icd10_code, diagnosis_date, severity, active)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          patient.id, condition.name, condition.icd10_code,
          new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          condition.severity, true
        ]);
      }

      // Add some medications
      const numMedications = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numMedications; i++) {
        const medication = sampleMedications[Math.floor(Math.random() * sampleMedications.length)];
        await database.query(`
          INSERT INTO medications (id, patient_id, name, vnr_code, dosage, frequency, start_date, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(), patient.id, medication.name, medication.vnr_code,
          medication.dosage, medication.frequency,
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          true
        ]);
      }

      // Add some allergies
      const numAllergies = Math.floor(Math.random() * 3);
      for (let i = 0; i < numAllergies; i++) {
        const allergy = sampleAllergies[Math.floor(Math.random() * sampleAllergies.length)];
        await database.query(`
          INSERT INTO patient_allergies (patient_id, allergen, severity, active)
          VALUES (?, ?, ?, ?)
        `, [patient.id, allergy, 'moderate', true]);
      }

      // Add emergency contact
      await database.query(`
        INSERT INTO emergency_contacts (patient_id, name, relationship, phone, email, priority, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        patient.id, `${patient.first_name} Contact`, 'Daughter',
        '+358-40-123-4567', `contact.${patient.first_name.toLowerCase()}@example.com`,
        1, true
      ]);

      // Add some visits
      const numVisits = Math.floor(Math.random() * 5) + 2;
      for (let i = 0; i < numVisits; i++) {
        const visitId = uuidv4();
        const scheduledTime = new Date(Date.now() + (i - 2) * 24 * 60 * 60 * 1000);
        const status = i < 2 ? 'finished' : (i === 2 ? 'in-progress' : 'planned');

        await database.query(`
          INSERT INTO visits (id, patient_id, patient_name, nurse_id, nurse_name, scheduled_time, status, location)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          visitId, patient.id, `${patient.first_name} ${patient.last_name}`,
          'staff-001', 'Anna Virtanen', scheduledTime, status, patient.room
        ]);

        // Add some vital signs for completed visits
        if (status === 'finished') {
          const vitalSigns = [
            { type: 'temperature', loinc: '8310-5', value: 36.5 + Math.random() * 2, unit: '°C' },
            { type: 'heart_rate', loinc: '8867-4', value: 60 + Math.random() * 40, unit: 'bpm' },
            { type: 'blood_pressure_systolic', loinc: '8480-6', value: 120 + Math.random() * 40, unit: 'mmHg' },
            { type: 'blood_pressure_diastolic', loinc: '8462-4', value: 70 + Math.random() * 20, unit: 'mmHg' }
          ];

          for (const vital of vitalSigns) {
            await database.query(`
              INSERT INTO vital_signs (visit_id, patient_id, observation_type, loinc_code, value, unit, status, observed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              visitId, patient.id, vital.type, vital.loinc,
              Math.round(vital.value * 10) / 10, vital.unit, 'final', scheduledTime
            ]);
          }
        }
      }
    }

    // Insert sample staff
    for (const staff of sampleStaff) {
      await database.query(`
        INSERT INTO staff (id, first_name, last_name, role, department, email, phone, hire_date, status, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        staff.id, staff.first_name, staff.last_name, staff.role,
        staff.department, staff.email, staff.phone, staff.hire_date,
        staff.status, await bcrypt.hash('nursing123', 10)
      ]);
    }

    logger.info('Database seeding completed successfully');

    // Show summary
    const patientCount = await database.query('SELECT COUNT(*) as count FROM patients');
    const visitCount = await database.query('SELECT COUNT(*) as count FROM visits');
    const medicationCount = await database.query('SELECT COUNT(*) as count FROM medications');
    const vitalSignsCount = await database.query('SELECT COUNT(*) as count FROM vital_signs');
    const staffCount = await database.query('SELECT COUNT(*) as count FROM staff');

    logger.info(`Seeded database with:
      - ${patientCount[0].count} patients
      - ${visitCount[0].count} visits
      - ${medicationCount[0].count} medications
      - ${vitalSignsCount[0].count} vital signs records
      - ${staffCount[0].count} staff members`);

  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  } finally {
    await database.close();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Database seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
