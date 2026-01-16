---
title: Prefer Constructor Injection
impact: CRITICAL
impactDescription: Required for proper DI, testing, and TypeScript support
tags:
  - dependency-injection
  - providers
  - testing
  - typescript
---

# Prefer Constructor Injection

**Impact: CRITICAL** - Constructor injection is the primary pattern for NestJS DI

## Explanation

Always use constructor injection over property injection. Constructor injection makes dependencies explicit, enables TypeScript type checking, ensures dependencies are available when the class is instantiated, and improves testability.

## Incorrect

```typescript
// Property injection - avoid unless necessary
@Injectable()
export class UsersService {
  @Inject()
  private userRepo: UserRepository; // Hidden dependency

  @Inject('CONFIG')
  private config: ConfigType; // Also hidden

  async findAll() {
    return this.userRepo.find();
  }
}

// Problems:
// 1. Dependencies not visible in constructor
// 2. Service can be instantiated without dependencies in tests
// 3. TypeScript can't enforce dependency types at instantiation
```

## Correct

```typescript
// Constructor injection - explicit and testable
@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    @Inject('CONFIG') private readonly config: ConfigType,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepo.find();
  }
}

// Testing is straightforward
describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new UsersService(mockRepo, { dbUrl: 'test' });
  });

  it('should find all users', async () => {
    mockRepo.find.mockResolvedValue([{ id: '1', name: 'Test' }]);
    const result = await service.findAll();
    expect(result).toHaveLength(1);
  });
});
```

## When Property Injection is Acceptable

```typescript
// Only use property injection for optional dependencies
// or to break circular dependencies (rare)
@Injectable()
export class LoggingService {
  @Optional()
  @Inject('ANALYTICS')
  private analytics?: AnalyticsService;

  log(message: string) {
    console.log(message);
    this.analytics?.track('log', message); // Optional enhancement
  }
}
```

## Why This Matters

- **Explicit dependencies**: Constructor shows all requirements
- **Type safety**: TypeScript validates dependencies at compile time
- **Testability**: Easy to provide mocks in unit tests
- **Immutability**: `readonly` prevents accidental reassignment
- **Initialization order**: Dependencies guaranteed available

## Reference

- [NestJS Providers](https://docs.nestjs.com/providers)
- [Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
