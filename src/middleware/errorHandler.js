/**
 * Global error handler middleware
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = 'Validation Error';
    errorResponse.message = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorResponse.error = 'Invalid ID';
    errorResponse.message = 'Invalid resource ID format';
  } else if (err.code === 11000) {
    statusCode = 409;
    errorResponse.error = 'Duplicate Resource';
    errorResponse.message = 'Resource with this identifier already exists';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.error = 'Authentication Error';
    errorResponse.message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse.error = 'Authentication Error';
    errorResponse.message = 'Token expired';
  } else if (err.message) {
    errorResponse.message = err.message;
  }

  // For FHIR endpoints, return OperationOutcome
  if (req.path.startsWith('/api/fhir')) {
    const operationOutcome = {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: statusCode >= 500 ? 'exception' : 'invalid',
        diagnostics: errorResponse.message
      }]
    };

    return res.status(statusCode).json(operationOutcome);
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;