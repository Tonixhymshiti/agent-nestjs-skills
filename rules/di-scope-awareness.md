---
title: Understand Provider Scopes
impact: CRITICAL
impactDescription: Prevents memory leaks and incorrect data sharing
tags:
  - dependency-injection
  - scopes
  - singleton
  - request
  - memory
---

# Understand Provider Scopes

**Impact: CRITICAL** - Wrong scope causes data leaks between requests or performance issues

## Explanation

NestJS has three provider scopes: DEFAULT (singleton), REQUEST (per-request instance), and TRANSIENT (new instance for each injection). Most providers should be singletons. Request-scoped providers have performance implications as they bubble up through the dependency tree.

## Incorrect

```typescript
// DON'T: Request-scoped when not needed (performance hit)
@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  // This creates a new instance for EVERY request
  // All dependencies also become request-scoped
  async findAll() {
    return this.userRepo.find();
  }
}

// DON'T: Singleton with mutable request state
@Injectable() // Default: singleton
export class RequestContextService {
  private userId: string; // DANGER: Shared across all requests!

  setUser(userId: string) {
    this.userId = userId; // Overwrites for all concurrent requests
  }

  getUser() {
    return this.userId; // Returns wrong user!
  }
}
```

## Correct

```typescript
// Singleton for stateless services (default, most common)
@Injectable()
export class UsersService {
  constructor(private readonly userRepo: UserRepository) {}

  async findById(id: string): Promise<User> {
    return this.userRepo.findOne({ where: { id } });
  }
}

// Request-scoped ONLY when you need request context
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private userId: string;

  setUser(userId: string) {
    this.userId = userId;
  }

  getUser(): string {
    return this.userId;
  }
}

// Better: Use NestJS built-in request context
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  constructor(@Inject(REQUEST) private request: Request) {}

  log(action: string) {
    console.log(`User ${this.request.user?.id} performed ${action}`);
  }
}

// Best: Use ClsModule for async context (no scope bubble-up)
import { ClsService } from 'nestjs-cls';

@Injectable() // Stays singleton!
export class AuditService {
  constructor(private cls: ClsService) {}

  log(action: string) {
    const userId = this.cls.get('userId');
    console.log(`User ${userId} performed ${action}`);
  }
}
```

## Scope Implications

```typescript
// When a service is REQUEST-scoped, all its dependents become request-scoped too
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {}

@Injectable() // This becomes effectively request-scoped!
export class ConsumerService {
  constructor(private requestScoped: RequestScopedService) {}
}

// TRANSIENT: New instance per injection point
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  constructor() {
    this.instanceId = crypto.randomUUID();
  }

  // Each service gets its own logger instance
}
```

## Why This Matters

- **Data leaks**: Singleton state shared between requests causes security issues
- **Performance**: Request-scoped services add overhead (new instances per request)
- **Memory**: TRANSIENT without cleanup causes memory leaks
- **Debugging**: Wrong scope causes intermittent, hard-to-reproduce bugs

## Reference

- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [nestjs-cls for Async Context](https://github.com/Papooch/nestjs-cls)
