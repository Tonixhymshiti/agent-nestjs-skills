# Sections

This document outlines ten NestJS best practices categories ranked by impact:

1. **Architecture (arch)** — CRITICAL impact. Proper module organization and dependency management are the foundation of maintainable NestJS applications.

2. **Dependency Injection (di)** — CRITICAL impact. NestJS's IoC container is powerful but can be misused. Understanding scopes and injection patterns is essential.

3. **Error Handling (error)** — HIGH impact. Consistent error handling improves debugging, user experience, and API reliability.

4. **Security (security)** — HIGH impact. Security vulnerabilities can be catastrophic. Input validation, authentication, and data protection are non-negotiable.

5. **Performance (perf)** — HIGH impact. Optimizing request handling, caching, and database queries directly impacts application responsiveness.

6. **Testing (test)** — MEDIUM-HIGH impact. Well-tested applications are more reliable. Understanding NestJS testing utilities ensures comprehensive coverage.

7. **Database & ORM (db)** — MEDIUM-HIGH impact. Proper database access patterns and query optimization are crucial for data-intensive applications.

8. **API Design (api)** — MEDIUM impact. RESTful conventions, versioning, and consistent response formats improve API usability.

9. **Microservices (micro)** — MEDIUM impact. Building distributed systems requires understanding message patterns and inter-service communication.

10. **DevOps & Deployment (devops)** — LOW-MEDIUM impact. Configuration management, logging, and health checks ensure production readiness.

Each section uses a filename prefix to organize related optimization rules.
