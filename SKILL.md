---
name: NestJS Best Practices
description: Comprehensive best practices for building production-ready NestJS applications. Covers architecture, dependency injection, security, performance, testing, database, API design, microservices, and DevOps patterns.
version: 1.0.0
author: NestJS Best Practices Community
tags:
  - nestjs
  - typescript
  - nodejs
  - backend
  - api
  - microservices
---

# NestJS Best Practices

This skillset provides comprehensive best practices for building production-ready NestJS applications. Each rule includes clear explanations, incorrect vs correct code examples, and references to official documentation.

## Overview

NestJS is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications. These best practices help you:

- **Build maintainable architectures** with proper module organization and dependency injection
- **Secure your applications** with input validation, authentication, and rate limiting
- **Optimize performance** through caching, lazy loading, and database query optimization
- **Write reliable tests** using NestJS testing utilities and proper mocking
- **Deploy confidently** with health checks, graceful shutdown, and proper logging

## Categories

### 🏗️ Architecture (arch-)
Core architectural patterns for scalable NestJS applications.

- **[arch-avoid-circular-deps](rules/arch-avoid-circular-deps.md)** - CRITICAL - Circular dependencies cause runtime errors
- **[arch-feature-modules](rules/arch-feature-modules.md)** - CRITICAL - Organize by feature, not technical layer
- **[arch-single-responsibility](rules/arch-single-responsibility.md)** - CRITICAL - Focused services over "god services"
- **[arch-use-repository-pattern](rules/arch-use-repository-pattern.md)** - HIGH - Abstract database logic for testability
- **[arch-use-events](rules/arch-use-events.md)** - MEDIUM-HIGH - Event-driven architecture for decoupling

### 💉 Dependency Injection (di-)
Leverage NestJS DI system correctly.

- **[di-prefer-constructor-injection](rules/di-prefer-constructor-injection.md)** - CRITICAL - Constructor over property injection
- **[di-scope-awareness](rules/di-scope-awareness.md)** - CRITICAL - Understand singleton/request/transient scopes
- **[di-use-interfaces-tokens](rules/di-use-interfaces-tokens.md)** - HIGH - Use injection tokens for interfaces
- **[di-avoid-service-locator](rules/di-avoid-service-locator.md)** - HIGH - Avoid service locator anti-pattern

### ⚠️ Error Handling (error-)
Proper error handling and exception management.

- **[error-use-exception-filters](rules/error-use-exception-filters.md)** - HIGH - Centralized exception handling
- **[error-throw-http-exceptions](rules/error-throw-http-exceptions.md)** - HIGH - Use NestJS HTTP exceptions
- **[error-handle-async-errors](rules/error-handle-async-errors.md)** - HIGH - Handle async errors properly

### 🔒 Security (security-)
Protect your application from common vulnerabilities.

- **[security-auth-jwt](rules/security-auth-jwt.md)** - CRITICAL - Secure JWT authentication
- **[security-validate-all-input](rules/security-validate-all-input.md)** - HIGH - Validate with class-validator
- **[security-use-guards](rules/security-use-guards.md)** - HIGH - Authentication and authorization guards
- **[security-sanitize-output](rules/security-sanitize-output.md)** - HIGH - Prevent XSS attacks
- **[security-rate-limiting](rules/security-rate-limiting.md)** - HIGH - Implement rate limiting

### ⚡ Performance (perf-)
Optimize application speed and resource usage.

- **[perf-async-hooks](rules/perf-async-hooks.md)** - HIGH - Proper async lifecycle hooks
- **[perf-use-caching](rules/perf-use-caching.md)** - HIGH - Implement caching strategies
- **[perf-optimize-database](rules/perf-optimize-database.md)** - HIGH - Optimize database queries
- **[perf-lazy-loading](rules/perf-lazy-loading.md)** - MEDIUM - Lazy load modules for faster startup

### 🧪 Testing (test-)
Write reliable, maintainable tests.

- **[test-use-testing-module](rules/test-use-testing-module.md)** - MEDIUM-HIGH - Use NestJS testing utilities
- **[test-e2e-supertest](rules/test-e2e-supertest.md)** - MEDIUM-HIGH - E2E testing with Supertest
- **[test-mock-external-services](rules/test-mock-external-services.md)** - MEDIUM-HIGH - Mock external dependencies

### 🗄️ Database (db-)
Database patterns and best practices.

- **[db-use-transactions](rules/db-use-transactions.md)** - MEDIUM-HIGH - Transaction management
- **[db-avoid-n-plus-one](rules/db-avoid-n-plus-one.md)** - HIGH - Avoid N+1 query problems
- **[db-use-migrations](rules/db-use-migrations.md)** - HIGH - Use migrations for schema changes

### 🌐 API Design (api-)
Build consistent, well-designed APIs.

- **[api-use-dto-serialization](rules/api-use-dto-serialization.md)** - MEDIUM - DTO and response serialization
- **[api-use-interceptors](rules/api-use-interceptors.md)** - MEDIUM-HIGH - Cross-cutting concerns
- **[api-versioning](rules/api-versioning.md)** - MEDIUM - API versioning strategies
- **[api-use-pipes](rules/api-use-pipes.md)** - MEDIUM - Input transformation with pipes

### 📡 Microservices (micro-)
Patterns for distributed systems.

- **[micro-use-patterns](rules/micro-use-patterns.md)** - MEDIUM - Message and event patterns
- **[micro-use-health-checks](rules/micro-use-health-checks.md)** - MEDIUM-HIGH - Health checks for orchestration
- **[micro-use-queues](rules/micro-use-queues.md)** - MEDIUM-HIGH - Background job processing

### 🚀 DevOps (devops-)
Production deployment patterns.

- **[devops-use-config-module](rules/devops-use-config-module.md)** - LOW-MEDIUM - Environment configuration
- **[devops-use-logging](rules/devops-use-logging.md)** - MEDIUM-HIGH - Structured logging
- **[devops-graceful-shutdown](rules/devops-graceful-shutdown.md)** - MEDIUM-HIGH - Zero-downtime deployments

## Impact Levels

Rules are categorized by their impact on application quality:

| Level | Description |
|-------|-------------|
| **CRITICAL** | Violations cause runtime errors, security vulnerabilities, or architectural breakdown |
| **HIGH** | Significant impact on reliability, security, or maintainability |
| **MEDIUM-HIGH** | Notable impact on quality and developer experience |
| **MEDIUM** | Moderate impact on code quality and best practices |
| **LOW-MEDIUM** | Minor improvements for consistency and maintainability |

## Quick Start

1. **Architecture**: Start with [arch-feature-modules](rules/arch-feature-modules.md) to organize your application
2. **Security**: Implement [security-validate-all-input](rules/security-validate-all-input.md) and [security-auth-jwt](rules/security-auth-jwt.md)
3. **Testing**: Use [test-use-testing-module](rules/test-use-testing-module.md) for unit tests
4. **Performance**: Add [perf-use-caching](rules/perf-use-caching.md) for frequently accessed data
5. **Deployment**: Configure [devops-graceful-shutdown](rules/devops-graceful-shutdown.md) and [micro-use-health-checks](rules/micro-use-health-checks.md)

## References

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [TypeORM Documentation](https://typeorm.io/)
- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)
