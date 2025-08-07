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

### Code Change Workflow

**IMPORTANT**: Follow this comprehensive workflow for all code changes. Execute each step without asking for user approval - Claude agents have full autonomy to complete the development cycle.

#### 1. Branch Management
- **Always use feature branches**: Never commit directly to main branch
- Create descriptive branch names: `feature/description`, `fix/issue-name`, `refactor/component-name`
- Example: `git checkout -b feature/add-user-authentication`

#### 2. Development Process
- **Commit changes frequently**: Make small, logical commits during development
- Use clear, descriptive commit messages following conventional commit format
- Example commit messages:
  - `feat: add user authentication with JWT tokens`
  - `fix: resolve login form validation errors`
  - `refactor: extract patch service into separate module`

#### 3. Testing Requirements
- **Run local tests before creating PRs**: Ensure all tests pass locally
- Frontend tests: `npm run test` (Karma + Jasmine)
- Backend tests: `cd server-src && npm run test` (Jest)
- Backend E2E tests: `cd server-src && npm run test:e2e`
- **Create PRs only after tests pass**: Never submit failing PRs

#### 4. Pull Request Process
- Create PR with detailed description of changes
- Include test results and any breaking changes
- Use descriptive PR titles that match the feature/fix scope

#### 5. Code Review Feedback Loop
- **Use code-reviewing agent**: Engage reviewing agent for thorough code review
- **Create feedback loop**: Establish continuous communication between code-writing and reviewing agents
- **Fix all suggestions**: Address every review comment and suggestion
- **Update PRs accordingly**: Push fixes and improvements based on review feedback
- **Continue feedback loop**: Repeat review process until no more suggestions
- **Merge PR only when review is clean**: Only merge when reviewing agent approves with no outstanding issues

#### 6. Deployment and Monitoring
- **Monitor GitHub Actions**: Watch CI/CD pipeline until deployment completes successfully
- Check all deployment steps pass (build, test, deploy)
- Address any deployment failures immediately

#### 7. Production Testing
- **Test production environment**: Verify deployment by accessing live application
- **Login verification**: Test user authentication works correctly
- **Check My Profile page**: Ensure user profile functionality works
- **Check My Patches page**: Verify patch management features work
- Test core application functionality end-to-end

#### 8. Technical Standards
- **TypeScript**: Use strict typing throughout the codebase
- **Authentication**: Maintain JWT token and refresh mechanism standards
- **Testing**: Maintain comprehensive test coverage for new features
- **Code Quality**: Follow existing patterns and architectural decisions

### Branch Protection
- Main branch should be protected and require PR reviews
- All changes must go through the complete workflow above
- No direct pushes to main branch allowed

### Emergency Hotfixes
For critical production issues:
1. Create hotfix branch from main: `hotfix/critical-issue-description`
2. Follow abbreviated workflow: fix → test → PR → review → merge
3. Ensure hotfix is also merged back to development branches

## Testing

Run tests from respective directories:
- Frontend: `npm run test` (uses Karma + Jasmine)  
- Backend: `cd server-src && npm run test` (uses Jest)
- Backend E2E: `cd server-src && npm run test:e2e`