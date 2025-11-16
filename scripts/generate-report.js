/**
 * Test Report Generator for FHIR API Backend
 */

const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

const testSuites = {
    'S3.TS1': { name: 'Health Endpoint Tests', tests: 1 },
    'S3.TS2': { name: 'Get All Patients Tests', tests: 8 },
    'S3.TS3': { name: 'Get Patient by ID Tests', tests: 5 },
    'S3.TS4': { name: 'Database Connection Tests', tests: 3 },
    'S3.TS5': { name: 'Data Transformation Tests', tests: 4 }
};

function generateReport() {
    const timestamp = new Date().toISOString();
    let report = '';

    report += '═══════════════════════════════════════════════════════════════════\n';
    report += '              FHIR API BACKEND TEST REPORT                         \n';
    report += '═══════════════════════════════════════════════════════════════════\n';
    report += `Generated: ${timestamp}\n`;
    report += 'Service: Patient FHIR Service (S3)\n';
    report += 'Test Framework: Jest + Supertest\n';
    report += '═══════════════════════════════════════════════════════════════════\n\n';

    let totalTests = 0;
    Object.values(testSuites).forEach(suite => totalTests += suite.tests);

    report += `Total Test Cases: ${totalTests}\n`;
    report += `Test Suites: ${Object.keys(testSuites).length}\n\n`;

    Object.entries(testSuites).forEach(([id, suite]) => {
        report += `${id}: ${suite.name} (${suite.tests} tests)\n`;
    });

    report += '\n═══════════════════════════════════════════════════════════════════\n';

    const reportPath = path.join(reportsDir, 'test-report-natural-language.txt');
    fs.writeFileSync(reportPath, report);
    
    console.log('\n✓ Test report generated:', reportPath);
}

try {
    generateReport();
} catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
}
