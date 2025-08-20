# SaaS Framework - Multi-Tenant Platform

## Overview

This is a comprehensive multi-tenant SaaS framework built for tenant management with both admin and tenant portals. The platform provides guided tenant onboarding with progress tracking, real-time monitoring, and email notifications. It's designed to support separate Authentication & RBAC NPM modules for external application integration. The system features a React frontend with a clean admin interface, guided onboarding wizard, and an Express.js backend with PostgreSQL database using Drizzle ORM.

## Recent Updates

**Latest Feature: Guided Onboarding Wizard** (August 2025)
- Added comprehensive 4-step onboarding wizard with progress tracking
- Visual step indicators with icons and completion status
- Module selection with recommended badges and detailed descriptions
- Dynamic configuration forms based on selected modules
- Review step with full configuration summary
- Smooth animations and transitions between steps
- Both guided wizard and quick add options available

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui for consistent design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Animations**: Framer Motion for smooth transitions and wizard animations
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **User Experience**: Multi-step guided wizards with progress tracking

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Session Management**: Database-stored sessions with token-based validation
- **API Design**: RESTful endpoints with structured error handling

### Data Storage Solutions
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Connection Pooling**: Neon serverless connection pooling

### Database Schema Design
- **Multi-tenant architecture** with tenant isolation
- **Core entities**: Tenants, Users, Sessions, Roles, Permissions
- **RBAC system** with role-based access control
- **Email logging** for audit trails
- **UUID primary keys** for all entities

### Authentication and Authorization
- **JWT tokens** for stateless authentication
- **Tenant-scoped authentication** with middleware validation
- **Role-based permissions** system
- **Session management** with database persistence
- **Password security** using bcrypt hashing

### API Architecture
- **RESTful design** with consistent endpoint patterns
- **Middleware chain** for authentication, tenant validation, and error handling
- **Type-safe request/response** handling with Zod schemas
- **Structured error responses** with appropriate HTTP status codes

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations and schema management

### Email Services
- **Nodemailer**: SMTP email sending with Office 365 integration
- **Email templates**: HTML email generation for tenant onboarding

### Authentication Services
- **JWT (jsonwebtoken)**: Token generation and verification
- **bcryptjs**: Password hashing and verification

### UI and Styling
- **Radix UI**: Comprehensive component library for React
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundling for production builds

### Monitoring and Development
- **Replit integration**: Development environment with hot reloading
- **Health check endpoints**: System status monitoring
- **Request logging**: Structured logging for API requests