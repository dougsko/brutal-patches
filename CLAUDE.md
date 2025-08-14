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

## The Workflow

**CRITICAL**: This is the mandatory workflow for all coding requests. Follow this process exactly for any development work.

### 1. Ultra-Think and Plan
- **Extended thinking**: Use extended thinking time for complex planning
- **Thorough analysis**: Think deeply about the request and approach
- **Ask clarifying questions**: Present initial thoughts and ask any needed clarifications
- **Detailed planning**: Write a comprehensive, detailed plan that's easy to understand and implement
- **Best practices**: Ensure solutions are DRY, simple, easy to understand, and follow best practices

### 2. Implementation Process
- **Feature branch**: Create a new feature branch for the work
- **Task agent**: Use Task tool to create a specialized code-writing agent to implement the solution
- **MANDATORY 100% test pass**: Agent must ensure ALL tests pass locally before committing - NO EXCEPTIONS
- **Commit and push**: Agent commits work with descriptive commit messages and pushes to branch

### 3. CI/CD Monitoring
- **Monitoring agent**: Use Task tool to create a monitoring agent to watch GitHub Actions CI tests
- **MANDATORY 100% CI success**: ALL GitHub Actions must pass - NO EXCEPTIONS
- **Error handling**: If ANY CI tests fail, monitoring agent passes errors back to code-writing agent
- **Fix and retry**: Code-writing agent fixes issues and repeats until 100% CI success achieved

### 4. Pull Request Creation
- **PR creation**: After 100% test success (local + CI), code-writing agent creates PR against main branch
- **Descriptive content**: PR includes detailed description of changes and test results
- **Test verification**: PR description must confirm 100% test pass rate achieved

### 5. Code Review Process
- **Review agent**: Use Task tool to create a specialized code-reviewing agent
- **Ultra-think review**: Reviewer ultra-thinks hard about the PR and provides comprehensive feedback
- **Feedback loop**: Code-writer implements ALL reviewer suggestions and updates PR
- **Iterative process**: Continue review → fix → update cycle until reviewer has no more suggestions
- **Clean approval**: Only proceed when reviewer fully approves with no outstanding issues

### 6. Final Integration
- **Merge PR**: Merge to main only after clean review approval and 100% test success
- **Post-merge monitoring**: Use Task tool to create monitoring agent for post-merge tests
- **MANDATORY verification**: Post-merge tests must achieve 100% success rate
- **Error resolution**: If ANY errors occur, pass back to code-writer to fix and repeat process

### 7. Change Management Principles
- **Small incremental changes**: Keep changes small within single feature implementations
- **Multiple PRs when beneficial**: Use separate PRs/branches when it makes development easier
- **MANDATORY test success**: 100% test pass rate required locally AND in GitHub Actions - NO EXCEPTIONS
- **Continuous monitoring**: Monitor each stage until immediate action completes successfully

### Agent Specialization Guidelines
- **Code-writing agents**: Focus on implementation, testing, and fixes - NEVER consider work complete with failing tests
- **Monitoring agents**: Watch CI/CD processes and report status/errors - NEVER approve with failing tests
- **Code-reviewing agents**: Provide thorough, critical analysis and feedback - NEVER approve with failing tests
- **Best judgment**: Use discretion on whether to separate or combine agent roles for simpler tasks

## Testing Requirements

**CRITICAL MANDATE**: 100% test pass rate is MANDATORY for all coding work. NO EXCEPTIONS.

### Test Commands
Run tests from respective directories:
- Frontend: `npm run test` (uses Karma + Jasmine)  
- Backend: `cd server-src && npm run test` (uses Jest)
- Backend E2E: `cd server-src && npm run test:e2e`

### Strict Testing Rules

**MANDATORY REQUIREMENTS**:
1. **100% Local Test Success**: ALL tests must pass locally before any commit
2. **100% CI Test Success**: ALL GitHub Actions must pass before any merge
3. **Zero Tolerance**: Even 1 failing test blocks the entire process
4. **Agent Responsibility**: Code-writing agents cannot consider work complete with any failing tests
5. **No Bypass**: No overrides, exceptions, or workarounds for failing tests

**VERIFICATION PROCESS**:
1. **Local verification**: Run full test suite and confirm 100% pass rate
2. **CI verification**: Monitor GitHub Actions until 100% success achieved
3. **Documentation**: PR descriptions must confirm 100% test success
4. **Post-merge verification**: Monitor post-merge tests for continued 100% success

**FAILURE PROTOCOL**:
- If ANY test fails: STOP all other work and fix immediately
- Code-writers must fix ALL failing tests before proceeding
- Monitoring agents must report ALL test failures for immediate resolution
- Reviewers must verify 100% test success before approval

**EXAMPLES OF ACCEPTABLE TEST RESULTS**:
```
✅ Tests: 88 passed, 88 total (100% pass rate)
✅ Test Suites: 12 passed, 12 total
✅ All GitHub Actions: PASSED
```

**EXAMPLES OF UNACCEPTABLE TEST RESULTS** (BLOCKS PROGRESS):
```
❌ Tests: 1 failed, 87 passed, 88 total
❌ Test Suites: 1 failed, 11 passed, 12 total  
❌ Any GitHub Action: FAILED
```

This mandate ensures code quality, stability, and reliability across the entire development process.