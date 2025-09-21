# Nursing Home Backend API

A Node.js/Express backend API for the Nursing Home Management System with FHIR R4 support and Kanta integration.

## Features

- **FHIR R4 Compliance**: Full support for FHIR R4 standard for healthcare data exchange
- **Kanta Integration**: Integration with Finnish national health system (Kanta)
- **RESTful API**: Clean REST endpoints for patient management and healthcare workflows
- **Security**: JWT authentication, rate limiting, CORS protection, and security headers
- **Database Support**: MySQL integration for persistent data storage
- **Comprehensive Logging**: Winston-based logging with configurable levels
- **Error Handling**: Centralized error handling with FHIR OperationOutcome responses

## Prerequisites

- Node.js >= 16.0.0
- MySQL >= 8.0
- npm or yarn package manager

## Quick Start

### 1. Installation

```bash
# Clone the repository (if working independently)
git clone <backend-repository-url>
cd nursing-home-backend

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

### 3. Database Setup

```bash
# Create the database (ensure MySQL is running)
mysql -u root -p -e "CREATE DATABASE nursing_home_db;"

# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:8080` (or the port specified in your .env file).

## Environment Variables

### Required Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port | `8080` | `8080` |
| `NODE_ENV` | Environment mode | `development` | `production` |
| `DB_HOST` | Database host | `localhost` | `localhost` |
| `DB_PORT` | Database port | `3306` | `3306` |
| `DB_NAME` | Database name | - | `nursing_home_db` |
| `DB_USER` | Database username | - | `db_user` |
| `DB_PASSWORD` | Database password | - | `secure_password` |
| `JWT_SECRET` | JWT signing secret | - | `your_secure_jwt_secret` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | `https://yourdomain.com` |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | JWT token expiration | `24h` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `LOG_LEVEL` | Logging level | `info` |
| `FHIR_BASE_URL` | FHIR server base URL | `http://localhost:8080/api/fhir` |
| `KANTA_API_KEY` | Kanta backend API key | - |
| `KANTA_BASE_URL` | Kanta API base URL | `https://test.kanta.fi` |

## API Endpoints

### Health Check
- `GET /health` - Server health status

### FHIR Endpoints
- `GET /api/fhir/metadata` - FHIR CapabilityStatement
- `GET /api/fhir/Patient` - Search patients
- `POST /api/fhir/Patient` - Create patient
- `GET /api/fhir/Patient/:id` - Get patient by ID
- `PUT /api/fhir/Patient/:id` - Update patient
- `DELETE /api/fhir/Patient/:id` - Delete patient
- `POST /api/fhir` - Process FHIR Bundle

## Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── db/             # Database migrations and seeds
│   ├── middleware/     # Express middleware
│   ├── routes/         # API route definitions
│   ├── __tests__/      # Test files
│   └── server.js       # Main server file
├── logs/               # Log files (created at runtime)
├── package.json        # Dependencies and scripts
├── .env.example        # Environment template
└── README.md          # This file
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- fhir.test.js
```

## FHIR Implementation

This backend implements FHIR R4 standard with the following resources:

- **Patient**: Complete patient resource with demographics and identifiers
- **Bundle**: Support for transaction and batch operations
- **CapabilityStatement**: Server capabilities and supported operations

### FHIR Content Types

The server supports the following FHIR content types:
- `application/fhir+json` (preferred)
- `application/json`

### Error Handling

FHIR endpoints return standard OperationOutcome resources for errors:

```json
{
  "resourceType": "OperationOutcome",
  "issue": [{
    "severity": "error",
    "code": "invalid",
    "diagnostics": "Detailed error message"
  }]
}
```

## Security

### Authentication
- JWT-based authentication for protected endpoints
- Configurable token expiration
- Secure token signing with strong secrets

### Rate Limiting
- Configurable rate limiting per IP address
- Default: 100 requests per 15-minute window
- Applied to all `/api/` endpoints

### CORS
- Configurable CORS origins
- Credentials support for authenticated requests
- Secure headers with Helmet.js

## Deployment

### Production Checklist

1. **Environment Variables**: Ensure all required environment variables are set
2. **Database**: Set up production MySQL database with proper credentials
3. **Security**: Use strong JWT secrets and secure database passwords
4. **CORS**: Configure `FRONTEND_URL` to match your production frontend domain
5. **Logging**: Set appropriate `LOG_LEVEL` for production (`warn` or `error`)
6. **SSL**: Use HTTPS in production environments

### Docker Support

```dockerfile
# Example Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 8080
CMD ["npm", "start"]
```

## Integration with Frontend

### API Communication
The frontend should be configured to communicate with this backend using:

```javascript
// Frontend configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
```

### CORS Configuration
Ensure the backend's `FRONTEND_URL` environment variable matches your frontend's URL:

```bash
# For local development
FRONTEND_URL=http://localhost:3000

# For production
FRONTEND_URL=https://your-frontend-domain.com
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **CORS Errors**
   - Verify `FRONTEND_URL` matches your frontend URL
   - Check that credentials are properly configured

3. **JWT Errors**
   - Ensure `JWT_SECRET` is set and secure
   - Check token expiration settings

4. **Port Conflicts**
   - Change `PORT` in `.env` if 8080 is in use
   - Update frontend API URL accordingly

### Logs

Check the application logs for detailed error information:

```bash
# View recent logs
tail -f logs/app.log

# View all logs
cat logs/app.log
```

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure all tests pass before submitting changes

## License

[Add your license information here]