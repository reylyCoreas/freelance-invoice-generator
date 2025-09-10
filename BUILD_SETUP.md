# Build Setup Guide

## Problem Solved

The original project was trying to bundle server-side Node.js code (including Puppeteer and other Node.js-specific modules) for the browser using webpack, which caused numerous polyfill errors and was architecturally incorrect.

## Solution

We've separated the client and server concerns:

### Client-Side (`src/client/`)
- **Entry Point**: `src/client/app.js` - Pure browser-compatible JavaScript
- **Build Tool**: Webpack with proper polyfills for browser-compatible Node.js modules
- **Output**: `dist/` directory with bundled client assets

### Server-Side (`src/`)
- **Entry Point**: `src/index.js` - Node.js server with Express
- **Server Modules**: Puppeteer, Nodemailer, etc. run only on the server
- **API Routes**: `/api/*` endpoints for client-server communication

## Dependencies Installed

### Polyfill Packages
```bash
npm install --save-dev \
  crypto-browserify path-browserify os-browserify stream-browserify \
  browserify-zlib util stream-http https-browserify querystring-es3 \
  assert url process buffer events constants-browserify domain-browser \
  punycode string_decoder timers-browserify tty-browserify vm-browserify \
  concurrently
```

## Build Commands

### Development
```bash
# Start server only
npm run dev

# Build client for development with watch mode
npm run build:watch

# Run both server and client build in parallel
npm run dev:full
```

### Production
```bash
# Build client for production
npm run build

# Start production server
NODE_ENV=production npm start
```

### Testing Build
```bash
# Serve built files from dist/
npm run serve
```

## Webpack Configuration

The `webpack.config.js` includes:

1. **Entry Point**: `./src/client/app.js` (client-only code)
2. **Polyfills**: Browser equivalents for Node.js core modules
3. **Externals**: Server-only modules excluded from bundle
4. **Output**: Clean dist directory with bundled assets

## Architecture Benefits

1. **Separation of Concerns**: Client and server code are properly separated
2. **Performance**: Smaller client bundle without server dependencies
3. **Security**: Server-only modules never exposed to browser
4. **Maintainability**: Clear distinction between client and server logic
5. **Build Efficiency**: No unnecessary polyfills for server-only modules

## File Structure

```
src/
├── client/
│   └── app.js              # Client-side entry point
├── controllers/            # Server-side controllers
├── routes/                 # API routes
├── services/              # Server services (PDF, email)
├── middleware/            # Express middleware
├── utils/                 # Server utilities
└── index.js               # Server entry point

dist/                       # Built client assets
├── bundle.js              # Bundled client JavaScript
├── index.html             # HTML with injected scripts
└── bundle.js.LICENSE.txt  # Licenses for bundled modules

public/                     # Development static files
└── index.html             # Development HTML template
```

## Server Configuration

The server now:
- Serves built assets from `dist/` in production
- Serves development assets from `public/` in development
- Provides SPA routing support for client-side navigation
- Keeps all API routes under `/api/*` namespace

This setup ensures proper separation between client and server code while maintaining a smooth development experience.
