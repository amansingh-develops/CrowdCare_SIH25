# CrowdCare - Civic Issue Reporting System

## Overview

CrowdCare is a production-ready full-stack civic issue reporting and resolution system built with modern web technologies. The platform enables citizens to report civic issues through a Progressive Web App (PWA) while providing administrators with comprehensive management tools. The system features AI-powered issue analysis, real-time updates, geolocation support, and role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The client application is built using React with TypeScript in a Single Page Application (SPA) architecture:

- **UI Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, accessible design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Management**: React Hook Form with Zod validation for type-safe form handling
- **PWA Support**: Service worker implementation with offline capabilities and app manifest
- **Component Architecture**: Modular component design with clear separation between presentation and business logic

### Backend Architecture

The server follows a RESTful API architecture with the following patterns:

- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules for modern JavaScript support
- **Authentication**: OpenID Connect (OIDC) integration with Replit Auth
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **File Upload**: Multer middleware for handling image uploads with validation
- **API Design**: RESTful endpoints with consistent error handling and response formatting
- **Middleware Stack**: Request logging, JSON parsing, CORS handling, and authentication guards

### Data Storage Solutions

Database architecture uses PostgreSQL with Drizzle ORM:

- **Primary Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema Design**: Relational schema with proper foreign key constraints and indexes
- **Core Entities**: Users, Departments, Issues, Comments, Images, and Upvotes
- **Session Storage**: Database-backed sessions for scalability
- **File Storage**: Local filesystem storage for uploaded images with configurable paths

### Authentication and Authorization

Multi-layered security implementation:

- **Primary Auth**: OpenID Connect with Replit authentication provider
- **Session Management**: Secure HTTP-only cookies with PostgreSQL session store
- **Role-Based Access**: User roles (citizen, admin, department_head, field_worker) with endpoint-level guards
- **API Security**: Authenticated endpoints with proper 401/403 error handling
- **CSRF Protection**: Built-in protection through SameSite cookie attributes

### AI Integration

Intelligent issue processing pipeline:

- **OpenAI Integration**: GPT-5 for advanced issue analysis and categorization
- **Analysis Features**: Automatic title generation, category detection, priority scoring, and duplicate detection
- **Image Analysis**: Support for image-based issue analysis using vision models
- **Natural Language Processing**: Summary generation and tag extraction from issue descriptions

### Real-time Features

Progressive enhancement for user experience:

- **Optimistic Updates**: Client-side state updates with server reconciliation
- **Cache Management**: Intelligent cache invalidation and background refetching
- **Live Updates**: Real-time data synchronization across user sessions
- **Offline Support**: Service worker caching for core functionality during network outages

## External Dependencies

### Core Infrastructure

- **Database**: Neon PostgreSQL serverless database for primary data storage
- **Authentication**: Replit OIDC provider for user authentication and authorization
- **AI Services**: OpenAI GPT-5 API for intelligent issue analysis and categorization
- **File Storage**: Local filesystem with configurable upload directory structure

### Development and Deployment

- **Build Tools**: Vite for fast development and optimized production builds
- **Package Manager**: npm with package-lock.json for dependency management
- **Development**: Hot module replacement and development server with Vite
- **TypeScript**: Full TypeScript support across frontend and backend with shared type definitions

### UI and Styling

- **Component Library**: Radix UI primitives for accessible, headless components
- **Styling**: Tailwind CSS for utility-first styling with CSS custom properties
- **Icons**: Lucide React for consistent iconography
- **Forms**: React Hook Form with Zod for validation and type safety

### Data Management

- **State Management**: TanStack Query for server state with caching and synchronization
- **Database ORM**: Drizzle ORM with PostgreSQL adapter for type-safe database operations
- **Migration Tool**: Drizzle Kit for database schema migrations and management
- **Date Handling**: date-fns for consistent date formatting and manipulation

### Development Tooling

- **Code Quality**: ESLint and TypeScript compiler for code quality and type checking
- **Path Mapping**: TypeScript path aliases for clean import statements
- **Hot Reloading**: Vite HMR with React Fast Refresh for rapid development iteration
- **Environment**: Cross-platform development with consistent tooling across environments