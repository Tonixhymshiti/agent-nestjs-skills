# NestJS Best Practices Sections

Rules are automatically categorized based on their filename prefix. Rules within each section are sorted alphabetically.

## Section Definitions

### 1. Architecture (arch-)
**Impact: CRITICAL**

Proper module organization and dependency management are the foundation of maintainable NestJS applications. Poor architecture leads to circular dependencies, tight coupling, and unmaintainable codebases.

### 2. Dependency Injection (di-)
**Impact: CRITICAL**

NestJS's IoC container is powerful but can be misused. Understanding provider scopes, custom providers, and injection patterns is essential for building scalable applications.

### 3. Error Handling (error-)
**Impact: HIGH**

Consistent error handling improves debugging, user experience, and API reliability. NestJS provides exception filters and built-in exceptions that should be used correctly.

### 4. Security (security-)
**Impact: HIGH**

Security vulnerabilities can be catastrophic. Following security best practices for authentication, authorization, input validation, and data protection is non-negotiable.

### 5. Performance (perf-)
**Impact: HIGH**

Optimizing request handling, caching, database queries, and async operations directly impacts application responsiveness and scalability.

### 6. Testing (test-)
**Impact: MEDIUM-HIGH**

Well-tested applications are more reliable and easier to maintain. Understanding NestJS testing utilities and patterns ensures comprehensive test coverage.

### 7. Database & ORM (db-)
**Impact: MEDIUM-HIGH**

Proper database access patterns, connection management, and query optimization are crucial for data-intensive applications.

### 8. API Design (api-)
**Impact: MEDIUM**

RESTful conventions, versioning, documentation, and consistent response formats improve API usability and maintainability.

### 9. Microservices (micro-)
**Impact: MEDIUM**

Building distributed systems requires understanding message patterns, transport layers, and inter-service communication.

### 10. DevOps & Deployment (devops-)
**Impact: LOW-MEDIUM**

Configuration management, logging, health checks, and deployment strategies ensure production readiness.
