---
title: Avoid Service Locator Anti-Pattern
impact: HIGH
impactDescription: Service locator hides dependencies and breaks testability
tags:
  - dependency-injection
  - anti-pattern
  - service-locator
  - testability
---

# Avoid Service Locator Anti-Pattern

**Impact: HIGH** - Service locator hides dependencies and makes code hard to test

## Explanation

Avoid using `ModuleRef.get()` or global containers to resolve dependencies at runtime. This hides dependencies, makes code harder to test, and breaks the benefits of dependency injection. Use constructor injection instead.

## Incorrect

```typescript
// DON'T: Use ModuleRef to get dependencies dynamically
@Injectable()
export class OrdersService {
  constructor(private moduleRef: ModuleRef) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Dependencies are hidden - not visible in constructor
    const usersService = this.moduleRef.get(UsersService);
    const inventoryService = this.moduleRef.get(InventoryService);
    const paymentService = this.moduleRef.get(PaymentService);

    const user = await usersService.findOne(dto.userId);
    // ... rest of logic
  }
}

// DON'T: Global singleton container
class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<string, any>();

  static getInstance(): ServiceContainer {
    if (!this.instance) {
      this.instance = new ServiceContainer();
    }
    return this.instance;
  }

  get<T>(key: string): T {
    return this.services.get(key);
  }
}

// Usage - completely hides dependencies
@Injectable()
export class BadService {
  doSomething(): void {
    const userService = ServiceContainer.getInstance().get<UsersService>('users');
    // Invisible dependency, untestable
  }
}
```

## Correct

```typescript
// Use constructor injection - dependencies are explicit
@Injectable()
export class OrdersService {
  constructor(
    private usersService: UsersService,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const user = await this.usersService.findOne(dto.userId);
    const inventory = await this.inventoryService.check(dto.items);
    // Dependencies are clear and testable
  }
}

// Easy to test with mocks
describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get(OrdersService);
  });
});
```

## Valid Uses of ModuleRef

```typescript
// VALID: Factory pattern for dynamic instantiation
@Injectable()
export class HandlerFactory {
  constructor(private moduleRef: ModuleRef) {}

  // Create handler based on runtime type
  getHandler(type: string): Handler {
    switch (type) {
      case 'email':
        return this.moduleRef.get(EmailHandler);
      case 'sms':
        return this.moduleRef.get(SmsHandler);
      default:
        return this.moduleRef.get(DefaultHandler);
    }
  }
}

// VALID: Resolving request-scoped providers
@Injectable()
export class RequestScopedFactory {
  constructor(private moduleRef: ModuleRef) {}

  async getRequestScopedService(): Promise<RequestService> {
    // contextId needed for request-scoped providers
    return this.moduleRef.resolve(RequestService, ContextIdFactory.create());
  }
}

// VALID: Lazy loading modules
@Injectable()
export class LazyService {
  constructor(private lazyModuleLoader: LazyModuleLoader) {}

  async loadModule(): Promise<void> {
    const { HeavyModule } = await import('./heavy.module');
    const moduleRef = await this.lazyModuleLoader.load(() => HeavyModule);
    // ModuleRef.get() is acceptable after lazy loading
    const service = moduleRef.get(HeavyService);
  }
}
```

## Alternative: Strategy Pattern

```typescript
// Instead of service locator, use strategy pattern
interface PaymentStrategy {
  process(amount: number): Promise<PaymentResult>;
}

@Injectable()
export class StripePayment implements PaymentStrategy {
  async process(amount: number): Promise<PaymentResult> {
    // Stripe implementation
  }
}

@Injectable()
export class PayPalPayment implements PaymentStrategy {
  async process(amount: number): Promise<PaymentResult> {
    // PayPal implementation
  }
}

// Inject all strategies
@Injectable()
export class PaymentService {
  private strategies: Map<string, PaymentStrategy>;

  constructor(
    stripe: StripePayment,
    paypal: PayPalPayment,
  ) {
    this.strategies = new Map([
      ['stripe', stripe],
      ['paypal', paypal],
    ]);
  }

  async processPayment(method: string, amount: number): Promise<PaymentResult> {
    const strategy = this.strategies.get(method);
    if (!strategy) {
      throw new BadRequestException(`Unknown payment method: ${method}`);
    }
    return strategy.process(amount);
  }
}
```

## Why This Matters

- **Explicit dependencies**: Constructor shows what a class needs
- **Testability**: Easy to mock dependencies in tests
- **Compile-time errors**: Missing deps caught at startup
- **Maintainability**: Clear dependency graph

## Reference

- [Service Locator Anti-Pattern](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/)
- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref)
