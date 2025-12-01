const database = require('../config/database');
const logger = require('../config/logger');
const axios = require('axios');

const STAFF_SERVICE_URL = process.env.STAFF_SERVICE_URL || 'http://localhost:6001';

/**
 * Fetch employee data from Oracle HR system via staff-service
 */
async function fetchEmployeeFromHR(employeeId) {
  try {
    const response = await axios.get(`${STAFF_SERVICE_URL}/api/employee/${employeeId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create FHIR Practitioner resource from employee and additional data
 */
function createFHIRPractitioner(employee, additionalData) {
  const practitioner = {
    resourceType: 'Practitioner',
    id: additionalData.id,
    identifier: [
      {
        system: 'http://hoitokoti.fi/employee-id',
        value: employee.employeeId.toString()
      }
    ],
    active: additionalData.status === 'active',
    name: [
      {
        use: 'official',
        family: employee.lastName,
        given: [employee.firstName]
      }
    ],
    telecom: [
      {
        system: 'phone',
        value: employee.phoneNumber,
        use: 'work'
      },
      {
        system: 'email',
        value: employee.email,
        use: 'work'
      }
    ],
    qualification: []
  };

  // Add Valvira ID if provided
  if (additionalData.valvira_id) {
    practitioner.identifier.push({
      system: 'http://valvira.fi/license',
      value: additionalData.valvira_id
    });
  }

  // Add Terhikki ID if provided
  if (additionalData.terhikki_id) {
    practitioner.identifier.push({
      system: 'http://terhikki.fi/professional-id',
      value: additionalData.terhikki_id
    });
  }

  // Add qualifications
  if (additionalData.qualifications && Array.isArray(additionalData.qualifications)) {
    practitioner.qualification = additionalData.qualifications.map(qual => ({
      identifier: qual.identifier ? [{ value: qual.identifier }] : [],
      code: {
        coding: [{
          system: qual.system || 'http://terminology.hl7.org/CodeSystem/v2-0360',
          code: qual.code,
          display: qual.display
        }],
        text: qual.display
      },
      period: qual.period ? {
        start: qual.period.start,
        end: qual.period.end
      } : undefined,
      issuer: qual.issuer ? {
        display: qual.issuer
      } : undefined
    }));
  }

  return practitioner;
}

/**
 * GET /api/staff
 * Get all staff members
 */
async function getAllStaff(req, res) {
  try {
    const [rows] = await database.pool.query(
      'SELECT * FROM staff WHERE status = ? ORDER BY last_name, first_name',
      ['active']
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    logger.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff members'
    });
  }
}

/**
 * GET /api/staff/:id
 * Get staff member by ID
 */
async function getStaffById(req, res) {
  try {
    const [rows] = await database.pool.query(
      'SELECT * FROM staff WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error('Error fetching staff by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff member'
    });
  }
}

/**
 * GET /api/staff/by-employee/:employeeId
 * Get staff member by Oracle employee ID
 */
async function getStaffByEmployeeId(req, res) {
  try {
    const [rows] = await database.pool.query(
      'SELECT * FROM staff WHERE employee_id = ?',
      [req.params.employeeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error('Error fetching staff by employee ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff member'
    });
  }
}

/**
 * POST /api/staff
 * Create new staff member from Oracle HR employee
 */
async function createStaff(req, res) {
  try {
    const { employee_id, role, department, valvira_id, terhikki_id, qualifications } = req.body;

    // Validate required fields
    if (!employee_id || !role || !department) {
      return res.status(400).json({
        success: false,
        error: 'employee_id, role, and department are required'
      });
    }

    // Check if staff already exists
    const [existing] = await database.pool.query(
      'SELECT id FROM staff WHERE employee_id = ?',
      [employee_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Staff member already exists'
      });
    }

    // Fetch employee from Oracle HR system
    const employee = await fetchEmployeeFromHR(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found in HR system'
      });
    }

    // Generate staff ID
    const staffId = `S${String(employee_id).padStart(4, '0')}`;

    // Create FHIR Practitioner resource
    const fhirPractitioner = createFHIRPractitioner(employee, {
      id: staffId,
      status: 'active',
      valvira_id,
      terhikki_id,
      qualifications
    });

    // Insert into database
    await database.pool.query(
      `INSERT INTO staff (id, employee_id, first_name, last_name, role, department, 
       email, phone, hire_date, status, fhir_practitioner) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        staffId,
        employee_id,
        employee.firstName,
        employee.lastName,
        role,
        department,
        employee.email,
        employee.phoneNumber,
        employee.hireDate,
        'active',
        JSON.stringify(fhirPractitioner)
      ]
    );

    // Fetch the created staff member
    const [created] = await database.pool.query(
      'SELECT * FROM staff WHERE id = ?',
      [staffId]
    );

    res.status(201).json({
      success: true,
      data: created[0]
    });
  } catch (error) {
    logger.error('Error creating staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create staff member'
    });
  }
}

/**
 * PUT /api/staff/:id
 * Update staff member (FHIR data only, HR data is read-only)
 */
async function updateStaff(req, res) {
  try {
    const { id } = req.params;
    const { role, department, valvira_id, terhikki_id, qualifications } = req.body;

    // Check if staff exists
    const [existing] = await database.pool.query(
      'SELECT * FROM staff WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    const staff = existing[0];
    const currentFhir = staff.fhir_practitioner || {};

    // Update FHIR Practitioner resource
    const updatedFhir = {
      ...currentFhir,
      identifier: currentFhir.identifier || []
    };

    // Update Valvira ID
    if (valvira_id) {
      const valviraIndex = updatedFhir.identifier.findIndex(
        i => i.system === 'http://valvira.fi/license'
      );
      if (valviraIndex >= 0) {
        updatedFhir.identifier[valviraIndex].value = valvira_id;
      } else {
        updatedFhir.identifier.push({
          system: 'http://valvira.fi/license',
          value: valvira_id
        });
      }
    }

    // Update Terhikki ID
    if (terhikki_id) {
      const terhikkiIndex = updatedFhir.identifier.findIndex(
        i => i.system === 'http://terhikki.fi/professional-id'
      );
      if (terhikkiIndex >= 0) {
        updatedFhir.identifier[terhikkiIndex].value = terhikki_id;
      } else {
        updatedFhir.identifier.push({
          system: 'http://terhikki.fi/professional-id',
          value: terhikki_id
        });
      }
    }

    // Update qualifications
    if (qualifications) {
      updatedFhir.qualification = qualifications.map(qual => ({
        identifier: qual.identifier ? [{ value: qual.identifier }] : [],
        code: {
          coding: [{
            system: qual.system || 'http://terminology.hl7.org/CodeSystem/v2-0360',
            code: qual.code,
            display: qual.display
          }],
          text: qual.display
        },
        period: qual.period ? {
          start: qual.period.start,
          end: qual.period.end
        } : undefined,
        issuer: qual.issuer ? {
          display: qual.issuer
        } : undefined
      }));
    }

    // Build update query
    const updates = [];
    const values = [];

    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (department) {
      updates.push('department = ?');
      values.push(department);
    }

    updates.push('fhir_practitioner = ?');
    values.push(JSON.stringify(updatedFhir));
    values.push(id);

    await database.pool.query(
      `UPDATE staff SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated staff
    const [updated] = await database.pool.query(
      'SELECT * FROM staff WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updated[0]
    });
  } catch (error) {
    logger.error('Error updating staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff member'
    });
  }
}

/**
 * PATCH /api/staff/:id/status
 * Update staff status (soft delete)
 */
async function updateStaffStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status (active or inactive) is required'
      });
    }

    // Check if staff exists
    const [existing] = await database.pool.query(
      'SELECT id FROM staff WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Update status
    await database.pool.query(
      'UPDATE staff SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({
      success: true,
      message: `Staff member ${status === 'active' ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    logger.error('Error updating staff status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff status'
    });
  }
}

module.exports = {
  getAllStaff,
  getStaffById,
  getStaffByEmployeeId,
  createStaff,
  updateStaff,
  updateStaffStatus
};
