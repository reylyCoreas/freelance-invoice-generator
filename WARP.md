# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with nodemon hot reload
- `npm start` - Start production server
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

### Code Quality
- `npm run lint` - Run ESLint on source files
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier

### Build & Deployment
- `npm run build` - Build for production using webpack
- `npm run serve` - Serve built files from dist directory

### Testing Individual Components
- `npm test -- --testNamePattern="InvoiceController"` - Run specific test suite
- `npm test -- src/controllers/invoiceController.test.js` - Run specific test file

## Architecture Overview

### Core Structure
This is a Node.js Express API application using ES6 modules for a freelance invoice generator. The architecture follows a classic MVC pattern with RESTful API design.

**Key Architectural Decisions:**
- **ES6 Modules**: Uses `"type": "module"` in package.json, requiring `.js` extensions in imports
- **Class-based Controllers**: Controllers are implemented as ES6 classes with async methods
- **Centralized Error Handling**: All errors flow through `errorHandler` middleware
- **Custom Logger**: Environment-aware logging (structured JSON in production, readable format in development)

### Directory Structure
```
src/
├── controllers/     # Business logic for API endpoints (invoices, clients, templates)
├── routes/         # Express route definitions with endpoint mappings
├── middleware/     # Express middleware (error handling, etc.)
├── utils/         # Utility functions (logger, etc.)
├── models/        # Data models (empty - database layer not implemented)
├── services/      # Business services (empty - not implemented)
└── index.js       # Main application entry point

templates/         # Invoice template files (empty - to be implemented)
assets/           # Static assets (logos, images)
tests/            # Test files (empty - to be implemented)
```

### API Endpoints
The application exposes RESTful APIs for three main resources:

**Invoices** (`/api/invoices`)
- CRUD operations for invoice management
- PDF generation (`POST /:id/generate-pdf`)
- Email sending (`POST /:id/send-email`)
- Preview functionality (`GET /:id/preview`)

**Clients** (`/api/clients`)
- Client management with CRUD operations
- Client invoice history (`GET /:id/invoices`)

**Templates** (`/api/templates`)
- Template management for invoice designs
- Template preview functionality (`GET /:id/preview`)

### Technology Stack
- **Runtime**: Node.js 16+ with ES6 modules
- **Framework**: Express.js with security middleware (Helmet, CORS)
- **PDF Generation**: Puppeteer for invoice PDF creation
- **Template Engine**: Handlebars for invoice templates
- **Validation**: Joi for request validation
- **Authentication**: JWT and bcryptjs (dependencies present)
- **Build**: Webpack with Babel for frontend assets
- **Testing**: Jest with Supertest for API testing

### Current Implementation Status
⚠️ **Important**: This project is in early scaffolding phase. Most controller methods return "Not implemented yet" messages. The following components need implementation:

- Database models and data persistence
- Service layer for business logic
- Authentication and authorization
- PDF generation with Puppeteer
- Template rendering with Handlebars
- Email sending functionality
- Comprehensive test suite

### Environment Configuration
The application expects a `.env` file with:
```env
# Business Information
BUSINESS_NAME="Your Business Name"
BUSINESS_EMAIL="your-email@example.com"
BUSINESS_ADDRESS="Your Business Address"

# Tax Settings
TAX_RATE=0.08
CURRENCY="USD"

# Server Configuration
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:3000"

# Export Settings
DEFAULT_EXPORT_FORMAT="PDF"
```

### Development Notes
- Server runs on port 3000 by default with health check at `/health`
- All API routes are prefixed with `/api`
- Error responses include request context (path, method, timestamp)
- Development mode enables detailed error stack traces
- Static files served from `/static` (assets) and `/templates` routes

### PDF Generation Integration
The project includes Puppeteer for PDF generation, suggesting invoice PDF creation will be server-side rendered from Handlebars templates. Template files should be placed in the `templates/` directory.
