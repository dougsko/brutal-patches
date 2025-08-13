# Brutal Patches

A modern web application for creating, sharing, and managing synthesizer patches for the Arturia MicroBrute. Built with Angular and NestJS, deployed on AWS.

🎵 **[Try it live at brutalpatches.com](https://brutalpatches.com)**

## Overview

Brutal Patches provides an intuitive interface for synthesizer enthusiasts to:

- **Create and Edit Patches**: Visual controls for all MicroBrute parameters including oscillators, filters, envelopes, and modulation
- **Share Your Sounds**: Publish patches to the community with descriptions, tags, and ratings
- **Discover New Patches**: Browse and search through community-created patches
- **Manage Your Collection**: Organize your personal patch library with favorites and custom collections

## Features

- 🎛️ **Visual Patch Editor**: Interactive knobs and sliders matching the MicroBrute interface
- 🔊 **Complete Parameter Control**: Oscillators, sub-oscillator, filters, envelopes, LFO, and modulation matrix
- 👥 **Community Sharing**: Rate, comment, and share patches with other users
- 🔍 **Smart Search**: Find patches by name, tags, author, or specific parameter ranges
- 📱 **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- 🔐 **User Authentication**: Secure JWT-based authentication with user profiles

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn package manager

### Important Compatibility Note

⚠️ **Angular Compatibility**: This project requires specific Node.js settings for Angular compatibility. The development commands are pre-configured with the necessary `NODE_OPTIONS=--openssl-legacy-provider` setting.

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/dougsko/brutal-patches.git
   cd brutal-patches
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server-src
   npm install
   cd ..
   ```

4. **Start the development environment**
   ```bash
   # Start both frontend and backend
   npm run start:all
   
   # Or start individually:
   # Frontend only: npm run start
   # Backend only: cd server-src && npm run start:dev
   ```

   **Note**: The frontend uses a proxy configuration (`src/proxy.conf.json`) to route API calls to the backend during local development.

5. **Open your browser**
   Navigate to `http://localhost:4200`

## Architecture

### Frontend (Angular)
- **Framework**: Angular with TypeScript
- **UI Components**: Angular Material + custom synthesizer controls
- **Interactive Elements**: jqWidgets knobs/sliders, jsPlumb connections
- **State Management**: Angular services with RxJS
- **Build Tool**: Angular CLI with Webpack

### Backend (NestJS)
- **API Framework**: NestJS with TypeScript
- **Database**: AWS DynamoDB (NoSQL)
- **Authentication**: JWT tokens with Passport strategies
- **Deployment**: AWS Lambda functions via Serverless Framework
- **Architecture**: Modular design (Auth, Users, Patches modules)

### Infrastructure
- **Hosting**: AWS (Lambda + CloudFront + S3)
- **Database**: AWS DynamoDB
- **CI/CD**: GitHub Actions
- **Domain**: Custom domain with SSL

## Development Workflow

This project follows a comprehensive development workflow designed for quality and collaboration. Key principles:

- **Feature Branches**: All development happens on feature branches
- **Testing First**: Local tests must pass before creating PRs
- **Code Reviews**: All changes require thorough peer review
- **Automated CI/CD**: GitHub Actions handle testing and deployment

For detailed development guidelines, see [`CLAUDE.md`](./CLAUDE.md).

### Common Commands

```bash
# Frontend Development
npm run start          # Dev server with hot reload
npm run build          # Production build
npm run test           # Run unit tests
npm run lint           # Code linting

# Backend Development (from server-src/)
npm run start:dev      # Development server
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Test coverage
```

## Deployment

### Production Deployment
The application automatically deploys to AWS when changes are merged to the main branch:

- **Frontend**: Built and deployed to S3 + CloudFront
- **Backend**: Deployed as Lambda functions via Serverless Framework
- **Database**: DynamoDB tables managed via Infrastructure as Code

### Manual Deployment
```bash
# Deploy backend
cd server-src
npm run deploy

# Deploy frontend
ng deploy
```

## Contributing

We welcome contributions! Please follow these steps:

1. **Read the development guidelines** in [`CLAUDE.md`](./CLAUDE.md)
2. **Create a feature branch** from main
3. **Make your changes** following the coding standards
4. **Run tests locally** to ensure everything works
5. **Submit a pull request** with a clear description
6. **Participate in code review** to refine your changes

### Development Standards
- **TypeScript**: Strict typing throughout
- **Testing**: Maintain comprehensive test coverage
- **Code Quality**: Follow existing patterns and ESLint rules
- **Commits**: Use conventional commit messages

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend Framework | Angular | SPA with TypeScript |
| UI Components | Angular Material | Consistent design system |
| Interactive Controls | jqWidgets | Synthesizer-style knobs/sliders |
| Backend Framework | NestJS | Scalable Node.js API |
| Database | AWS DynamoDB | NoSQL document storage |
| Authentication | JWT + Passport | Secure user sessions |
| Deployment | AWS Lambda | Serverless backend hosting |
| CI/CD | GitHub Actions | Automated testing & deployment |

## License

This project is open source. Please contact the maintainer for licensing information.

## Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/dougsko/brutal-patches/issues)
- 💡 **Feature Requests**: [Start a discussion](https://github.com/dougsko/brutal-patches/discussions)

## Acknowledgments

- Arturia for creating the amazing MicroBrute synthesizer
- The synthesizer community for inspiration and feedback
- Open source contributors who make projects like this possible

---

Made with ❤️ for the synthesizer community
