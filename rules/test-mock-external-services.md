---
title: Mock External Services in Tests
impact: MEDIUM-HIGH
impactDescription: External dependencies make tests slow, flaky, and expensive
tags:
  - testing
  - mocking
  - external-services
  - isolation
---

# Mock External Services in Tests

**Impact: MEDIUM-HIGH** - Mocking external services ensures fast, reliable tests

## Explanation

Never call real external services (APIs, databases, message queues) in unit tests. Mock them to ensure tests are fast, deterministic, and don't incur costs. Use realistic mock data and test edge cases like timeouts and errors.

## Incorrect

```typescript
// DON'T: Call real APIs in tests
describe('PaymentService', () => {
  it('should process payment', async () => {
    const service = new PaymentService(new StripeClient(realApiKey));
    // Hits real Stripe API!
    const result = await service.charge('tok_visa', 1000);
    // Slow, costs money, flaky
  });
});

// DON'T: Use real database
describe('UsersService', () => {
  beforeEach(async () => {
    await connection.query('DELETE FROM users'); // Modifies real DB
  });

  it('should create user', async () => {
    const user = await service.create({ email: 'test@test.com' });
    // Side effects on shared database
  });
});

// DON'T: Incomplete mocks
const mockHttpService = {
  get: jest.fn().mockResolvedValue({ data: {} }),
  // Missing error scenarios, missing other methods
};
```

## Correct

```typescript
// Mock HTTP service properly
describe('WeatherService', () => {
  let service: WeatherService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WeatherService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WeatherService);
    httpService = module.get(HttpService);
  });

  it('should return weather data', async () => {
    const mockResponse = {
      data: { temperature: 72, humidity: 45 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    httpService.get.mockReturnValue(of(mockResponse));

    const result = await service.getWeather('NYC');

    expect(result).toEqual({ temperature: 72, humidity: 45 });
    expect(httpService.get).toHaveBeenCalledWith(
      expect.stringContaining('NYC'),
    );
  });

  it('should handle API timeout', async () => {
    httpService.get.mockReturnValue(
      throwError(() => new Error('ETIMEDOUT')),
    );

    await expect(service.getWeather('NYC')).rejects.toThrow('Weather service unavailable');
  });

  it('should handle rate limiting', async () => {
    httpService.get.mockReturnValue(
      throwError(() => ({
        response: { status: 429, data: { message: 'Rate limited' } },
      })),
    );

    await expect(service.getWeather('NYC')).rejects.toThrow(TooManyRequestsException);
  });
});
```

## Mock Database with Repository Pattern

```typescript
// Mock repository instead of database
describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  it('should find user by id', async () => {
    const mockUser = { id: '1', name: 'John', email: 'john@test.com' };
    repo.findOne.mockResolvedValue(mockUser);

    const result = await service.findById('1');

    expect(result).toEqual(mockUser);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should throw NotFoundException for missing user', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findById('999')).rejects.toThrow(NotFoundException);
  });
});
```

## Mock Third-Party SDKs

```typescript
// Create mock factory for complex SDKs
function createMockStripe(): jest.Mocked<Stripe> {
  return {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
  } as any;
}

describe('PaymentService', () => {
  let service: PaymentService;
  let stripe: jest.Mocked<Stripe>;

  beforeEach(async () => {
    stripe = createMockStripe();

    const module = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: STRIPE_CLIENT, useValue: stripe },
      ],
    }).compile();

    service = module.get(PaymentService);
  });

  it('should create payment intent', async () => {
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_123',
      status: 'requires_payment_method',
      client_secret: 'secret_123',
    } as any);

    const result = await service.createPayment(1000, 'usd');

    expect(result.clientSecret).toBe('secret_123');
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
      amount: 1000,
      currency: 'usd',
    });
  });

  it('should handle card declined', async () => {
    stripe.paymentIntents.create.mockRejectedValue({
      type: 'StripeCardError',
      code: 'card_declined',
      message: 'Your card was declined',
    });

    await expect(service.createPayment(1000, 'usd')).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

## Mock Time and Random Values

```typescript
// Mock Date for time-dependent tests
describe('TokenService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should expire token after 1 hour', async () => {
    const token = await service.createToken();

    // Fast-forward time
    jest.advanceTimersByTime(61 * 60 * 1000);

    expect(await service.isValid(token)).toBe(false);
  });
});

// Mock random/UUID for deterministic tests
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid-123'),
}));
```

## Why This Matters

- **Speed**: Mocked tests run in milliseconds
- **Reliability**: No network flakiness or service outages
- **Cost**: No API call charges in CI/CD
- **Isolation**: Test your code, not external services

## Reference

- [Jest Mocking](https://jestjs.io/docs/mock-functions)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
