# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brutal Patches is a synthesizer patch management application with two main components:
- **Frontend**: Angular 14 application with Material UI components for creating and managing synthesizer patches
- **Backend**: NestJS API deployed as AWS Lambda functions with DynamoDB storage

The application models synthesizer patches with detailed parameter control (oscillators, filters, envelopes, LFO, modulation matrix, etc.) for what appears to be a Brute-style synthesizer.

## Development Commands

### Frontend (Angular)
```bash
# Start development server (requires NODE_OPTIONS=--openssl-legacy-provider)
npm run start

# Build for production
npm run build

# Run tests
npm run test

# Start both frontend and backend simultaneously
npm run start:all
```

### Backend (NestJS/Serverless)
```bash
# Navigate to server-src directory first
cd server-src

# Start in development mode
npm run start:dev

# Build the application
npm run build

# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov

# Format code
npm run format

# Lint code
npm run lint
```

## Architecture

### Frontend Structure
- **Components**: Located in `src/app/components/` - includes synthesizer-specific UI elements (knobs, sliders, oscillators, filters, envelopes, etc.)
- **Services**: Located in `src/app/services/` - handles API communication, authentication, and state management
- **Interfaces**: Patch data models in `src/app/interfaces/patch.ts`
- **Environment Config**: API endpoints configured in `src/environments/`

Key UI libraries used:
- Angular Material for general UI components
- jqWidgets for specialized knob/slider controls
- jQuery plugins for enhanced interactive elements
- jsPlumb for modular connections

### Backend Structure
- **NestJS Modules**: Authentication, Users, and Patches modules in `server-src/src/`
- **AWS Lambda Handler**: Entry point at `server-src/src/lambda.ts`
- **Authentication**: JWT-based auth with Passport strategies
- **Database**: DynamoDB with serverless framework configuration
- **Deployment**: Serverless Framework with AWS provider

### Data Model
The core `Patch` interface includes synthesizer parameters:
- Oscillator controls (sub_fifth, overtone, ultra_saw, saw, square, triangle, etc.)
- Filter parameters (cutoff, resonance, env_amt, brute_factor)
- Envelope settings (attack, decay, sustain, release)
- LFO and modulation matrix configuration
- User metadata (title, description, tags, ratings)

## Special Requirements

### Node.js Compatibility
The frontend requires `NODE_OPTIONS=--openssl-legacy-provider` for Angular 14 compatibility. This is already configured in the npm scripts.

### CORS Configuration
Backend is configured for production domain `brutalpatches.com`. Local development uses proxy configuration in `src/proxy.conf.json`.

### AWS Deployment
- Backend deploys via Serverless Framework to AWS Lambda
- Frontend can be deployed using `ng deploy` (configured for AWS deployment)
- DynamoDB tables and IAM roles are managed via serverless configuration

## Development Workflow

### Claude Code Planning Process
**IMPORTANT**: Before starting any development work, Claude must:

1. **Plan thoroughly**: Think carefully about the approach and write a detailed plan
2. **Document the plan**: Save the plan as a file in the `claude/` folder 
3. **Ask clarifying questions**: Present the plan and ask any questions needed for clarity
4. **Revise based on feedback**: Update the plan based on user answers before proceeding
5. **Check for guidance**: Always look in `claude/` folder for any helpful files the user has added

The `claude/` folder is gitignored and serves as a workspace for development planning and temporary files.

### Technical Workflow
1. Both frontend and backend have comprehensive test suites using Jasmine/Karma (frontend) and Jest (backend)
2. The project uses TypeScript throughout with strict typing enabled
3. Authentication flow is implemented with JWT tokens and refresh mechanisms
4. The application supports user registration, patch creation/editing, and patch sharing

## Testing

Run tests from respective directories:
- Frontend: `npm run test` (uses Karma + Jasmine)  
- Backend: `cd server-src && npm run test` (uses Jest)
- Backend E2E: `cd server-src && npm run test:e2e`