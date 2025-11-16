-- MySQL Schema for Nursing Home Dashboard
-- This schema matches the structure expected by the seed.js file

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(50) PRIMARY KEY,
  hetu VARCHAR(20) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  room VARCHAR(20),
  admission_date DATE NOT NULL,
  discharge_date DATE,
  status VARCHAR(50) NOT NULL,
  blood_type VARCHAR(10),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hetu (hetu),
  INDEX idx_room (room),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient Identifiers Table (for FHIR support)
CREATE TABLE IF NOT EXISTS patient_identifiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL,
  `system` VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  use_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patient_id),
  INDEX idx_system_value (`system`, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Medical Conditions Table
CREATE TABLE IF NOT EXISTS medical_conditions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  icd10_code VARCHAR(20),
  diagnosis_date DATE NOT NULL,
  severity VARCHAR(20) NOT NULL,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patient_id),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Medications Table
CREATE TABLE IF NOT EXISTS medications (
  id VARCHAR(50) PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  vnr_code VARCHAR(50),
  dosage VARCHAR(50) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patient_id),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient Allergies Table
CREATE TABLE IF NOT EXISTS patient_allergies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL,
  allergen VARCHAR(100) NOT NULL,
  severity VARCHAR(20),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patient_id),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  address TEXT,
  priority INT DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patient_id),
  INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(50) PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  department VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  hire_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visits Table
CREATE TABLE IF NOT EXISTS visits (
  id VARCHAR(50) PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL,
  patient_name VARCHAR(200),
  nurse_id VARCHAR(50),
  nurse_name VARCHAR(200),
  scheduled_time TIMESTAMP NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'planned',
  location VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patient_id),
  INDEX idx_scheduled_time (scheduled_time),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vital Signs Table
CREATE TABLE IF NOT EXISTS vital_signs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visit_id VARCHAR(50),
  patient_id VARCHAR(50) NOT NULL,
  observation_type VARCHAR(50) NOT NULL,
  loinc_code VARCHAR(20),
  value DECIMAL(10, 2),
  unit VARCHAR(20),
  status VARCHAR(50) DEFAULT 'final',
  observed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_visit_id (visit_id),
  INDEX idx_patient_id (patient_id),
  INDEX idx_observed_at (observed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FHIR Resources Table (for FHIR resource storage)
CREATE TABLE IF NOT EXISTS fhir_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50) NOT NULL,
  version_id INT DEFAULT 1,
  content JSON NOT NULL,
  patient_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_resource (resource_type, resource_id, version_id),
  INDEX idx_resource_type_id (resource_type, resource_id),
  INDEX idx_patient_id (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FHIR Audit Log Table
CREATE TABLE IF NOT EXISTS fhir_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  user_id VARCHAR(50),
  ip_address VARCHAR(45),
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

