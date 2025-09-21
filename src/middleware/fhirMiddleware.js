/**
 * FHIR middleware for content-type handling and request validation
 */

const validateContentType = (req, res, next) => {
    // Skip validation for GET requests and metadata endpoint
    if (req.method === 'GET' || req.path === '/metadata') {
        return next();
    }

    const contentType = req.get('Content-Type');
    const acceptHeader = req.get('Accept');

    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (!contentType || (!contentType.includes('application/fhir+json') && !contentType.includes('application/json'))) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'invalid',
                    diagnostics: 'Content-Type must be application/fhir+json or application/json'
                }]
            });
        }
    }

    // Set default Accept header if not provided
    if (!acceptHeader) {
        req.headers.accept = 'application/fhir+json';
    }

    next();
};

const validateFHIRRequest = (req, res, next) => {
    // Add FHIR-specific headers to response
    res.set({
        'Content-Type': 'application/fhir+json; charset=utf-8',
        'X-FHIR-Version': '4.0.1'
    });

    // Validate FHIR resource structure for POST/PUT requests
    if (['POST', 'PUT'].includes(req.method) && req.body) {
        const resource = req.body;

        // Basic FHIR resource validation
        if (!resource.resourceType) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'structure',
                    diagnostics: 'FHIR resource must have a resourceType property'
                }]
            });
        }

        // Validate resource type matches URL for specific resource endpoints
        const urlParts = req.path.split('/');
        const resourceTypeFromUrl = urlParts[1]; // e.g., /Patient/123 -> Patient

        if (resourceTypeFromUrl && resourceTypeFromUrl !== 'Bundle' && resource.resourceType !== resourceTypeFromUrl) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'invalid',
                    diagnostics: `Resource type ${resource.resourceType} does not match URL path ${resourceTypeFromUrl}`
                }]
            });
        }

        // For PUT requests, validate that ID matches URL
        if (req.method === 'PUT' && req.params.id && resource.id && resource.id !== req.params.id) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'invalid',
                    diagnostics: 'Resource ID in body must match ID in URL'
                }]
            });
        }
    }

    next();
};

const handleFHIRError = (error, req, res, next) => {
    console.error('FHIR Error:', error);

    // Create FHIR-compliant OperationOutcome
    const operationOutcome = {
        resourceType: 'OperationOutcome',
        issue: [{
            severity: 'error',
            code: 'exception',
            diagnostics: error.message || 'An unexpected error occurred'
        }]
    };

    // Set appropriate status code
    let statusCode = 500;
    if (error.name === 'ValidationError') {
        statusCode = 400;
        operationOutcome.issue[0].code = 'invalid';
    } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        operationOutcome.issue[0].code = 'not-found';
    } else if (error.name === 'ConflictError') {
        statusCode = 409;
        operationOutcome.issue[0].code = 'conflict';
    }

    res.status(statusCode).json(operationOutcome);
};

module.exports = {
    validateContentType,
    validateFHIRRequest,
    handleFHIRError
};