---
title: Use Testing Module for Unit Tests
impact: MEDIUM-HIGH
impactDescription: Enables proper DI mocking and isolated testing
tags:
  - testing
  - unit-tests
  - mocking
  - test-module
---

# Use Testing Module for Unit Tests

**Impact: MEDIUM-HIGH** - NestJS Testing utilities enable proper isolated testing

## Explanation

Use `@nestjs/testing` module to create isolated test environments with mocked dependencies. This ensures your tests run fast, don't depend on external services, and properly test your business logic in isolation.

## Incorrect

```typescript
// DON'T: Instantiate services manually without DI
describe('UsersService', () => {
  it('should create user', async () => {
    // Manual instantiation bypasses DI
    const repo = new UserRepository(); // Real repo!
    const service = new UsersService(repo);

    const user = await service.create({ name: 'Test' });
    // This hits the real database!
  });
});

// DON'T: Test implementation details
describe('UsersController', () => {
  it('should call service', async () => {
    const service = { create: jest.fn() };
    const controller = new UsersController(service as any);

    await controller.create({ name: 'Test' });

    expect(service.create).toHaveBeenCalled(); // Tests implementation, not behavior
  });
});
```

## Correct

```typescript
// Use Test.createTestingModule for proper DI
import { Test, TestingModule } from '@nestjs/testing';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should save and return user', async () => {
      const dto = { name: 'John', email: 'john@test.com' };
      const expectedUser = { id: '1', ...dto };

      repo.save.mockResolvedValue(expectedUser);

      const result = await service.create(dto);

      expect(result).toEqual(expectedUser);
      expect(repo.save).toHaveBeenCalledWith(dto);
    });

    it('should throw on duplicate email', async () => {
      repo.findOne.mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        service.create({ name: 'Test', email: 'test@test.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = { id: '1', name: 'John' };
      repo.findOne.mockResolvedValue(user);

      const result = await service.findById('1');

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

## Controller Testing

```typescript
describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  it('should return user on successful creation', async () => {
    const dto = { name: 'John', email: 'john@test.com' };
    const expectedUser = { id: '1', ...dto };

    service.create.mockResolvedValue(expectedUser);

    const result = await controller.create(dto);

    expect(result).toEqual(expectedUser);
  });
});
```

## Testing Guards and Interceptors

```typescript
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow when no roles required', () => {
    const context = createMockExecutionContext({ user: { roles: [] } });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow admin for admin-only route', () => {
    const context = createMockExecutionContext({ user: { roles: ['admin'] } });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny user for admin-only route', () => {
    const context = createMockExecutionContext({ user: { roles: ['user'] } });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    expect(guard.canActivate(context)).toBe(false);
  });
});

function createMockExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as ExecutionContext;
}
```

## Why This Matters

- **Isolation**: Tests don't depend on external services
- **Speed**: Mocked dependencies make tests fast
- **Reliability**: No flaky tests from network issues
- **DI parity**: Tests match production DI behavior

## Reference

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Utilities](https://docs.nestjs.com/fundamentals/testing#testing-utilities)
