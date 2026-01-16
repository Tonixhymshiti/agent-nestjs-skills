# NestJS Best Practices

**Version:** 1.0.0
**Organization:** NestJS Best Practices
**Published:** 2026-01

## Abstract

Comprehensive best practices and performance optimization guide for NestJS applications, designed for AI agents and LLMs. Contains 50+ rules across 10 categories covering architecture patterns, dependency injection, error handling, security, performance, testing, microservices, database access, API design, and deployment. Each rule includes impact assessment, code examples demonstrating incorrect and correct patterns, and references to official documentation.

---

## Table of Contents

### 1. Architecture (CRITICAL)

- [1.1 Avoid Circular Dependencies](#avoid-circular-dependencies)
- [1.2 Organize by Feature Modules](#organize-by-feature-modules)
- [1.3 Single Responsibility for Services](#single-responsibility-for-services)
- [1.4 Use Event-Driven Architecture for Decoupling](#use-event-driven-architecture-for-decoupling)
- [1.5 Use Repository Pattern for Data Access](#use-repository-pattern-for-data-access)

### 2. Dependency Injection (CRITICAL)

- [2.1 Avoid Service Locator Anti-Pattern](#avoid-service-locator-anti-pattern)
- [2.2 Prefer Constructor Injection](#prefer-constructor-injection)
- [2.3 Understand Provider Scopes](#understand-provider-scopes)
- [2.4 Use Injection Tokens for Interfaces](#use-injection-tokens-for-interfaces)

### 3. Error Handling (HIGH)

- [3.1 Handle Async Errors Properly](#handle-async-errors-properly)
- [3.2 Throw HTTP Exceptions from Services](#throw-http-exceptions-from-services)
- [3.3 Use Exception Filters for Error Handling](#use-exception-filters-for-error-handling)

### 4. Security (HIGH)

- [4.1 Implement Secure JWT Authentication](#implement-secure-jwt-authentication)
- [4.2 Implement Rate Limiting](#implement-rate-limiting)
- [4.3 Sanitize Output to Prevent XSS](#sanitize-output-to-prevent-xss)
- [4.4 Use Guards for Authentication and Authorization](#use-guards-for-authentication-and-authorization)
- [4.5 Validate All Input with DTOs and Pipes](#validate-all-input-with-dtos-and-pipes)

### 5. Performance (HIGH)

- [5.1 Use Async Lifecycle Hooks Correctly](#use-async-lifecycle-hooks-correctly)
- [5.2 Use Lazy Loading for Large Modules](#use-lazy-loading-for-large-modules)
- [5.3 Optimize Database Queries](#optimize-database-queries)
- [5.4 Use Caching Strategically](#use-caching-strategically)

### 6. Testing (MEDIUM-HIGH)

- [6.1 Use Supertest for E2E Testing](#use-supertest-for-e2e-testing)
- [6.2 Mock External Services in Tests](#mock-external-services-in-tests)
- [6.3 Use Testing Module for Unit Tests](#use-testing-module-for-unit-tests)

### 7. Database & ORM (MEDIUM-HIGH)

- [7.1 Avoid N+1 Query Problems](#avoid-n-1-query-problems)
- [7.2 Use Database Migrations](#use-database-migrations)
- [7.3 Use Transactions for Multi-Step Operations](#use-transactions-for-multi-step-operations)

### 8. API Design (MEDIUM)

- [8.1 Use DTOs and Serialization for API Responses](#use-dtos-and-serialization-for-api-responses)
- [8.2 Use Interceptors for Cross-Cutting Concerns](#use-interceptors-for-cross-cutting-concerns)
- [8.3 Use Pipes for Input Transformation](#use-pipes-for-input-transformation)
- [8.4 Use API Versioning for Breaking Changes](#use-api-versioning-for-breaking-changes)

### 9. Microservices (MEDIUM)

- [9.1 Implement Health Checks for Microservices](#implement-health-checks-for-microservices)
- [9.2 Use Message and Event Patterns Correctly](#use-message-and-event-patterns-correctly)
- [9.3 Use Message Queues for Background Jobs](#use-message-queues-for-background-jobs)

### 10. DevOps & Deployment (LOW-MEDIUM)

- [10.1 Implement Graceful Shutdown](#implement-graceful-shutdown)
- [10.2 Use ConfigModule for Environment Configuration](#use-configmodule-for-environment-configuration)
- [10.3 Use Structured Logging](#use-structured-logging)


---

## 1. Architecture

**Section Impact: CRITICAL**

### 1.1 Avoid Circular Dependencies

**Impact: CRITICAL** - Prevents runtime crashes and unpredictable behavior

## Explanation

Circular dependencies occur when Module A imports Module B, and Module B imports Module A (directly or transitively). NestJS can sometimes resolve these through forward references, but they indicate architectural problems and should be avoided.

## Incorrect

```typescript
// users.module.ts
@Module({
  imports: [OrdersModule], // Orders needs Users, Users needs Orders = circular
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

// orders.module.ts
@Module({
  imports: [UsersModule], // Circular dependency!
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

## Correct

```typescript
// Option 1: Extract shared logic to a third module
// shared.module.ts
@Module({
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}

// users.module.ts
@Module({
  imports: [SharedModule],
  providers: [UsersService],
})
export class UsersModule {}

// orders.module.ts
@Module({
  imports: [SharedModule],
  providers: [OrdersService],
})
export class OrdersModule {}

// Option 2: Use events for decoupled communication
// users.service.ts
@Injectable()
export class UsersService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createUser(data: CreateUserDto) {
    const user = await this.userRepo.save(data);
    this.eventEmitter.emit('user.created', user);
    return user;
  }
}

// orders.service.ts
@Injectable()
export class OrdersService {
  @OnEvent('user.created')
  handleUserCreated(user: User) {
    // React to user creation without direct dependency
  }
}
```

## Why This Matters

- **Runtime crashes**: Circular dependencies can cause `undefined` errors at runtime
- **Testing difficulty**: Circular deps make unit testing nearly impossible
- **Maintenance nightmare**: Tightly coupled modules are hard to change independently
- **Build issues**: Some bundlers fail with circular dependencies

## Reference

- [NestJS Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency)
- [Forward Reference](https://docs.nestjs.com/fundamentals/circular-dependency#forward-reference)

---

### 1.2 Organize by Feature Modules

**Impact: CRITICAL** - 3-5x faster onboarding and feature development

## Explanation

Organize your application into feature modules that encapsulate related functionality. Each feature module should be self-contained with its own controllers, services, entities, and DTOs. Avoid organizing by technical layer (all controllers together, all services together).

## Incorrect

```typescript
// Technical layer organization (anti-pattern)
src/
├── controllers/
│   ├── users.controller.ts
│   ├── orders.controller.ts
│   └── products.controller.ts
├── services/
│   ├── users.service.ts
│   ├── orders.service.ts
│   └── products.service.ts
├── entities/
│   ├── user.entity.ts
│   ├── order.entity.ts
│   └── product.entity.ts
└── app.module.ts  // Imports everything directly
```

## Correct

```typescript
// Feature module organization
src/
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.repository.ts
│   └── users.module.ts
├── orders/
│   ├── dto/
│   ├── entities/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   └── orders.module.ts
├── shared/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   └── shared.module.ts
└── app.module.ts

// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // Only export what others need
})
export class UsersModule {}

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(),
    UsersModule,
    OrdersModule,
    SharedModule,
  ],
})
export class AppModule {}
```

## Why This Matters

- **Discoverability**: All related code is in one place
- **Scalability**: Features can be developed independently
- **Testability**: Feature modules are easier to test in isolation
- **Team organization**: Different teams can own different features
- **Microservice-ready**: Feature modules can become microservices

## Reference

- [NestJS Modules](https://docs.nestjs.com/modules)
- [NestJS Fundamentals](https://docs.nestjs.com/fundamentals/dynamic-modules)

---

### 1.3 Single Responsibility for Services

**Impact: CRITICAL** - Reduces complexity and improves testability by 40%+

## Explanation

Each service should have a single, well-defined responsibility. Avoid "god services" that handle multiple unrelated concerns. If a service name includes "And" or handles more than one domain concept, it likely violates single responsibility.

## Incorrect

```typescript
// God service anti-pattern
@Injectable()
export class UserAndOrderService {
  constructor(
    private userRepo: UserRepository,
    private orderRepo: OrderRepository,
    private mailer: MailService,
    private payment: PaymentService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const user = await this.userRepo.save(dto);
    await this.mailer.sendWelcome(user);
    return user;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const order = await this.orderRepo.save({ userId, ...dto });
    await this.payment.charge(order);
    await this.mailer.sendOrderConfirmation(order);
    return order;
  }

  async calculateOrderStats(userId: string) {
    // Stats logic mixed in
  }

  async validatePayment(orderId: string) {
    // Payment logic mixed in
  }
}
```

## Correct

```typescript
// Focused services with single responsibility
@Injectable()
export class UsersService {
  constructor(private userRepo: UserRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    return this.userRepo.save(dto);
  }

  async findById(id: string): Promise<User> {
    return this.userRepo.findOneOrFail({ where: { id } });
  }
}

@Injectable()
export class OrdersService {
  constructor(private orderRepo: OrderRepository) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.orderRepo.save({ userId, ...dto });
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepo.find({ where: { userId } });
  }
}

@Injectable()
export class OrderStatsService {
  constructor(private orderRepo: OrderRepository) {}

  async calculateForUser(userId: string): Promise<OrderStats> {
    // Focused stats calculation
  }
}

// Orchestration in controller or dedicated orchestrator
@Controller('orders')
export class OrdersController {
  constructor(
    private orders: OrdersService,
    private payment: PaymentService,
    private notifications: NotificationService,
  ) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    const order = await this.orders.create(user.id, dto);
    await this.payment.charge(order);
    await this.notifications.sendOrderConfirmation(order);
    return order;
  }
}
```

## Why This Matters

- **Testability**: Small services are easier to unit test
- **Reusability**: Focused services can be reused across features
- **Maintainability**: Changes to one concern don't affect others
- **Team velocity**: Multiple developers can work on different services

## Reference

- [SOLID Principles](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [NestJS Providers](https://docs.nestjs.com/providers)

---

### 1.4 Use Event-Driven Architecture for Decoupling

**Impact: MEDIUM-HIGH** - Events reduce coupling between modules and improve scalability

## Explanation

Use `@nestjs/event-emitter` for intra-service events and message brokers for inter-service communication. Events allow modules to react to changes without direct dependencies, improving modularity and enabling async processing.

## Incorrect

```typescript
// DON'T: Direct service coupling
@Injectable()
export class OrdersService {
  constructor(
    private inventoryService: InventoryService,
    private emailService: EmailService,
    private analyticsService: AnalyticsService,
    private notificationService: NotificationService,
    private loyaltyService: LoyaltyService,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.repo.save(dto);

    // Tight coupling - OrdersService knows about all consumers
    await this.inventoryService.reserve(order.items);
    await this.emailService.sendConfirmation(order);
    await this.analyticsService.track('order_created', order);
    await this.notificationService.push(order.userId, 'Order placed');
    await this.loyaltyService.addPoints(order.userId, order.total);

    // Adding new behavior requires modifying this service
    return order;
  }
}
```

## Correct

```typescript
// Use EventEmitter for decoupling
import { EventEmitter2 } from '@nestjs/event-emitter';

// Define event
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly items: OrderItem[],
    public readonly total: number,
  ) {}
}

// Service emits events
@Injectable()
export class OrdersService {
  constructor(
    private eventEmitter: EventEmitter2,
    private repo: Repository<Order>,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.repo.save(dto);

    // Emit event - no knowledge of consumers
    this.eventEmitter.emit(
      'order.created',
      new OrderCreatedEvent(order.id, order.userId, order.items, order.total),
    );

    return order;
  }
}

// Listeners in separate modules
@Injectable()
export class InventoryListener {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.inventoryService.reserve(event.items);
  }
}

@Injectable()
export class EmailListener {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.emailService.sendConfirmation(event.orderId);
  }
}

@Injectable()
export class AnalyticsListener {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.analyticsService.track('order_created', {
      orderId: event.orderId,
      total: event.total,
    });
  }
}
```

## Configure Event Emitter

```typescript
// app.module.ts
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
})
export class AppModule {}
```

## Async Event Handling

```typescript
// Handle events asynchronously
@Injectable()
export class HeavyProcessingListener {
  @OnEvent('order.created', { async: true })
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // This runs asynchronously, doesn't block the order creation
    await this.heavyProcessing(event);
  }
}

// Use promisify option for waiting on all handlers
@Injectable()
export class OrdersService {
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.repo.save(dto);

    // Wait for critical handlers
    await this.eventEmitter.emitAsync(
      'order.created',
      new OrderCreatedEvent(order.id, order.userId, order.items, order.total),
    );

    return order;
  }
}
```

## Event Patterns

```typescript
// Wildcard listeners
@OnEvent('order.*')
handleAllOrderEvents(event: any): void {
  this.logger.log('Order event received', event);
}

// Multiple events
@OnEvent(['order.created', 'order.updated'])
handleOrderChanges(event: OrderEvent): void {
  await this.searchIndex.update(event);
}

// Prioritized handlers
@OnEvent('order.created', { prependListener: true })
handleFirst(event: OrderCreatedEvent): void {
  // Runs before other handlers
}
```

## Saga Pattern for Complex Flows

```typescript
// Orchestrate multi-step processes with events
@Injectable()
export class OrderSaga {
  @OnEvent('order.created')
  async startOrderSaga(event: OrderCreatedEvent): Promise<void> {
    try {
      // Step 1: Reserve inventory
      await this.inventoryService.reserve(event.items);
      this.eventEmitter.emit('order.inventory_reserved', event);
    } catch (error) {
      this.eventEmitter.emit('order.failed', { ...event, reason: 'inventory' });
    }
  }

  @OnEvent('order.inventory_reserved')
  async processPayment(event: OrderCreatedEvent): Promise<void> {
    try {
      // Step 2: Process payment
      await this.paymentService.charge(event.userId, event.total);
      this.eventEmitter.emit('order.payment_completed', event);
    } catch (error) {
      // Compensating action
      await this.inventoryService.release(event.items);
      this.eventEmitter.emit('order.failed', { ...event, reason: 'payment' });
    }
  }

  @OnEvent('order.payment_completed')
  async completeOrder(event: OrderCreatedEvent): Promise<void> {
    await this.ordersService.markComplete(event.orderId);
    this.eventEmitter.emit('order.completed', event);
  }

  @OnEvent('order.failed')
  async handleFailure(event: OrderFailedEvent): Promise<void> {
    await this.ordersService.markFailed(event.orderId, event.reason);
    await this.notificationService.notifyFailure(event.userId);
  }
}
```

## Why This Matters

- **Decoupling**: Modules don't need to know about each other
- **Extensibility**: Add new behavior without changing existing code
- **Scalability**: Async handlers don't block main flow
- **Testability**: Test components independently

## Reference

- [NestJS Events](https://docs.nestjs.com/techniques/events)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

---

### 1.5 Use Repository Pattern for Data Access

**Impact: HIGH** - Abstracts database logic and improves testability

## Explanation

Create custom repositories to encapsulate complex queries and database logic. This keeps services focused on business logic, makes testing easier with mock repositories, and allows changing database implementations without affecting business code.

## Incorrect

```typescript
// DON'T: Complex queries in services
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
  ) {}

  async findActiveWithOrders(minOrders: number): Promise<User[]> {
    // Complex query logic mixed with business logic
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.orders', 'order')
      .where('user.isActive = :active', { active: true })
      .andWhere('user.deletedAt IS NULL')
      .groupBy('user.id')
      .having('COUNT(order.id) >= :min', { min: minOrders })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async findByEmailDomain(domain: string): Promise<User[]> {
    // Another complex query
    return this.repo
      .createQueryBuilder('user')
      .where('user.email LIKE :domain', { domain: `%@${domain}` })
      .andWhere('user.verified = :verified', { verified: true })
      .getMany();
  }

  // Service becomes bloated with query logic
}

// DON'T: Duplicate queries across services
@Injectable()
export class ReportsService {
  async generateUserReport(): Promise<Report> {
    // Same query logic duplicated here
    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .getMany();
  }
}
```

## Correct

```typescript
// Custom repository with encapsulated queries
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findActive(): Promise<User[]> {
    return this.repo.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveWithMinOrders(minOrders: number): Promise<User[]> {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.orders', 'order')
      .where('user.isActive = :active', { active: true })
      .andWhere('user.deletedAt IS NULL')
      .groupBy('user.id')
      .having('COUNT(order.id) >= :min', { min: minOrders })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async findByEmailDomain(domain: string): Promise<User[]> {
    return this.repo
      .createQueryBuilder('user')
      .where('user.email LIKE :domain', { domain: `%@${domain}` })
      .andWhere('user.verified = :verified', { verified: true })
      .getMany();
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { deletedAt: new Date() });
  }
}

// Clean service with business logic only
@Injectable()
export class UsersService {
  constructor(private usersRepo: UsersRepository) {}

  async getActiveUsersWithOrders(): Promise<User[]> {
    return this.usersRepo.findActiveWithMinOrders(1);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = new User();
    user.email = dto.email;
    user.name = dto.name;
    // Business logic only, no query details

    return this.usersRepo.save(user);
  }
}

// Register repository as provider
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersRepository, UsersService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
```

## Repository Interface for Testing

```typescript
// Define interface for dependency injection
export interface IUsersRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findActive(): Promise<User[]>;
  save(user: User): Promise<User>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

// Implementation
@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}
  // ... implementations
}

// Service uses interface
@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private usersRepo: IUsersRepository,
  ) {}
}

// Easy to mock in tests
describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: jest.Mocked<IUsersRepository>;

  beforeEach(async () => {
    mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findActive: jest.fn(),
      save: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USERS_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('should throw on duplicate email', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com' } as User);

    await expect(
      service.create({ email: 'test@test.com', name: 'Test' }),
    ).rejects.toThrow(ConflictException);
  });
});
```

## Why This Matters

- **Testability**: Mock repositories without database setup
- **Maintainability**: Query changes don't affect business logic
- **Reusability**: Share query logic across services
- **Clarity**: Services focus on business rules, repos on data access

## Reference

- [TypeORM Custom Repositories](https://typeorm.io/custom-repository)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

---

## 2. Dependency Injection

**Section Impact: CRITICAL**

### 2.1 Avoid Service Locator Anti-Pattern

**Impact: HIGH** - Service locator hides dependencies and breaks testability

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

---

### 2.2 Prefer Constructor Injection

**Impact: CRITICAL** - Required for proper DI, testing, and TypeScript support

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

---

### 2.3 Understand Provider Scopes

**Impact: CRITICAL** - Prevents memory leaks and incorrect data sharing

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

---

### 2.4 Use Injection Tokens for Interfaces

**Impact: HIGH** - Enables proper abstraction and testability

## Explanation

TypeScript interfaces are erased at compile time and can't be used as injection tokens. Use string tokens, symbols, or abstract classes when you want to inject implementations of interfaces. This enables swapping implementations for testing or different environments.

## Incorrect

```typescript
// DON'T: Interface can't be used as injection token
interface PaymentGateway {
  charge(amount: number): Promise<PaymentResult>;
}

@Injectable()
export class StripeService implements PaymentGateway {
  charge(amount: number) { /* ... */ }
}

@Injectable()
export class OrdersService {
  // This WON'T work - PaymentGateway doesn't exist at runtime
  constructor(private payment: PaymentGateway) {}
}
```

## Correct

```typescript
// Option 1: String/Symbol tokens (most flexible)
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PaymentGateway {
  charge(amount: number): Promise<PaymentResult>;
}

@Injectable()
export class StripeService implements PaymentGateway {
  async charge(amount: number): Promise<PaymentResult> {
    // Stripe implementation
  }
}

@Injectable()
export class MockPaymentService implements PaymentGateway {
  async charge(amount: number): Promise<PaymentResult> {
    return { success: true, id: 'mock-id' };
  }
}

// Module registration
@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useClass: process.env.NODE_ENV === 'test'
        ? MockPaymentService
        : StripeService,
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentModule {}

// Injection
@Injectable()
export class OrdersService {
  constructor(
    @Inject(PAYMENT_GATEWAY) private payment: PaymentGateway,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    await this.payment.charge(dto.amount);
  }
}

// Option 2: Abstract class (carries runtime type info)
export abstract class PaymentGateway {
  abstract charge(amount: number): Promise<PaymentResult>;
}

@Injectable()
export class StripeService extends PaymentGateway {
  async charge(amount: number): Promise<PaymentResult> {
    // Implementation
  }
}

@Module({
  providers: [
    {
      provide: PaymentGateway,
      useClass: StripeService,
    },
  ],
})
export class PaymentModule {}

// No @Inject needed with abstract class
@Injectable()
export class OrdersService {
  constructor(private payment: PaymentGateway) {}
}
```

## Testing Benefits

```typescript
describe('OrdersService', () => {
  let service: OrdersService;
  let mockPayment: jest.Mocked<PaymentGateway>;

  beforeEach(async () => {
    mockPayment = {
      charge: jest.fn().mockResolvedValue({ success: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PAYMENT_GATEWAY,
          useValue: mockPayment,
        },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  it('should charge payment', async () => {
    await service.createOrder({ amount: 100 });
    expect(mockPayment.charge).toHaveBeenCalledWith(100);
  });
});
```

## Why This Matters

- **Abstraction**: Code depends on interface, not implementation
- **Testability**: Easy to swap real services for mocks
- **Flexibility**: Change implementations without changing consumers
- **Runtime safety**: Tokens ensure DI works correctly

## Reference

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [Injection Tokens](https://docs.nestjs.com/fundamentals/custom-providers#non-class-based-provider-tokens)

---

## 3. Error Handling

**Section Impact: HIGH**

### 3.1 Handle Async Errors Properly

**Impact: HIGH** - Unhandled async errors crash the application

## Explanation

NestJS automatically catches errors from async route handlers, but errors from background tasks, event handlers, and manually created promises can crash your application. Always handle async errors explicitly and use global handlers as a safety net.

## Incorrect

```typescript
// DON'T: Fire-and-forget without error handling
@Injectable()
export class UsersService {
  async createUser(dto: CreateUserDto): Promise<User> {
    const user = await this.repo.save(dto);

    // Fire and forget - if this fails, error is unhandled!
    this.emailService.sendWelcome(user.email);

    return user;
  }
}

// DON'T: Unhandled promise in event handler
@Injectable()
export class OrdersService {
  @OnEvent('order.created')
  handleOrderCreated(event: OrderCreatedEvent) {
    // This returns a promise but it's not awaited!
    this.processOrder(event);
    // Errors will crash the process
  }

  private async processOrder(event: OrderCreatedEvent): Promise<void> {
    await this.inventoryService.reserve(event.items);
    await this.notificationService.send(event.userId);
  }
}

// DON'T: Missing try-catch in scheduled tasks
@Cron('0 0 * * *')
async dailyCleanup(): Promise<void> {
  await this.cleanupService.run();
  // If this throws, no error handling
}
```

## Correct

```typescript
// Handle fire-and-forget with explicit catch
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async createUser(dto: CreateUserDto): Promise<User> {
    const user = await this.repo.save(dto);

    // Explicitly catch and log errors
    this.emailService.sendWelcome(user.email).catch((error) => {
      this.logger.error('Failed to send welcome email', error.stack);
      // Optionally queue for retry
    });

    return user;
  }
}

// Properly handle async event handlers
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      await this.processOrder(event);
    } catch (error) {
      this.logger.error('Failed to process order', { event, error });
      // Don't rethrow - would crash the process
      await this.deadLetterQueue.add('order.created', event);
    }
  }
}

// Safe scheduled tasks
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  @Cron('0 0 * * *')
  async dailyCleanup(): Promise<void> {
    try {
      await this.cleanupService.run();
      this.logger.log('Daily cleanup completed');
    } catch (error) {
      this.logger.error('Daily cleanup failed', error.stack);
      // Alert or retry logic
    }
  }
}
```

## Global Unhandled Rejection Handler

```typescript
// main.ts - Safety net for uncaught errors
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, you might want to:
    // - Send to error tracking service
    // - Gracefully shutdown
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Graceful shutdown recommended after uncaught exception
    process.exit(1);
  });

  await app.listen(3000);
}
```

## RxJS Observable Error Handling

```typescript
// Handle errors in Observable streams
@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);

  processStream(data$: Observable<Data>): Observable<Result> {
    return data$.pipe(
      mergeMap((data) => this.process(data)),
      catchError((error) => {
        this.logger.error('Stream processing error', error);
        // Return empty to continue stream, or rethrow
        return EMPTY;
      }),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          this.logger.warn(`Retry attempt ${retryCount}`);
          return timer(1000 * retryCount);
        },
      }),
    );
  }
}

// Microservice message handling
@MessagePattern({ cmd: 'process' })
async processMessage(data: ProcessDto): Promise<Result> {
  try {
    return await this.service.process(data);
  } catch (error) {
    // Transform to RpcException for proper client handling
    throw new RpcException({
      code: 'PROCESSING_ERROR',
      message: error.message,
    });
  }
}
```

## Async Context Preservation

```typescript
// Preserve context in async operations
@Injectable()
export class TrackedService {
  constructor(private cls: ClsService) {}

  async processWithTracking(data: Data): Promise<void> {
    const requestId = this.cls.get('requestId');

    // Background task with context
    setImmediate(async () => {
      try {
        await this.backgroundProcess(data);
      } catch (error) {
        // Log with original request context
        this.logger.error('Background task failed', {
          requestId,
          error: error.message,
        });
      }
    });
  }
}
```

## Why This Matters

- **Stability**: Unhandled rejections crash Node.js (Node 15+)
- **Debugging**: Proper error handling preserves stack traces
- **Reliability**: Prevents silent failures in background tasks
- **Monitoring**: Enables proper error tracking and alerting

## Reference

- [Node.js Unhandled Rejections](https://nodejs.org/api/process.html#event-unhandledrejection)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)

---

### 3.2 Throw HTTP Exceptions from Services

**Impact: HIGH** - Clean separation between business logic and HTTP concerns

## Explanation

It's acceptable (and often preferable) to throw `HttpException` subclasses from services in HTTP applications. This keeps controllers thin and allows services to communicate appropriate error states. For truly layer-agnostic services, use domain exceptions that map to HTTP status codes.

## Incorrect

```typescript
// DON'T: Return error objects instead of throwing
@Injectable()
export class UsersService {
  async findById(id: string): Promise<{ user?: User; error?: string }> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      return { error: 'User not found' }; // Controller must check this
    }
    return { user };
  }
}

@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.usersService.findById(id);
    if (result.error) {
      throw new NotFoundException(result.error);
    }
    return result.user;
  }
}
```

## Correct

```typescript
// DO: Throw exceptions directly from service
@Injectable()
export class UsersService {
  constructor(private readonly repo: UserRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    return this.repo.save(dto);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id); // Throws if not found
    Object.assign(user, dto);
    return this.repo.save(user);
  }
}

// Controller stays thin
@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }
}

// For layer-agnostic services, use domain exceptions
export class EntityNotFoundException extends Error {
  constructor(
    public readonly entity: string,
    public readonly id: string,
  ) {
    super(`${entity} with ID "${id}" not found`);
  }
}

// Map to HTTP in exception filter
@Catch(EntityNotFoundException)
export class EntityNotFoundFilter implements ExceptionFilter {
  catch(exception: EntityNotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(404).json({
      statusCode: 404,
      message: exception.message,
      entity: exception.entity,
      id: exception.id,
    });
  }
}
```

## Built-in HTTP Exceptions

```typescript
// Use the appropriate built-in exception
throw new BadRequestException('Invalid input');      // 400
throw new UnauthorizedException('Not authenticated'); // 401
throw new ForbiddenException('Access denied');       // 403
throw new NotFoundException('Resource not found');   // 404
throw new ConflictException('Resource exists');      // 409
throw new UnprocessableEntityException('Invalid');   // 422
throw new InternalServerErrorException('Error');     // 500

// With detailed error object
throw new BadRequestException({
  message: 'Validation failed',
  errors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'age', message: 'Must be positive' },
  ],
});
```

## Why This Matters

- **Thin controllers**: Controllers only route requests
- **Cleaner code**: No error checking boilerplate
- **Predictable flow**: Exceptions bubble up automatically
- **Testability**: Services can be tested for exception throwing

## Reference

- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [Built-in HTTP Exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)

---

### 3.3 Use Exception Filters for Error Handling

**Impact: HIGH** - Consistent error responses and centralized error logic

## Explanation

Never catch exceptions and manually format error responses in controllers. Use NestJS exception filters to handle errors consistently across your application. Create custom exception filters for specific error types and a global filter for unhandled exceptions.

## Incorrect

```typescript
// DON'T: Manual error handling in controllers
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const user = await this.usersService.findById(id);
      if (!user) {
        return res.status(404).json({
          statusCode: 404,
          message: 'User not found',
        });
      }
      return res.json(user);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }
}
```

## Correct

```typescript
// DO: Use built-in and custom exceptions
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }
}

// Custom domain exception
export class UserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: `User with ID "${userId}" not found`,
      code: 'USER_NOT_FOUND',
    });
  }
}

// Custom exception filter for domain errors
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus?.() || 400;

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

// Global exception filter for unhandled errors
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

// Register globally in main.ts
app.useGlobalFilters(
  new AllExceptionsFilter(app.get(Logger)),
  new DomainExceptionFilter(),
);

// Or via module
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
```

## Why This Matters

- **Consistency**: All errors follow the same response format
- **Separation of concerns**: Controllers focus on business logic
- **Logging**: Centralized error logging and monitoring
- **Security**: Prevents leaking stack traces to clients
- **Testability**: Exception behavior is predictable and testable

## Reference

- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [Built-in HTTP Exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)

---

## 4. Security

**Section Impact: HIGH**

### 4.1 Implement Secure JWT Authentication

**Impact: CRITICAL** - Insecure auth implementation leads to unauthorized access

## Explanation

Use `@nestjs/jwt` with `@nestjs/passport` for authentication. Store secrets securely, use appropriate token lifetimes, implement refresh tokens, and validate tokens properly. Never expose sensitive data in JWT payloads.

## Incorrect

```typescript
// DON'T: Hardcode secrets
@Module({
  imports: [
    JwtModule.register({
      secret: 'my-secret-key', // Exposed in code
      signOptions: { expiresIn: '7d' }, // Too long
    }),
  ],
})
export class AuthModule {}

// DON'T: Store sensitive data in JWT
async login(user: User): Promise<{ accessToken: string }> {
  const payload = {
    sub: user.id,
    email: user.email,
    password: user.password, // NEVER include password!
    ssn: user.ssn, // NEVER include sensitive data!
    isAdmin: user.isAdmin, // Can be tampered if not verified
  };
  return { accessToken: this.jwtService.sign(payload) };
}

// DON'T: Skip token validation
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'my-secret',
      // ignoreExpiration: true, // NEVER ignore expiration!
    });
  }

  async validate(payload: any): Promise<any> {
    return payload; // No validation of user existence
  }
}
```

## Correct

```typescript
// Secure JWT configuration
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // Short-lived access tokens
          issuer: config.get<string>('JWT_ISSUER'),
          audience: config.get<string>('JWT_AUDIENCE'),
        },
      }),
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
})
export class AuthModule {}

// Minimal JWT payload
@Injectable()
export class AuthService {
  async login(user: User): Promise<TokenResponse> {
    // Only include necessary, non-sensitive data
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    await this.refreshTokenRepo.save({
      userId,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return token;
  }
}

// Proper JWT strategy with validation
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
      ignoreExpiration: false,
      issuer: config.get<string>('JWT_ISSUER'),
      audience: config.get<string>('JWT_AUDIENCE'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Verify user still exists and is active
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify token wasn't issued before password change
    if (user.passwordChangedAt) {
      const tokenIssuedAt = new Date(payload.iat * 1000);
      if (tokenIssuedAt < user.passwordChangedAt) {
        throw new UnauthorizedException('Token invalidated by password change');
      }
    }

    return user;
  }
}
```

## Refresh Token Flow

```typescript
@Controller('auth')
export class AuthController {
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponse> {
    // Find stored refresh token
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { userId: dto.userId },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify token matches
    const isValid = await bcrypt.compare(dto.refreshToken, storedToken.token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens (rotate refresh token)
    const user = await this.usersService.findById(dto.userId);
    await this.refreshTokenRepo.delete({ userId: dto.userId });

    return this.authService.login(user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User): Promise<void> {
    // Invalidate refresh token
    await this.refreshTokenRepo.delete({ userId: user.id });
  }
}
```

## Token Blacklisting

```typescript
// For immediate token invalidation
@Injectable()
export class TokenBlacklistService {
  constructor(@InjectRedis() private redis: Redis) {}

  async blacklist(token: string, expiresIn: number): Promise<void> {
    const decoded = this.jwtService.decode(token) as JwtPayload;
    const key = `blacklist:${decoded.jti || token}`;

    await this.redis.setex(key, expiresIn, '1');
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const decoded = this.jwtService.decode(token) as JwtPayload;
    const key = `blacklist:${decoded.jti || token}`;

    return (await this.redis.exists(key)) === 1;
  }
}

// Check blacklist in strategy
async validate(payload: JwtPayload, done: Function): Promise<void> {
  const token = this.request.headers.authorization?.split(' ')[1];

  if (await this.blacklistService.isBlacklisted(token)) {
    throw new UnauthorizedException('Token has been revoked');
  }

  const user = await this.usersService.findById(payload.sub);
  done(null, user);
}
```

## Why This Matters

- **Unauthorized access**: Weak auth exposes all protected resources
- **Token theft**: Long-lived tokens increase risk window
- **Data exposure**: Sensitive data in JWT is visible to anyone
- **Compliance**: OWASP requires proper authentication

## Reference

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

### 4.2 Implement Rate Limiting

**Impact: HIGH** - Prevents abuse, DoS attacks, and resource exhaustion

## Explanation

Use `@nestjs/throttler` to limit request rates per client. Apply different limits for different endpoints - stricter for auth endpoints, more relaxed for read operations. Consider using Redis for distributed rate limiting in clustered deployments.

## Incorrect

```typescript
// DON'T: No rate limiting on sensitive endpoints
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<TokenResponse> {
    // Attackers can brute-force credentials
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    // Can be abused to spam users with emails
    return this.authService.sendResetEmail(dto.email);
  }
}

// DON'T: Same limits for all endpoints
@UseGuards(ThrottlerGuard)
@Controller('api')
export class ApiController {
  @Get('public-data')
  async getPublic() {} // Should allow more requests

  @Post('process-payment')
  async payment() {} // Should be more restrictive
}
```

## Correct

```typescript
// Configure throttler globally with multiple limits
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

// Override limits per endpoint
@Controller('auth')
export class AuthController {
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @Throttle({ short: { limit: 3, ttl: 3600000 } }) // 3 per hour
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.sendResetEmail(dto.email);
  }
}

// Skip throttling for certain routes
@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle()
  check(): string {
    return 'OK';
  }
}

// Custom throttle per user type
@Controller('api')
export class ApiController {
  @Get('data')
  @SkipThrottle({ short: true }) // Skip short limit, keep others
  async getData() {
    return this.service.getData();
  }
}
```

## Redis-Based Distributed Rate Limiting

```typescript
// Use Redis for clustered deployments
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          { name: 'short', ttl: 1000, limit: 3 },
          { name: 'long', ttl: 60000, limit: 100 },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get('REDIS_HOST'),
            port: config.get('REDIS_PORT'),
          }),
        ),
      }),
    }),
  ],
})
export class AppModule {}
```

## Custom Rate Limit by User

```typescript
// Different limits for authenticated vs anonymous
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // Use user ID if authenticated, IP otherwise
    return req.user?.id || req.ip;
  }

  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();

    // Higher limits for authenticated users
    if (request.user) {
      return request.user.isPremium ? 1000 : 200;
    }

    return 50; // Anonymous users
  }
}

// Rate limit by API key
@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  constructor(
    private apiKeyService: ApiKeyService,
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Request): Promise<string> {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || req.ip;
  }

  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (apiKey) {
      const keyConfig = await this.apiKeyService.getConfig(apiKey);
      return keyConfig?.rateLimit || 100;
    }

    return 10; // No API key
  }
}
```

## Why This Matters

- **DoS prevention**: Stops resource exhaustion attacks
- **Brute force protection**: Limits credential guessing
- **Fair usage**: Ensures resources for all users
- **Cost control**: Prevents unexpected infrastructure costs

## Reference

- [NestJS Throttler](https://docs.nestjs.com/security/rate-limiting)
- [@nestjs/throttler](https://github.com/nestjs/throttler)

---

### 4.3 Sanitize Output to Prevent XSS

**Impact: HIGH** - Prevents cross-site scripting attacks in rendered content

## Explanation

While NestJS APIs typically return JSON (which browsers don't execute), XSS risks exist when rendering HTML, storing user content, or when frontend frameworks improperly handle API responses. Sanitize user-generated content before storage and use proper Content-Type headers.

## Incorrect

```typescript
// DON'T: Store raw HTML from users
@Injectable()
export class CommentsService {
  async create(dto: CreateCommentDto): Promise<Comment> {
    // User can inject: <script>steal(document.cookie)</script>
    return this.repo.save({
      content: dto.content, // Raw, unsanitized
      authorId: dto.authorId,
    });
  }
}

// DON'T: Return HTML without sanitization
@Controller('pages')
export class PagesController {
  @Get(':slug')
  @Header('Content-Type', 'text/html')
  async getPage(@Param('slug') slug: string): Promise<string> {
    const page = await this.pagesService.findBySlug(slug);
    // If page.content contains user input, XSS is possible
    return `<html><body>${page.content}</body></html>`;
  }
}

// DON'T: Reflect user input in errors
@Get(':id')
async findOne(@Param('id') id: string): Promise<User> {
  const user = await this.repo.findOne({ where: { id } });
  if (!user) {
    // XSS if id contains malicious content and error is rendered
    throw new NotFoundException(`User ${id} not found`);
  }
  return user;
}
```

## Correct

```typescript
// Sanitize HTML content before storage
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class CommentsService {
  private readonly sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    allowedAttributes: {
      a: ['href', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  };

  async create(dto: CreateCommentDto): Promise<Comment> {
    return this.repo.save({
      content: sanitizeHtml(dto.content, this.sanitizeOptions),
      authorId: dto.authorId,
    });
  }
}

// Use validation pipe to strip HTML
import { Transform } from 'class-transformer';

export class CreatePostDto {
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [] }))
  title: string;

  @IsString()
  @Transform(({ value }) =>
    sanitizeHtml(value, {
      allowedTags: ['p', 'br', 'b', 'i', 'a'],
      allowedAttributes: { a: ['href'] },
    }),
  )
  content: string;
}

// Set proper Content-Type headers
@Controller('api')
export class ApiController {
  @Get('data')
  @Header('Content-Type', 'application/json')
  async getData(): Promise<DataResponse> {
    // JSON response - browser won't execute scripts
    return this.service.getData();
  }
}

// Sanitize error messages
@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
  const user = await this.repo.findOne({ where: { id } });
  if (!user) {
    // UUID validation ensures safe format
    throw new NotFoundException('User not found');
  }
  return user;
}
```

## Content Security Policy

```typescript
// Use Helmet for CSP headers
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
    }),
  );

  await app.listen(3000);
}

// Add X-Content-Type-Options
app.use(helmet.noSniff());

// Prevent clickjacking
app.use(helmet.frameguard({ action: 'deny' }));
```

## Markdown Sanitization

```typescript
// Safe markdown rendering
import * as marked from 'marked';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class MarkdownService {
  render(markdown: string): string {
    // First render markdown
    const html = marked.parse(markdown);

    // Then sanitize the output
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
      ALLOWED_ATTR: ['href', 'title', 'class'],
    });
  }
}
```

## Why This Matters

- **Session hijacking**: XSS can steal auth tokens
- **Data theft**: Attackers can read sensitive page content
- **Defacement**: Malicious content injected into pages
- **Malware distribution**: Redirect users to malicious sites

## Reference

- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [sanitize-html](https://www.npmjs.com/package/sanitize-html)

---

### 4.4 Use Guards for Authentication and Authorization

**Impact: HIGH** - Centralized access control prevents security gaps

## Explanation

Guards determine whether a request should be handled based on authentication state, roles, permissions, or other conditions. They run after middleware but before pipes and interceptors, making them ideal for access control. Use guards instead of manual checks in controllers.

## Incorrect

```typescript
// DON'T: Manual auth checks in every handler
@Controller('admin')
export class AdminController {
  @Get('users')
  async getUsers(@Request() req) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    if (!req.user.roles.includes('admin')) {
      throw new ForbiddenException();
    }
    return this.adminService.getUsers();
  }

  @Delete('users/:id')
  async deleteUser(@Request() req, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    if (!req.user.roles.includes('admin')) {
      throw new ForbiddenException();
    }
    return this.adminService.deleteUser(id);
  }
}
```

## Correct

```typescript
// JWT Auth Guard
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      request.user = await this.jwtService.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// Roles Guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Decorators
export const Public = () => SetMetadata('isPublic', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// Register guards globally
@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

// Clean controller
@Controller('admin')
@Roles(Role.Admin) // Applied to all routes
export class AdminController {
  @Get('users')
  getUsers(): Promise<User[]> {
    return this.adminService.getUsers();
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string): Promise<void> {
    return this.adminService.deleteUser(id);
  }

  @Public() // Override: no auth required
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

## Policy-Based Authorization (CASL)

```typescript
// For complex permissions, use CASL
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policies = this.reflector.get<PolicyHandler[]>(
      'check_policies',
      context.getHandler(),
    );
    if (!policies) return true;

    const { user } = context.switchToHttp().getRequest();
    const ability = this.caslAbilityFactory.createForUser(user);

    return policies.every((policy) => policy(ability));
  }
}

// Usage
@Get(':id')
@CheckPolicies((ability) => ability.can(Action.Read, Article))
async findOne(@Param('id') id: string) {
  return this.articlesService.findOne(id);
}
```

## Why This Matters

- **DRY**: Auth logic defined once, applied everywhere
- **Security**: Guarantees checks run before business logic
- **Composability**: Combine multiple guards for complex rules
- **Clarity**: Controllers focus on business logic

## Reference

- [NestJS Guards](https://docs.nestjs.com/guards)
- [CASL Integration](https://docs.nestjs.com/security/authorization#integrating-casl)

---

### 4.5 Validate All Input with DTOs and Pipes

**Impact: HIGH** - Prevents injection attacks and data corruption

## Explanation

Always validate incoming data using class-validator decorators on DTOs and the global ValidationPipe. Never trust user input. Validate all request bodies, query parameters, and route parameters before processing.

## Incorrect

```typescript
// DON'T: Trust raw input without validation
@Controller('users')
export class UsersController {
  @Post()
  create(@Body() body: any) {
    // body could contain anything - SQL injection, XSS, etc.
    return this.usersService.create(body);
  }

  @Get()
  findAll(@Query() query: any) {
    // query.limit could be "'; DROP TABLE users; --"
    return this.usersService.findAll(query.limit);
  }
}

// DON'T: DTOs without validation decorators
export class CreateUserDto {
  name: string;    // No validation
  email: string;   // Could be "not-an-email"
  age: number;     // Could be "abc" or -999
}
```

## Correct

```typescript
// Enable ValidationPipe globally in main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip unknown properties
      forbidNonWhitelisted: true,   // Throw on unknown properties
      transform: true,              // Auto-transform to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(3000);
}

// Create well-validated DTOs
import {
  IsString,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsInt()
  @Min(0)
  @Max(150)
  age: number;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;
}

// Query DTO with defaults and transformation
export class FindUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

// Param validation
export class UserIdParamDto {
  @IsUUID('4')
  id: string;
}

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto): Promise<User> {
    // dto is guaranteed to be valid
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindUsersQueryDto): Promise<User[]> {
    // query.limit is a number, query.search is sanitized
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: UserIdParamDto): Promise<User> {
    // params.id is a valid UUID
    return this.usersService.findById(params.id);
  }
}
```

## Custom Validators

```typescript
// Custom decorator for complex validation
import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          const hasUppercase = /[A-Z]/.test(value);
          const hasLowercase = /[a-z]/.test(value);
          const hasNumber = /\d/.test(value);
          const hasSpecial = /[!@#$%^&*]/.test(value);
          return hasUppercase && hasLowercase && hasNumber && hasSpecial;
        },
        defaultMessage() {
          return 'Password must contain uppercase, lowercase, number, and special character';
        },
      },
    });
  };
}
```

## Why This Matters

- **Security**: Prevents SQL injection, XSS, and other injection attacks
- **Data integrity**: Ensures data meets business requirements
- **Type safety**: Transforms strings to proper types
- **Clear contracts**: DTOs document expected input format

## Reference

- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)

---

## 5. Performance

**Section Impact: HIGH**

### 5.1 Use Async Lifecycle Hooks Correctly

**Impact: HIGH** - Prevents blocking and ensures proper initialization order

## Explanation

NestJS lifecycle hooks (`onModuleInit`, `onApplicationBootstrap`, etc.) support async operations. However, misusing them can block application startup or cause race conditions. Understand the lifecycle order and use hooks appropriately.

## Incorrect

```typescript
// DON'T: Fire-and-forget async without await
@Injectable()
export class DatabaseService implements OnModuleInit {
  onModuleInit() {
    // This runs but doesn't block - app starts before DB is ready!
    this.connect();
  }

  private async connect() {
    await this.pool.connect();
    console.log('Database connected');
  }
}

// DON'T: Heavy blocking operations in constructor
@Injectable()
export class ConfigService {
  private config: Config;

  constructor() {
    // BLOCKS entire module instantiation synchronously
    this.config = fs.readFileSync('config.json');
  }
}
```

## Correct

```typescript
// DO: Return promise from async hooks
@Injectable()
export class DatabaseService implements OnModuleInit {
  private pool: Pool;

  async onModuleInit(): Promise<void> {
    // NestJS waits for this to complete before continuing
    await this.pool.connect();
    console.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up resources on shutdown
    await this.pool.end();
    console.log('Database disconnected');
  }
}

// DO: Use onApplicationBootstrap for cross-module dependencies
@Injectable()
export class CacheWarmerService implements OnApplicationBootstrap {
  constructor(
    private cache: CacheService,
    private products: ProductsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // All modules are initialized, safe to warm cache
    const products = await this.products.findPopular();
    await this.cache.warmup(products);
  }
}

// DO: Heavy init in async hooks, not constructor
@Injectable()
export class ConfigService implements OnModuleInit {
  private config: Config;

  constructor() {
    // Keep constructor synchronous and fast
  }

  async onModuleInit(): Promise<void> {
    // Async loading in lifecycle hook
    this.config = await this.loadConfig();
  }

  private async loadConfig(): Promise<Config> {
    const file = await fs.promises.readFile('config.json');
    return JSON.parse(file.toString());
  }

  get<T>(key: string): T {
    return this.config[key];
  }
}
```

## Lifecycle Hook Order

```typescript
// Understanding the order prevents race conditions
@Injectable()
export class MyService implements
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  BeforeApplicationShutdown {

  // 1. Constructor - Sync only, dependencies injected
  constructor(private dep: SomeDependency) {}

  // 2. OnModuleInit - Called after module's providers are instantiated
  // Dependencies in SAME module are available
  async onModuleInit() {
    console.log('Module init - can use same-module deps');
  }

  // 3. OnApplicationBootstrap - Called after ALL modules are initialized
  // Safe to use cross-module dependencies
  async onApplicationBootstrap() {
    console.log('App bootstrap - all deps available');
  }

  // 4. BeforeApplicationShutdown - Called on SIGTERM/SIGINT
  // HTTP server still running, can finish requests
  async beforeApplicationShutdown(signal?: string) {
    console.log('Shutdown signal:', signal);
  }

  // 5. OnModuleDestroy - Called after beforeApplicationShutdown
  // Clean up resources
  async onModuleDestroy() {
    console.log('Destroying - cleanup time');
  }
}
```

## Enable Shutdown Hooks

```typescript
// main.ts - Required for shutdown hooks to work
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // Enable SIGTERM/SIGINT handling
  await app.listen(3000);
}
```

## Why This Matters

- **Reliability**: Ensures services are ready before handling requests
- **Clean shutdown**: Proper resource cleanup prevents data loss
- **Performance**: Non-blocking startup improves boot time
- **Debugging**: Predictable order simplifies troubleshooting

## Reference

- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [Application Shutdown](https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown)

---

### 5.2 Use Lazy Loading for Large Modules

**Impact: MEDIUM** - Reduces startup time and memory usage for large applications

## Explanation

NestJS supports lazy-loading modules, which defers initialization until first use. This is valuable for large applications where some features are rarely used, serverless deployments where cold start time matters, or when certain modules have heavy initialization costs.

## Incorrect

```typescript
// DON'T: Load everything eagerly in a large app
@Module({
  imports: [
    UsersModule,
    OrdersModule,
    PaymentsModule,
    ReportsModule, // Heavy, rarely used
    AnalyticsModule, // Heavy, rarely used
    AdminModule, // Only admins use this
    LegacyModule, // Migration module, rarely used
    BulkImportModule, // Used once a month
  ],
})
export class AppModule {}

// All modules initialize at startup, even if never used
// Slow cold starts in serverless
// Memory wasted on unused modules
```

## Correct

```typescript
// Use LazyModuleLoader for optional modules
import { LazyModuleLoader } from '@nestjs/core';

@Injectable()
export class ReportsService {
  constructor(private lazyModuleLoader: LazyModuleLoader) {}

  async generateReport(type: string): Promise<Report> {
    // Load module only when needed
    const { ReportsModule } = await import('./reports/reports.module');
    const moduleRef = await this.lazyModuleLoader.load(() => ReportsModule);

    const reportsService = moduleRef.get(ReportsGeneratorService);
    return reportsService.generate(type);
  }
}

// Lazy load admin features
@Injectable()
export class AdminService {
  private adminModule: ModuleRef | null = null;

  constructor(private lazyModuleLoader: LazyModuleLoader) {}

  private async getAdminModule(): Promise<ModuleRef> {
    if (!this.adminModule) {
      const { AdminModule } = await import('./admin/admin.module');
      this.adminModule = await this.lazyModuleLoader.load(() => AdminModule);
    }
    return this.adminModule;
  }

  async runAdminTask(task: string): Promise<void> {
    const moduleRef = await this.getAdminModule();
    const taskRunner = moduleRef.get(AdminTaskRunner);
    await taskRunner.run(task);
  }
}
```

## Route-Based Lazy Loading

```typescript
// Lazy load based on route access
@Controller('admin')
export class AdminController {
  private dashboardService: AdminDashboardService | null = null;

  constructor(private lazyModuleLoader: LazyModuleLoader) {}

  @Get('dashboard')
  @UseGuards(AdminGuard)
  async getDashboard(): Promise<DashboardData> {
    if (!this.dashboardService) {
      const { AdminModule } = await import('./admin/admin.module');
      const moduleRef = await this.lazyModuleLoader.load(() => AdminModule);
      this.dashboardService = moduleRef.get(AdminDashboardService);
    }

    return this.dashboardService.getDashboardData();
  }
}

// Better: Use a lazy loader service
@Injectable()
export class ModuleLoaderService {
  private loadedModules = new Map<string, ModuleRef>();

  constructor(private lazyModuleLoader: LazyModuleLoader) {}

  async load<T>(
    key: string,
    importFn: () => Promise<{ default: Type<T> } | Type<T>>,
  ): Promise<ModuleRef> {
    if (!this.loadedModules.has(key)) {
      const module = await importFn();
      const moduleType = 'default' in module ? module.default : module;
      const moduleRef = await this.lazyModuleLoader.load(() => moduleType);
      this.loadedModules.set(key, moduleRef);
    }
    return this.loadedModules.get(key)!;
  }
}

// Usage
@Injectable()
export class FeatureService {
  constructor(private moduleLoader: ModuleLoaderService) {}

  async useHeavyFeature(): Promise<void> {
    const moduleRef = await this.moduleLoader.load(
      'heavy-feature',
      () => import('./heavy-feature/heavy-feature.module'),
    );
    const service = moduleRef.get(HeavyFeatureService);
    await service.process();
  }
}
```

## Preloading Critical Paths

```typescript
// Preload modules in background after startup
@Injectable()
export class ModulePreloader implements OnApplicationBootstrap {
  constructor(private lazyModuleLoader: LazyModuleLoader) {}

  async onApplicationBootstrap(): Promise<void> {
    // App is running, now preload likely-to-be-used modules
    setTimeout(async () => {
      await this.preloadModule(() => import('./reports/reports.module'));
      await this.preloadModule(() => import('./analytics/analytics.module'));
    }, 5000); // 5 seconds after startup
  }

  private async preloadModule(importFn: () => Promise<any>): Promise<void> {
    try {
      const module = await importFn();
      const moduleType = module.default || Object.values(module)[0];
      await this.lazyModuleLoader.load(() => moduleType);
    } catch (error) {
      // Log but don't crash - preloading is optional
      console.warn('Failed to preload module', error);
    }
  }
}
```

## When to Use Lazy Loading

```typescript
// Good candidates for lazy loading:
// 1. Admin panels (small percentage of users)
// 2. Report generators (periodic use)
// 3. Bulk import/export (occasional use)
// 4. Legacy migration modules (temporary)
// 5. Heavy analytics (background processing)

// NOT good candidates:
// 1. Core authentication (used every request)
// 2. Main API endpoints (frequently accessed)
// 3. Database connections (needed immediately)
// 4. Middleware/guards (applied globally)
```

## Why This Matters

- **Startup time**: Faster cold starts in serverless
- **Memory**: Only load what's needed
- **Scalability**: Better resource utilization
- **User experience**: Faster initial response times

## Reference

- [NestJS Lazy Loading Modules](https://docs.nestjs.com/fundamentals/lazy-loading-modules)
- [Module Reference](https://docs.nestjs.com/fundamentals/module-ref)

---

### 5.3 Optimize Database Queries

**Impact: HIGH** - Database queries are often the biggest performance bottleneck

## Explanation

Select only needed columns, use proper indexes, avoid over-fetching relations, and consider query performance when designing your data access. Most API slowness traces back to inefficient database queries.

## Incorrect

```typescript
// DON'T: Select everything when you need few fields
@Injectable()
export class UsersService {
  async findAllEmails(): Promise<string[]> {
    const users = await this.repo.find();
    // Fetches ALL columns for ALL users
    return users.map((u) => u.email);
  }

  async getUserSummary(id: string): Promise<UserSummary> {
    const user = await this.repo.findOne({
      where: { id },
      relations: ['posts', 'posts.comments', 'posts.comments.author', 'followers'],
    });
    // Over-fetches massive relation tree
    return { name: user.name, postCount: user.posts.length };
  }
}

// DON'T: No indexes on frequently queried columns
@Entity()
export class Order {
  @Column()
  userId: string; // No index - full table scan on every lookup

  @Column()
  status: string; // No index - slow status filtering
}

// DON'T: Raw queries without parameters
async findByEmail(email: string): Promise<User> {
  return this.repo.query(`SELECT * FROM users WHERE email = '${email}'`);
  // SQL injection risk + no query plan caching
}
```

## Correct

```typescript
// Select only needed columns
@Injectable()
export class UsersService {
  async findAllEmails(): Promise<string[]> {
    const users = await this.repo.find({
      select: ['email'], // Only fetch email column
    });
    return users.map((u) => u.email);
  }

  // Use QueryBuilder for complex selections
  async getUserSummary(id: string): Promise<UserSummary> {
    return this.repo
      .createQueryBuilder('user')
      .select('user.name', 'name')
      .addSelect('COUNT(post.id)', 'postCount')
      .leftJoin('user.posts', 'post')
      .where('user.id = :id', { id })
      .groupBy('user.id')
      .getRawOne();
  }

  // Fetch relations only when needed
  async getFullProfile(id: string): Promise<User> {
    return this.repo.findOne({
      where: { id },
      relations: ['posts'], // Only immediate relation
      select: {
        id: true,
        name: true,
        email: true,
        posts: {
          id: true,
          title: true,
          // Don't select post.content unless needed
        },
      },
    });
  }
}

// Add indexes on frequently queried columns
@Entity()
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['userId', 'status']) // Composite index for common query pattern
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

// Use parameterized queries
async findByEmail(email: string): Promise<User> {
  return this.repo.findOne({ where: { email } });
  // Or with QueryBuilder:
  return this.repo
    .createQueryBuilder('user')
    .where('user.email = :email', { email })
    .getOne();
}
```

## Pagination and Limiting

```typescript
// Always paginate large datasets
@Injectable()
export class OrdersService {
  async findAll(page = 1, limit = 20): Promise<PaginatedResult<Order>> {
    const [items, total] = await this.repo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Cursor-based pagination for better performance
  async findAfter(cursor: string, limit = 20): Promise<Order[]> {
    return this.repo
      .createQueryBuilder('order')
      .where('order.id > :cursor', { cursor })
      .orderBy('order.id', 'ASC')
      .take(limit)
      .getMany();
  }
}
```

## Query Analysis

```typescript
// Enable query logging to identify slow queries
TypeOrmModule.forRoot({
  logging: ['query', 'slow_query'],
  maxQueryExecutionTime: 1000, // Log queries > 1 second
});

// Use EXPLAIN to analyze query plans
@Injectable()
export class QueryAnalyzer {
  async analyzeQuery(query: string): Promise<any> {
    return this.dataSource.query(`EXPLAIN ANALYZE ${query}`);
  }
}

// Profile query in development
async findSlowQuery(): Promise<void> {
  const start = Date.now();
  const result = await this.repo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.posts', 'post')
    .getMany();
  console.log(`Query took ${Date.now() - start}ms, returned ${result.length} rows`);
}
```

## Batch Operations

```typescript
// Batch inserts for bulk data
@Injectable()
export class ImportService {
  async importUsers(users: CreateUserDto[]): Promise<void> {
    // DON'T: Insert one by one
    // for (const user of users) {
    //   await this.repo.save(user);
    // }

    // DO: Batch insert
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(users)
      .execute();

    // Or use chunks for very large datasets
    const chunks = this.chunkArray(users, 1000);
    for (const chunk of chunks) {
      await this.repo.save(chunk);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size),
    );
  }
}
```

## Why This Matters

- **Latency**: Unoptimized queries add seconds to responses
- **Scalability**: Bad queries don't scale with data growth
- **Cost**: More database resources needed for inefficient queries
- **User experience**: Slow APIs frustrate users

## Reference

- [TypeORM Query Builder](https://typeorm.io/select-query-builder)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)

---

### 5.4 Use Caching Strategically

**Impact: HIGH** - 10-100x response time improvement for cached data

## Explanation

Implement caching for expensive operations, frequently accessed data, and external API calls. Use NestJS CacheModule with appropriate TTLs and cache invalidation strategies. Don't cache everything - focus on high-impact areas.

## Incorrect

```typescript
// DON'T: No caching for expensive, repeated queries
@Injectable()
export class ProductsService {
  async getPopular(): Promise<Product[]> {
    // Runs complex aggregation query EVERY request
    return this.productsRepo
      .createQueryBuilder('p')
      .leftJoin('p.orders', 'o')
      .select('p.*, COUNT(o.id) as orderCount')
      .groupBy('p.id')
      .orderBy('orderCount', 'DESC')
      .limit(20)
      .getMany();
  }
}

// DON'T: Cache everything without thought
@Injectable()
export class UsersService {
  @CacheKey('users')
  @CacheTTL(3600)
  @UseInterceptors(CacheInterceptor)
  async findAll(): Promise<User[]> {
    // Caching user list for 1 hour is wrong if data changes frequently
    return this.usersRepo.find();
  }
}
```

## Correct

```typescript
// Setup caching module
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [
          new KeyvRedis(config.get('REDIS_URL')),
        ],
        ttl: 60 * 1000, // Default 60s
      }),
    }),
  ],
})
export class AppModule {}

// Manual caching for granular control
@Injectable()
export class ProductsService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private productsRepo: ProductRepository,
  ) {}

  async getPopular(): Promise<Product[]> {
    const cacheKey = 'products:popular';

    // Try cache first
    const cached = await this.cache.get<Product[]>(cacheKey);
    if (cached) return cached;

    // Cache miss - fetch and cache
    const products = await this.fetchPopularProducts();
    await this.cache.set(cacheKey, products, 5 * 60 * 1000); // 5 min TTL
    return products;
  }

  private async fetchPopularProducts(): Promise<Product[]> {
    return this.productsRepo
      .createQueryBuilder('p')
      .leftJoin('p.orders', 'o')
      .select('p.*, COUNT(o.id) as orderCount')
      .groupBy('p.id')
      .orderBy('orderCount', 'DESC')
      .limit(20)
      .getMany();
  }

  // Invalidate cache on changes
  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productsRepo.save({ id, ...dto });
    await this.cache.del('products:popular'); // Invalidate
    return product;
  }
}

// Decorator-based caching with auto-interceptor
@Controller('categories')
@UseInterceptors(CacheInterceptor)
export class CategoriesController {
  // Cache entire endpoint response
  @Get()
  @CacheTTL(30 * 60 * 1000) // 30 minutes - categories rarely change
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  // Different TTL for different endpoints
  @Get(':id')
  @CacheTTL(60 * 1000) // 1 minute
  @CacheKey('category') // Auto-appends :id
  findOne(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }
}

// Cache external API calls
@Injectable()
export class ExternalApiService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private http: HttpService,
  ) {}

  async getExchangeRate(currency: string): Promise<number> {
    const cacheKey = `exchange:${currency}`;
    const cached = await this.cache.get<number>(cacheKey);
    if (cached) return cached;

    const response = await firstValueFrom(
      this.http.get(`https://api.exchange.com/rate/${currency}`),
    );

    await this.cache.set(cacheKey, response.data.rate, 15 * 60 * 1000);
    return response.data.rate;
  }
}
```

## Cache Invalidation Patterns

```typescript
// Event-based invalidation
@Injectable()
export class CacheInvalidationService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  @OnEvent('product.created')
  @OnEvent('product.updated')
  @OnEvent('product.deleted')
  async invalidateProductCaches(event: ProductEvent) {
    await Promise.all([
      this.cache.del('products:popular'),
      this.cache.del(`product:${event.productId}`),
      this.cache.del(`products:category:${event.categoryId}`),
    ]);
  }
}

// Pattern-based invalidation (Redis)
async invalidatePattern(pattern: string): Promise<void> {
  const redis = this.cache.store as RedisStore;
  const keys = await redis.keys(pattern);
  if (keys.length) {
    await redis.del(...keys);
  }
}
```

## Why This Matters

- **Performance**: Cached responses are 10-100x faster
- **Scalability**: Reduces database and API load
- **Cost**: Fewer database queries = lower infrastructure costs
- **User experience**: Faster responses improve engagement

## Reference

- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [Keyv Cache Stores](https://github.com/jaredwray/keyv)

---

## 6. Testing

**Section Impact: MEDIUM-HIGH**

### 6.1 Use Supertest for E2E Testing

**Impact: MEDIUM-HIGH** - E2E tests catch integration issues that unit tests miss

## Explanation

End-to-end tests use Supertest to make real HTTP requests against your NestJS application. They test the full stack including middleware, guards, pipes, and interceptors. E2E tests catch integration issues that unit tests miss.

## Incorrect

```typescript
// DON'T: Only unit test controllers
describe('UsersController', () => {
  it('should return users', async () => {
    const service = { findAll: jest.fn().mockResolvedValue([]) };
    const controller = new UsersController(service as any);

    const result = await controller.findAll();

    expect(result).toEqual([]);
    // Doesn't test: routes, guards, pipes, serialization
  });
});

// DON'T: E2E tests without proper setup/teardown
describe('Users API', () => {
  it('should create user', async () => {
    const app = await NestFactory.create(AppModule);
    // No proper initialization
    // No cleanup after test
    // Hits real database
  });
});
```

## Correct

```typescript
// Proper E2E test setup
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same config as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create a user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'john@test.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('John');
          expect(res.body.email).toBe('john@test.com');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'invalid-email' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('email');
        });
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({})
        .expect(400);
    });
  });

  describe('/users (GET)', () => {
    it('should return array of users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(404);
    });
  });
});
```

## Testing with Authentication

```typescript
describe('Protected Routes (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password' });

    authToken = loginResponse.body.accessToken;
  });

  it('should return 401 without token', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .expect(401);
  });

  it('should return user profile with valid token', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('test@test.com');
      });
  });

  it('should deny access with invalid token', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
```

## Database Isolation

```typescript
// Use test database and clean between tests
describe('Orders API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test', // Test database config
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);
    await app.init();
  });

  beforeEach(async () => {
    // Clean database between tests
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('should create order and update inventory', async () => {
    // Seed test data
    await dataSource.getRepository(Product).save({
      id: 'prod-1',
      name: 'Test Product',
      stock: 10,
    });

    // Create order
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({
        items: [{ productId: 'prod-1', quantity: 2 }],
      })
      .expect(201);

    expect(response.body.total).toBeDefined();

    // Verify inventory updated
    const product = await dataSource.getRepository(Product).findOne({
      where: { id: 'prod-1' },
    });
    expect(product.stock).toBe(8);
  });
});
```

## Why This Matters

- **Full stack testing**: Catches routing, middleware, serialization bugs
- **Integration issues**: Tests component interactions
- **Real behavior**: Tests actual HTTP request/response
- **Confidence**: Ensures API contract works as expected

## Reference

- [NestJS E2E Testing](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing)
- [Supertest](https://github.com/visionmedia/supertest)

---

### 6.2 Mock External Services in Tests

**Impact: MEDIUM-HIGH** - External dependencies make tests slow, flaky, and expensive

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

---

### 6.3 Use Testing Module for Unit Tests

**Impact: MEDIUM-HIGH** - Enables proper DI mocking and isolated testing

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

---

## 7. Database & ORM

**Section Impact: MEDIUM-HIGH**

### 7.1 Avoid N+1 Query Problems

**Impact: HIGH** - N+1 queries cause exponential database load and slow responses

## Explanation

N+1 queries occur when you fetch a list of entities, then make an additional query for each entity to load related data. Use eager loading with `relations`, query builder joins, or DataLoader to batch queries efficiently.

## Incorrect

```typescript
// DON'T: Lazy loading in loops causes N+1
@Injectable()
export class OrdersService {
  async getOrdersWithItems(userId: string): Promise<Order[]> {
    const orders = await this.orderRepo.find({ where: { userId } });
    // 1 query for orders

    for (const order of orders) {
      // N additional queries - one per order!
      order.items = await this.itemRepo.find({ where: { orderId: order.id } });
    }

    return orders;
  }
}

// DON'T: Accessing lazy relations without loading
@Controller('users')
export class UsersController {
  @Get()
  async findAll(): Promise<User[]> {
    const users = await this.userRepo.find();
    // If User.posts is lazy-loaded, serializing triggers N queries
    return users; // Each user.posts access = 1 query
  }
}
```

## Correct

```typescript
// Use relations option for eager loading
@Injectable()
export class OrdersService {
  async getOrdersWithItems(userId: string): Promise<Order[]> {
    // Single query with JOIN
    return this.orderRepo.find({
      where: { userId },
      relations: ['items', 'items.product'],
    });
  }
}

// Use QueryBuilder for complex joins
@Injectable()
export class UsersService {
  async getUsersWithPostCounts(): Promise<UserWithPostCount[]> {
    return this.userRepo
      .createQueryBuilder('user')
      .leftJoin('user.posts', 'post')
      .select('user.id', 'id')
      .addSelect('user.name', 'name')
      .addSelect('COUNT(post.id)', 'postCount')
      .groupBy('user.id')
      .getRawMany();
  }

  async getActiveUsersWithPosts(): Promise<User[]> {
    return this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.posts', 'post')
      .leftJoinAndSelect('post.comments', 'comment')
      .where('user.isActive = :active', { active: true })
      .andWhere('post.status = :status', { status: 'published' })
      .getMany();
  }
}

// Use find options for specific fields
async getOrderSummaries(userId: string): Promise<OrderSummary[]> {
  return this.orderRepo.find({
    where: { userId },
    relations: ['items'],
    select: {
      id: true,
      total: true,
      status: true,
      items: {
        id: true,
        quantity: true,
        price: true,
      },
    },
  });
}
```

## DataLoader for GraphQL

```typescript
// Use DataLoader to batch and cache queries
import DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class PostsLoader {
  constructor(private postsService: PostsService) {}

  readonly batchPosts = new DataLoader<string, Post[]>(async (userIds) => {
    // Single query for all users' posts
    const posts = await this.postsService.findByUserIds([...userIds]);

    // Group by userId
    const postsMap = new Map<string, Post[]>();
    for (const post of posts) {
      const userPosts = postsMap.get(post.userId) || [];
      userPosts.push(post);
      postsMap.set(post.userId, userPosts);
    }

    // Return in same order as input
    return userIds.map((id) => postsMap.get(id) || []);
  });
}

// In resolver
@ResolveField()
async posts(@Parent() user: User): Promise<Post[]> {
  // DataLoader batches multiple calls into single query
  return this.postsLoader.batchPosts.load(user.id);
}
```

## Detecting N+1 Queries

```typescript
// Enable query logging in development
TypeOrmModule.forRoot({
  logging: ['query', 'error'],
  logger: 'advanced-console',
});

// Or use a custom logger to detect patterns
@Injectable()
export class QueryLogger implements Logger {
  private queryCount = 0;

  logQuery(query: string) {
    this.queryCount++;
    if (this.queryCount > 10) {
      console.warn(`Possible N+1 detected: ${this.queryCount} queries`);
    }
  }
}
```

## Why This Matters

- **Performance**: N+1 queries scale terribly (100 items = 101 queries)
- **Database load**: Each query has overhead (connection, parsing, execution)
- **Latency**: Sequential queries add up quickly
- **Scalability**: Problems multiply under load

## Reference

- [TypeORM Relations](https://typeorm.io/relations)
- [TypeORM Query Builder](https://typeorm.io/select-query-builder)

---

### 7.2 Use Database Migrations

**Impact: HIGH** - Migrations ensure consistent database schema across environments

## Explanation

Never use `synchronize: true` in production. Use migrations for all schema changes. Migrations provide version control for your database, enable safe rollbacks, and ensure consistency across all environments.

## Incorrect

```typescript
// DON'T: Use synchronize in production
TypeOrmModule.forRoot({
  type: 'postgres',
  synchronize: true, // DANGEROUS in production!
  // Can drop columns, tables, or data
});

// DON'T: Manual SQL in production
@Injectable()
export class DatabaseService {
  async addColumn(): Promise<void> {
    await this.dataSource.query('ALTER TABLE users ADD COLUMN age INT');
    // No version control, no rollback, inconsistent across envs
  }
}

// DON'T: Modify entities without migration
@Entity()
export class User {
  @Column()
  email: string;

  @Column() // Added without migration
  newField: string; // Will crash in production if synchronize is false
}
```

## Correct

```typescript
// Configure TypeORM for migrations
// ormconfig.ts or data-source.ts
export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false, // Always false in production
  migrationsRun: true, // Run migrations on startup
});

// app.module.ts
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
    synchronize: config.get('NODE_ENV') === 'development', // Only in dev
    migrations: ['dist/migrations/*.js'],
    migrationsRun: true,
  }),
});
```

## Generate and Run Migrations

```bash
# Generate migration from entity changes
npx typeorm migration:generate -d ./data-source.ts ./migrations/AddUserAge

# Create empty migration for custom SQL
npx typeorm migration:create ./migrations/SeedInitialData

# Run pending migrations
npx typeorm migration:run -d ./data-source.ts

# Revert last migration
npx typeorm migration:revert -d ./data-source.ts
```

## Migration Best Practices

```typescript
// migrations/1705312800000-AddUserAge.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAge1705312800000 implements MigrationInterface {
  name = 'AddUserAge1705312800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column with default to handle existing rows
    await queryRunner.query(`
      ALTER TABLE "users" ADD "age" integer DEFAULT 0
    `);

    // Add index for frequently queried columns
    await queryRunner.query(`
      CREATE INDEX "IDX_users_age" ON "users" ("age")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Always implement down for rollback
    await queryRunner.query(`DROP INDEX "IDX_users_age"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "age"`);
  }
}

// Safe column rename (two-step)
export class RenameNameToFullName1705312900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new column
    await queryRunner.query(`
      ALTER TABLE "users" ADD "full_name" varchar(255)
    `);

    // Step 2: Copy data
    await queryRunner.query(`
      UPDATE "users" SET "full_name" = "name"
    `);

    // Step 3: Add NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL
    `);

    // Step 4: Drop old column (after verifying app works)
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "name" varchar(255)`);
    await queryRunner.query(`UPDATE "users" SET "name" = "full_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`);
  }
}
```

## Data Migrations

```typescript
// Migrate data, not just schema
export class MigrateUserRoles1705313000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create new roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(50) NOT NULL UNIQUE
      )
    `);

    // Seed default roles
    await queryRunner.query(`
      INSERT INTO "roles" ("name") VALUES ('admin'), ('user'), ('moderator')
    `);

    // Create user_roles junction table
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "role_id" uuid REFERENCES "roles"("id") ON DELETE CASCADE,
        PRIMARY KEY ("user_id", "role_id")
      )
    `);

    // Migrate existing data
    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role_id")
      SELECT u.id, r.id
      FROM "users" u, "roles" r
      WHERE u.is_admin = true AND r.name = 'admin'
    `);

    // Remove old column after migration
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_admin"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "is_admin" boolean DEFAULT false`);
    await queryRunner.query(`
      UPDATE "users" u SET "is_admin" = true
      WHERE EXISTS (
        SELECT 1 FROM "user_roles" ur
        JOIN "roles" r ON ur.role_id = r.id
        WHERE ur.user_id = u.id AND r.name = 'admin'
      )
    `);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
```

## Why This Matters

- **Safety**: No accidental data loss from sync
- **Consistency**: Same schema in all environments
- **Auditability**: Version control for database changes
- **Rollback**: Ability to undo problematic changes

## Reference

- [TypeORM Migrations](https://typeorm.io/migrations)
- [Database Migration Best Practices](https://documentation.red-gate.com/soc/common-concepts/static-data)

---

### 7.3 Use Transactions for Multi-Step Operations

**Impact: MEDIUM-HIGH** - Prevents data inconsistency and partial updates

## Explanation

When multiple database operations must succeed or fail together, wrap them in a transaction. This prevents partial updates that leave your data in an inconsistent state. Use TypeORM's transaction APIs or the DataSource query runner for complex scenarios.

## Incorrect

```typescript
// DON'T: Multiple saves without transaction
@Injectable()
export class OrdersService {
  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    // If any step fails, data is inconsistent
    const order = await this.orderRepo.save({ userId, status: 'pending' });

    for (const item of items) {
      await this.orderItemRepo.save({ orderId: order.id, ...item });
      await this.inventoryRepo.decrement({ productId: item.productId }, 'stock', item.quantity);
    }

    await this.paymentService.charge(order.id);
    // If payment fails, order and inventory are already modified!

    return order;
  }
}
```

## Correct

```typescript
// Use DataSource.transaction() for automatic rollback
@Injectable()
export class OrdersService {
  constructor(private dataSource: DataSource) {}

  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      // All operations use the same transactional manager
      const order = await manager.save(Order, { userId, status: 'pending' });

      for (const item of items) {
        await manager.save(OrderItem, { orderId: order.id, ...item });
        await manager.decrement(
          Inventory,
          { productId: item.productId },
          'stock',
          item.quantity,
        );
      }

      // If this throws, everything rolls back
      await this.paymentService.chargeWithManager(manager, order.id);

      return order;
    });
  }
}

// QueryRunner for manual transaction control
@Injectable()
export class TransferService {
  constructor(private dataSource: DataSource) {}

  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Debit source account
      await queryRunner.manager.decrement(
        Account,
        { id: fromId },
        'balance',
        amount,
      );

      // Verify sufficient funds
      const source = await queryRunner.manager.findOne(Account, {
        where: { id: fromId },
      });
      if (source.balance < 0) {
        throw new BadRequestException('Insufficient funds');
      }

      // Credit destination account
      await queryRunner.manager.increment(
        Account,
        { id: toId },
        'balance',
        amount,
      );

      // Log the transaction
      await queryRunner.manager.save(TransactionLog, {
        fromId,
        toId,
        amount,
        timestamp: new Date(),
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

// Repository method with transaction support
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async createWithProfile(
    userData: CreateUserDto,
    profileData: CreateProfileDto,
  ): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.save(User, userData);
      await manager.save(Profile, { ...profileData, userId: user.id });
      return user;
    });
  }
}
```

## Transaction Decorators (Custom)

```typescript
// Create a transaction decorator for cleaner code
export function Transactional() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const dataSource = this.dataSource as DataSource;
      return dataSource.transaction(async (manager) => {
        // Temporarily inject transactional manager
        const originalManager = this.entityManager;
        this.entityManager = manager;
        try {
          return await originalMethod.apply(this, args);
        } finally {
          this.entityManager = originalManager;
        }
      });
    };

    return descriptor;
  };
}

// Usage
@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    private entityManager: EntityManager,
  ) {}

  @Transactional()
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // All repo calls use transactional manager automatically
    const order = await this.entityManager.save(Order, dto);
    await this.entityManager.save(AuditLog, { action: 'order.created' });
    return order;
  }
}
```

## Why This Matters

- **Data integrity**: All-or-nothing operations prevent corruption
- **Consistency**: No partial updates from failed operations
- **Audit compliance**: Complete operation trails
- **Error recovery**: Failed operations leave no traces

## Reference

- [TypeORM Transactions](https://typeorm.io/transactions)
- [NestJS Database](https://docs.nestjs.com/techniques/database)

---

## 8. API Design

**Section Impact: MEDIUM**

### 8.1 Use DTOs and Serialization for API Responses

**Impact: MEDIUM** - Prevents data leaks and ensures consistent API contracts

## Explanation

Never return entity objects directly from controllers. Use response DTOs with class-transformer's `@Exclude()` and `@Expose()` decorators to control exactly what data is sent to clients. This prevents accidental exposure of sensitive fields and provides a stable API contract.

## Incorrect

```typescript
// DON'T: Return entities directly
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
    // Returns: { id, email, passwordHash, ssn, internalNotes, ... }
    // Exposes sensitive data!
  }
}

// DON'T: Manual object spreading (error-prone)
@Get(':id')
async findOne(@Param('id') id: string) {
  const user = await this.usersService.findById(id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    // Easy to forget to exclude sensitive fields
    // Hard to maintain across endpoints
  };
}
```

## Correct

```typescript
// Enable class-transformer globally
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(3000);
}

// Entity with serialization control
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column()
  @Exclude() // Never include in responses
  passwordHash: string;

  @Column({ nullable: true })
  @Exclude()
  ssn: string;

  @Column({ default: false })
  @Exclude({ toPlainOnly: true }) // Exclude from response, allow in requests
  isAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @Exclude()
  internalNotes: string;
}

// Now returning entity is safe
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
    // Returns: { id, email, name, createdAt }
    // Sensitive fields excluded automatically
  }
}

// For different response shapes, use explicit DTOs
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  @Transform(({ obj }) => obj.posts?.length || 0)
  postCount: number;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}

export class UserDetailResponseDto extends UserResponseDto {
  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => PostResponseDto)
  posts: PostResponseDto[];
}

// Controller with explicit DTOs
@Controller('users')
export class UsersController {
  @Get()
  @SerializeOptions({ type: UserResponseDto })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(u => plainToInstance(UserResponseDto, u));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserDetailResponseDto> {
    const user = await this.usersService.findByIdWithPosts(id);
    return plainToInstance(UserDetailResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
```

## Groups for Conditional Serialization

```typescript
// Different response shapes for different contexts
export class UserDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose({ groups: ['admin'] })
  email: string;

  @Expose({ groups: ['admin'] })
  createdAt: Date;

  @Expose({ groups: ['admin', 'owner'] })
  settings: UserSettings;
}

@Controller('users')
export class UsersController {
  @Get()
  @SerializeOptions({ groups: ['public'] })
  async findAllPublic(): Promise<UserDto[]> {
    // Returns: { id, name }
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  @SerializeOptions({ groups: ['admin'] })
  async findAllAdmin(): Promise<UserDto[]> {
    // Returns: { id, name, email, createdAt }
  }

  @Get('me')
  @SerializeOptions({ groups: ['owner'] })
  async getProfile(@CurrentUser() user: User): Promise<UserDto> {
    // Returns: { id, name, settings }
  }
}
```

## Why This Matters

- **Security**: Prevents accidental exposure of sensitive data
- **API stability**: DTOs provide stable contracts regardless of entity changes
- **Flexibility**: Different response shapes for different consumers
- **Documentation**: DTOs serve as response schema documentation

## Reference

- [NestJS Serialization](https://docs.nestjs.com/techniques/serialization)
- [class-transformer](https://github.com/typestack/class-transformer)

---

### 8.2 Use Interceptors for Cross-Cutting Concerns

**Impact: MEDIUM-HIGH** - Interceptors centralize logging, transformation, and caching logic

## Explanation

Interceptors can transform responses, add logging, handle caching, and measure performance without polluting your business logic. They wrap the route handler execution, giving you access to both the request and response streams.

## Incorrect

```typescript
// DON'T: Logging in every controller method
@Controller('users')
export class UsersController {
  @Get()
  async findAll(): Promise<User[]> {
    const start = Date.now();
    this.logger.log('findAll called');

    const users = await this.usersService.findAll();

    this.logger.log(`findAll completed in ${Date.now() - start}ms`);
    return users;
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const start = Date.now();
    this.logger.log(`findOne called with id: ${id}`);

    const user = await this.usersService.findOne(id);

    this.logger.log(`findOne completed in ${Date.now() - start}ms`);
    return user;
  }
  // Repeated in every method!
}

// DON'T: Manual response wrapping
@Get()
async findAll(): Promise<{ data: User[]; meta: Meta }> {
  const users = await this.usersService.findAll();
  return {
    data: users,
    meta: { timestamp: new Date(), count: users.length },
  };
}
```

## Correct

```typescript
// Logging interceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          this.logger.log(
            `${method} ${url} ${response.statusCode} - ${Date.now() - now}ms`,
          );
        },
        error: (error) => {
          this.logger.error(
            `${method} ${url} ${error.status || 500} - ${Date.now() - now}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}

// Response transformation interceptor
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          path: context.switchToHttp().getRequest().url,
        },
      })),
    );
  }
}

// Timeout interceptor
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException('Request timed out');
        }
        throw err;
      }),
    );
  }
}

// Apply globally or per-controller
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}

// Or per-controller
@Controller('users')
@UseInterceptors(LoggingInterceptor)
export class UsersController {
  @Get()
  async findAll(): Promise<User[]> {
    // Clean business logic only
    return this.usersService.findAll();
  }
}
```

## Cache Interceptor

```typescript
// Custom cache interceptor with TTL
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.generateKey(request);
    const ttl = this.reflector.get<number>('cacheTTL', context.getHandler()) || 300;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    return next.handle().pipe(
      tap((response) => {
        this.cacheManager.set(cacheKey, response, ttl);
      }),
    );
  }

  private generateKey(request: Request): string {
    return `cache:${request.url}:${JSON.stringify(request.query)}`;
  }
}

// Usage with custom TTL
@Get()
@SetMetadata('cacheTTL', 600)
@UseInterceptors(HttpCacheInterceptor)
async findAll(): Promise<User[]> {
  return this.usersService.findAll();
}
```

## Error Mapping Interceptor

```typescript
// Map internal errors to HTTP errors
@Injectable()
export class ErrorMappingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof EntityNotFoundError) {
          throw new NotFoundException(error.message);
        }
        if (error instanceof QueryFailedError) {
          if (error.message.includes('duplicate')) {
            throw new ConflictException('Resource already exists');
          }
        }
        throw error;
      }),
    );
  }
}
```

## Why This Matters

- **DRY**: Write logging/transformation once, apply everywhere
- **Testability**: Interceptors can be tested in isolation
- **Flexibility**: Easy to add/remove cross-cutting behavior
- **Clean code**: Controllers focus on business logic only

## Reference

- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [RxJS Operators](https://rxjs.dev/guide/operators)

---

### 8.3 Use Pipes for Input Transformation

**Impact: MEDIUM** - Pipes transform and validate input before reaching handlers

## Explanation

Use built-in pipes like `ParseIntPipe`, `ParseUUIDPipe`, and `DefaultValuePipe` for common transformations. Create custom pipes for business-specific transformations. Pipes separate validation/transformation logic from controllers.

## Incorrect

```typescript
// DON'T: Manual type parsing in handlers
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    // Manual validation in every handler
    const uuid = id.trim();
    if (!isUUID(uuid)) {
      throw new BadRequestException('Invalid UUID');
    }
    return this.usersService.findOne(uuid);
  }

  @Get()
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<User[]> {
    // Manual parsing and defaults
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    return this.usersService.findAll(pageNum, limitNum);
  }
}

// DON'T: Type coercion without validation
@Get()
async search(@Query('price') price: string): Promise<Product[]> {
  const priceNum = +price; // NaN if invalid, no error
  return this.productsService.findByPrice(priceNum);
}
```

## Correct

```typescript
// Use built-in pipes for common transformations
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    // id is guaranteed to be a valid UUID
    return this.usersService.findOne(id);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<User[]> {
    // Automatic defaults and type conversion
    return this.usersService.findAll(page, limit);
  }

  @Get('by-status/:status')
  async findByStatus(
    @Param('status', new ParseEnumPipe(UserStatus)) status: UserStatus,
  ): Promise<User[]> {
    return this.usersService.findByStatus(status);
  }
}

// Custom pipe for business logic
@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return date;
  }
}

@Get('reports')
async getReports(
  @Query('from', ParseDatePipe) from: Date,
  @Query('to', ParseDatePipe) to: Date,
): Promise<Report[]> {
  return this.reportsService.findBetween(from, to);
}
```

## Custom Transformation Pipes

```typescript
// Trim and lowercase email
@Injectable()
export class NormalizeEmailPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value) return value;
    return value.trim().toLowerCase();
  }
}

// Parse comma-separated values
@Injectable()
export class ParseArrayPipe implements PipeTransform<string, string[]> {
  transform(value: string): string[] {
    if (!value) return [];
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
}

@Get('products')
async findProducts(
  @Query('ids', ParseArrayPipe) ids: string[],
  @Query('email', NormalizeEmailPipe) email: string,
): Promise<Product[]> {
  // ids is already an array, email is normalized
  return this.productsService.findByIds(ids);
}

// Sanitize HTML input
@Injectable()
export class SanitizeHtmlPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value) return value;
    return sanitizeHtml(value, { allowedTags: [] });
  }
}
```

## Validation Pipe with Transform

```typescript
// Global validation pipe with transformation
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip non-DTO properties
    transform: true, // Auto-transform to DTO types
    transformOptions: {
      enableImplicitConversion: true, // Convert query strings to numbers
    },
    forbidNonWhitelisted: true, // Throw on extra properties
  }),
);

// DTO with transformation decorators
export class FindProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value?.split(','))
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

@Get()
async findAll(@Query() dto: FindProductsDto): Promise<Product[]> {
  // dto is already transformed and validated
  return this.productsService.findAll(dto);
}
```

## Pipe Error Customization

```typescript
// Custom error messages
@Injectable()
export class CustomParseIntPipe extends ParseIntPipe {
  constructor() {
    super({
      exceptionFactory: (error) =>
        new BadRequestException(`${error} must be a valid integer`),
    });
  }
}

// Or use options on built-in pipes
@Get(':id')
async findOne(
  @Param(
    'id',
    new ParseIntPipe({
      errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE,
      exceptionFactory: () => new NotAcceptableException('ID must be numeric'),
    }),
  )
  id: number,
): Promise<Item> {
  return this.itemsService.findOne(id);
}
```

## Why This Matters

- **Separation of concerns**: Transformation logic separate from business logic
- **Reusability**: Same pipe used across multiple handlers
- **Type safety**: Handlers receive correct types
- **Clean handlers**: Less boilerplate in controller methods

## Reference

- [NestJS Pipes](https://docs.nestjs.com/pipes)
- [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

---

### 8.4 Use API Versioning for Breaking Changes

**Impact: MEDIUM** - Versioning enables backward-compatible API evolution

## Explanation

Use NestJS built-in versioning when making breaking changes to your API. Choose a versioning strategy (URI, header, or media type) and apply it consistently. This allows old clients to continue working while new clients use updated endpoints.

## Incorrect

```typescript
// DON'T: Breaking changes without versioning
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    // Original response: { id, name, email }
    // Later changed to: { id, firstName, lastName, emailAddress }
    // Old clients break!
    return this.usersService.findOne(id);
  }
}

// DON'T: Manual versioning in routes
@Controller('v1/users')
export class UsersV1Controller {}

@Controller('v2/users')
export class UsersV2Controller {}
// Inconsistent, error-prone, hard to maintain
```

## Correct

```typescript
// Enable versioning in main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // URI versioning: /v1/users, /v2/users
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Or header versioning: X-API-Version: 1
  app.enableVersioning({
    type: VersioningType.HEADER,
    header: 'X-API-Version',
    defaultVersion: '1',
  });

  // Or media type: Accept: application/json;v=1
  app.enableVersioning({
    type: VersioningType.MEDIA_TYPE,
    key: 'v=',
    defaultVersion: '1',
  });

  await app.listen(3000);
}

// Version-specific controllers
@Controller('users')
@Version('1')
export class UsersV1Controller {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserV1Response> {
    const user = await this.usersService.findOne(id);
    // V1 response format
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}

@Controller('users')
@Version('2')
export class UsersV2Controller {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserV2Response> {
    const user = await this.usersService.findOne(id);
    // V2 response format with breaking changes
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.email,
      createdAt: user.createdAt,
    };
  }
}
```

## Per-Route Versioning

```typescript
// Different versions for different routes
@Controller('users')
export class UsersController {
  @Get()
  @Version('1')
  findAllV1(): Promise<UserV1Response[]> {
    return this.usersService.findAllV1();
  }

  @Get()
  @Version('2')
  findAllV2(): Promise<UserV2Response[]> {
    return this.usersService.findAllV2();
  }

  @Get(':id')
  @Version(['1', '2']) // Same handler for multiple versions
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Post()
  @Version(VERSION_NEUTRAL) // Available in all versions
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }
}
```

## Shared Service with Version-Specific Logic

```typescript
// Service handles version differences internally
@Injectable()
export class UsersService {
  async findOne(id: string, version: string): Promise<any> {
    const user = await this.repo.findOne({ where: { id } });

    if (version === '1') {
      return this.toV1Response(user);
    }
    return this.toV2Response(user);
  }

  private toV1Response(user: User): UserV1Response {
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
    };
  }

  private toV2Response(user: User): UserV2Response {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.email,
      createdAt: user.createdAt,
    };
  }
}

// Controller extracts version
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('X-API-Version') version: string = '1',
  ): Promise<any> {
    return this.usersService.findOne(id, version);
  }
}
```

## Deprecation Strategy

```typescript
// Mark old versions as deprecated
@Controller('users')
@Version('1')
@UseInterceptors(DeprecationInterceptor)
export class UsersV1Controller {
  // All V1 routes will include deprecation warning
}

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    response.setHeader('Deprecation', 'true');
    response.setHeader('Sunset', 'Sat, 1 Jan 2025 00:00:00 GMT');
    response.setHeader('Link', '</v2/users>; rel="successor-version"');

    return next.handle();
  }
}
```

## Why This Matters

- **Backward compatibility**: Existing clients continue working
- **Gradual migration**: Clients upgrade on their schedule
- **Clear contracts**: Each version has documented behavior
- **Safe evolution**: Make breaking changes without breaking clients

## Reference

- [NestJS Versioning](https://docs.nestjs.com/techniques/versioning)
- [API Versioning Best Practices](https://www.mnot.net/blog/2012/12/04/api-evolution)

---

## 9. Microservices

**Section Impact: MEDIUM**

### 9.1 Implement Health Checks for Microservices

**Impact: MEDIUM-HIGH** - Health checks enable proper orchestration and self-healing

## Explanation

Implement liveness and readiness probes using `@nestjs/terminus`. Liveness checks determine if the service should be restarted. Readiness checks determine if the service can accept traffic. Proper health checks enable Kubernetes and load balancers to route traffic correctly.

## Incorrect

```typescript
// DON'T: Simple ping that doesn't check dependencies
@Controller('health')
export class HealthController {
  @Get()
  check(): string {
    return 'OK'; // Service might be unhealthy but returns OK
  }
}

// DON'T: Health check that blocks on slow dependencies
@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<string> {
    // If database is slow, health check times out
    await this.userRepo.findOne({ where: { id: '1' } });
    await this.redis.ping();
    await this.externalApi.healthCheck();
    return 'OK';
  }
}
```

## Correct

```typescript
// Use @nestjs/terminus for comprehensive health checks
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  HealthCheck,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  // Liveness probe - is the service alive?
  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([
      // Basic checks only
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB
    ]);
  }

  // Readiness probe - can the service handle traffic?
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () =>
        this.http.pingCheck('redis', 'http://redis:6379', { timeout: 1000 }),
      () =>
        this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  // Deep health check for debugging
  @Get('deep')
  @HealthCheck()
  deepCheck() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
      () =>
        this.http.pingCheck('external-api', 'https://api.example.com/health'),
    ]);
  }
}
```

## Custom Health Indicators

```typescript
// Custom indicator for business-specific health
@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(private queueService: QueueService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const queueStats = await this.queueService.getStats();

    const isHealthy = queueStats.failedCount < 100;
    const result = this.getStatus(key, isHealthy, {
      waiting: queueStats.waitingCount,
      active: queueStats.activeCount,
      failed: queueStats.failedCount,
    });

    if (!isHealthy) {
      throw new HealthCheckError('Queue unhealthy', result);
    }

    return result;
  }
}

// Redis health indicator
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@InjectRedis() private redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      return this.getStatus(key, pong === 'PONG');
    } catch (error) {
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false));
    }
  }
}

// Use custom indicators
@Get('ready')
@HealthCheck()
readiness() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.redis.isHealthy('redis'),
    () => this.queue.isHealthy('job-queue'),
  ]);
}
```

## Kubernetes Configuration

```yaml
# Kubernetes deployment with probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      containers:
        - name: api
          image: api-service:latest
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 0
            periodSeconds: 5
            failureThreshold: 30
```

## Graceful Shutdown

```typescript
// Proper shutdown handling
@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private isShuttingDown = false;

  isShutdown(): boolean {
    return this.isShuttingDown;
  }

  async onApplicationShutdown(signal: string): Promise<void> {
    this.isShuttingDown = true;
    console.log(`Shutting down on ${signal}`);

    // Wait for in-flight requests
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// Health check respects shutdown state
@Get('ready')
@HealthCheck()
readiness() {
  if (this.shutdownService.isShutdown()) {
    throw new ServiceUnavailableException('Shutting down');
  }

  return this.health.check([
    () => this.db.pingCheck('database'),
  ]);
}
```

## Why This Matters

- **Self-healing**: Kubernetes restarts unhealthy pods
- **Traffic routing**: Load balancers skip unready instances
- **Observability**: Know the state of your services
- **Zero downtime**: Proper rolling deployments

## Reference

- [NestJS Terminus](https://docs.nestjs.com/recipes/terminus)
- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

---

### 9.2 Use Message and Event Patterns Correctly

**Impact: MEDIUM** - Proper patterns ensure reliable microservice communication

## Explanation

NestJS microservices support two communication patterns: request-response (MessagePattern) and event-based (EventPattern). Use MessagePattern when you need a response, and EventPattern for fire-and-forget notifications. Understanding the difference prevents communication bugs.

## Incorrect

```typescript
// DON'T: Use @MessagePattern for fire-and-forget
@Controller()
export class NotificationsController {
  @MessagePattern('user.created')
  async handleUserCreated(data: UserCreatedEvent) {
    // This WAITS for response, blocking the sender
    await this.emailService.sendWelcome(data.email);
    // If email fails, sender gets an error (coupling!)
  }
}

// DON'T: Use @EventPattern expecting a response
@Controller()
export class OrdersController {
  @EventPattern('inventory.check')
  async checkInventory(data: CheckInventoryDto) {
    const available = await this.inventory.check(data);
    return available; // This return value is IGNORED with @EventPattern!
  }
}

// DON'T: Tight coupling in client
@Injectable()
export class UsersService {
  async createUser(dto: CreateUserDto): Promise<User> {
    const user = await this.repo.save(dto);

    // Blocks until notification service responds
    await this.client.send('user.created', user).toPromise();
    // If notification service is down, user creation fails!

    return user;
  }
}
```

## Correct

```typescript
// MessagePattern: Request-Response (when you NEED a response)
@Controller()
export class InventoryController {
  @MessagePattern({ cmd: 'check_inventory' })
  async checkInventory(data: CheckInventoryDto): Promise<InventoryResult> {
    const result = await this.inventoryService.check(data.productId, data.quantity);
    return result; // Response sent back to caller
  }
}

// Client expects response
@Injectable()
export class OrdersService {
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Check inventory - we NEED this response to proceed
    const inventory = await firstValueFrom(
      this.inventoryClient.send<InventoryResult>(
        { cmd: 'check_inventory' },
        { productId: dto.productId, quantity: dto.quantity },
      ),
    );

    if (!inventory.available) {
      throw new BadRequestException('Insufficient inventory');
    }

    return this.repo.save(dto);
  }
}

// EventPattern: Fire-and-Forget (for notifications, side effects)
@Controller()
export class NotificationsController {
  @EventPattern('user.created')
  async handleUserCreated(data: UserCreatedEvent): Promise<void> {
    // No return value needed - just process the event
    await this.emailService.sendWelcome(data.email);
    await this.analyticsService.track('user_signup', data);
    // If this fails, it doesn't affect the sender
  }
}

// Client emits event without waiting
@Injectable()
export class UsersService {
  async createUser(dto: CreateUserDto): Promise<User> {
    const user = await this.repo.save(dto);

    // Fire and forget - doesn't block, doesn't wait
    this.eventClient.emit('user.created', {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    return user; // User creation succeeds regardless of event handling
  }
}
```

## Hybrid Pattern for Critical Events

```typescript
// When events are critical but shouldn't block
@Injectable()
export class OrdersService {
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.repo.save(dto);

    // Critical: inventory reservation (use MessagePattern)
    const reserved = await firstValueFrom(
      this.inventoryClient.send({ cmd: 'reserve_inventory' }, {
        orderId: order.id,
        items: dto.items,
      }),
    );

    if (!reserved.success) {
      await this.repo.delete(order.id);
      throw new BadRequestException('Could not reserve inventory');
    }

    // Non-critical: notifications (use EventPattern)
    this.eventClient.emit('order.created', {
      orderId: order.id,
      userId: dto.userId,
      total: dto.total,
    });

    return order;
  }
}
```

## Error Handling

```typescript
// MessagePattern errors propagate to caller
@MessagePattern({ cmd: 'get_user' })
async getUser(userId: string): Promise<User> {
  const user = await this.repo.findOne({ where: { id: userId } });
  if (!user) {
    throw new RpcException('User not found'); // Received by caller
  }
  return user;
}

// EventPattern errors should be handled locally
@EventPattern('order.created')
async handleOrderCreated(data: OrderCreatedEvent): Promise<void> {
  try {
    await this.processOrder(data);
  } catch (error) {
    // Log and potentially retry - don't throw
    this.logger.error('Failed to process order event', error);
    await this.deadLetterQueue.add(data);
  }
}
```

## Why This Matters

- **Reliability**: Wrong pattern causes blocking or lost responses
- **Decoupling**: EventPattern keeps services independent
- **Resilience**: Fire-and-forget prevents cascade failures
- **Performance**: Async events don't block critical paths

## Reference

- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Message Patterns](https://docs.nestjs.com/microservices/basics#patterns)

---

### 9.3 Use Message Queues for Background Jobs

**Impact: MEDIUM-HIGH** - Queues enable reliable async processing and workload distribution

## Explanation

Use `@nestjs/bullmq` for background job processing. Queues decouple long-running tasks from HTTP requests, enable retry logic, and distribute workload across workers. Use them for emails, file processing, notifications, and any task that shouldn't block user requests.

## Incorrect

```typescript
// DON'T: Long-running tasks in HTTP handlers
@Controller('reports')
export class ReportsController {
  @Post()
  async generate(@Body() dto: GenerateReportDto): Promise<Report> {
    // This blocks the request for potentially minutes
    const data = await this.fetchLargeDataset(dto);
    const report = await this.processData(data); // Slow!
    await this.sendEmail(dto.email, report); // Can fail!
    return report; // Client times out
  }
}

// DON'T: Fire-and-forget without retry
@Injectable()
export class EmailService {
  async sendWelcome(email: string): Promise<void> {
    // If this fails, email is never sent
    await this.mailer.send({ to: email, template: 'welcome' });
    // No retry, no tracking, no visibility
  }
}

// DON'T: Use setInterval for scheduled tasks
setInterval(async () => {
  await cleanupOldRecords();
}, 60000); // No error handling, memory leaks
```

## Correct

```typescript
// Configure BullMQ
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'reports' },
      { name: 'notifications' },
    ),
  ],
})
export class QueueModule {}

// Producer: Add jobs to queue
@Injectable()
export class ReportsService {
  constructor(
    @InjectQueue('reports') private reportsQueue: Queue,
  ) {}

  async requestReport(dto: GenerateReportDto): Promise<{ jobId: string }> {
    // Return immediately, process in background
    const job = await this.reportsQueue.add('generate', dto, {
      priority: dto.urgent ? 1 : 10,
      delay: dto.scheduledFor ? Date.parse(dto.scheduledFor) - Date.now() : 0,
    });

    return { jobId: job.id };
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = await this.reportsQueue.getJob(jobId);
    return {
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
    };
  }
}

// Consumer: Process jobs
@Processor('reports')
export class ReportsProcessor {
  private readonly logger = new Logger(ReportsProcessor.name);

  @Process('generate')
  async generateReport(job: Job<GenerateReportDto>): Promise<Report> {
    this.logger.log(`Processing report job ${job.id}`);

    // Update progress
    await job.updateProgress(10);

    const data = await this.fetchData(job.data);
    await job.updateProgress(50);

    const report = await this.processData(data);
    await job.updateProgress(90);

    await this.saveReport(report);
    await job.updateProgress(100);

    return report;
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
```

## Email Queue with Retry

```typescript
@Processor('email')
export class EmailProcessor {
  @Process('send')
  async sendEmail(job: Job<SendEmailDto>): Promise<void> {
    const { to, template, data } = job.data;

    try {
      await this.mailer.send({
        to,
        template,
        context: data,
      });
    } catch (error) {
      // BullMQ will retry based on job options
      throw error;
    }
  }
}

// Usage
@Injectable()
export class NotificationService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendWelcome(user: User): Promise<void> {
    await this.emailQueue.add(
      'send',
      {
        to: user.email,
        template: 'welcome',
        data: { name: user.name },
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
```

## Scheduled Jobs

```typescript
// Use Bull's repeatable jobs instead of cron
@Injectable()
export class ScheduledJobsService implements OnModuleInit {
  constructor(@InjectQueue('maintenance') private queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // Clean up old reports daily at midnight
    await this.queue.add(
      'cleanup',
      {},
      {
        repeat: { cron: '0 0 * * *' },
        jobId: 'daily-cleanup', // Prevent duplicates
      },
    );

    // Send digest every hour
    await this.queue.add(
      'digest',
      {},
      {
        repeat: { every: 60 * 60 * 1000 },
        jobId: 'hourly-digest',
      },
    );
  }
}

@Processor('maintenance')
export class MaintenanceProcessor {
  @Process('cleanup')
  async cleanup(): Promise<void> {
    await this.cleanupOldReports();
    await this.cleanupExpiredSessions();
  }

  @Process('digest')
  async sendDigest(): Promise<void> {
    const users = await this.getUsersForDigest();
    for (const user of users) {
      await this.emailQueue.add('send', { to: user.email, template: 'digest' });
    }
  }
}
```

## Queue Monitoring

```typescript
// Add Bull Board for monitoring
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'email',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'reports',
      adapter: BullMQAdapter,
    }),
  ],
})
export class AdminModule {}
```

## Why This Matters

- **Reliability**: Jobs persist through restarts, automatic retry
- **Scalability**: Distribute load across multiple workers
- **User experience**: Fast responses, background processing
- **Observability**: Track job status, monitor queues

## Reference

- [NestJS Queues](https://docs.nestjs.com/techniques/queues)
- [BullMQ Documentation](https://docs.bullmq.io/)

---

## 10. DevOps & Deployment

**Section Impact: LOW-MEDIUM**

### 10.1 Implement Graceful Shutdown

**Impact: MEDIUM-HIGH** - Graceful shutdown prevents data loss and connection issues during deployments

## Explanation

Handle SIGTERM and SIGINT signals to gracefully shutdown your NestJS application. Stop accepting new requests, wait for in-flight requests to complete, close database connections, and clean up resources. This prevents data loss and connection errors during deployments.

## Incorrect

```typescript
// DON'T: Ignore shutdown signals
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  // App crashes immediately on SIGTERM
  // In-flight requests fail
  // Database connections are abruptly closed
}

// DON'T: Long-running tasks without cancellation
@Injectable()
export class ProcessingService {
  async processLargeFile(file: File): Promise<void> {
    // No way to interrupt this during shutdown
    for (let i = 0; i < file.chunks.length; i++) {
      await this.processChunk(file.chunks[i]);
      // May run for minutes, blocking shutdown
    }
  }
}
```

## Correct

```typescript
// Enable shutdown hooks in main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks
  app.enableShutdownHooks();

  // Optional: Add timeout for forced shutdown
  const server = await app.listen(3000);
  server.setTimeout(30000); // 30 second timeout

  // Handle graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('HTTP server closed');
        await app.close();
        process.exit(0);
      });

      // Force exit after timeout
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    });
  });
}
```

## Lifecycle Hooks for Cleanup

```typescript
// Service with cleanup on shutdown
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly connections: Connection[] = [];

  async onApplicationShutdown(signal?: string): Promise<void> {
    console.log(`Database service shutting down on ${signal}`);

    // Close all connections gracefully
    await Promise.all(
      this.connections.map((conn) => conn.close()),
    );

    console.log('All database connections closed');
  }
}

// Queue processor with graceful shutdown
@Injectable()
export class QueueService implements OnApplicationShutdown, OnModuleDestroy {
  private isShuttingDown = false;

  onModuleDestroy(): void {
    this.isShuttingDown = true;
  }

  async onApplicationShutdown(): Promise<void> {
    // Wait for current jobs to complete
    await this.queue.close();
  }

  async processJob(job: Job): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down');
    }
    await this.doWork(job);
  }
}

// WebSocket gateway cleanup
@WebSocketGateway()
export class EventsGateway implements OnApplicationShutdown {
  @WebSocketServer()
  server: Server;

  async onApplicationShutdown(): Promise<void> {
    // Notify all connected clients
    this.server.emit('shutdown', { message: 'Server is shutting down' });

    // Close all connections
    this.server.disconnectSockets();
  }
}
```

## Health Check Integration

```typescript
// Report unhealthy during shutdown
@Injectable()
export class ShutdownService {
  private isShuttingDown = false;

  startShutdown(): void {
    this.isShuttingDown = true;
  }

  isShutdown(): boolean {
    return this.isShuttingDown;
  }
}

@Controller('health')
export class HealthController {
  constructor(private shutdownService: ShutdownService) {}

  @Get('ready')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    // Return 503 during shutdown - k8s stops sending traffic
    if (this.shutdownService.isShutdown()) {
      throw new ServiceUnavailableException('Shutting down');
    }

    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}

// Integrate with shutdown
@Injectable()
export class AppShutdownService implements OnApplicationShutdown {
  constructor(private shutdownService: ShutdownService) {}

  async onApplicationShutdown(): Promise<void> {
    // Mark as unhealthy first
    this.shutdownService.startShutdown();

    // Wait for k8s to update endpoints
    await this.sleep(5000);

    // Then proceed with cleanup
  }
}
```

## Request Tracking for In-Flight Requests

```typescript
// Track and wait for in-flight requests
@Injectable()
export class RequestTracker implements NestMiddleware, OnApplicationShutdown {
  private activeRequests = 0;
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;
  private resolveShutdown: (() => void) | null = null;

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.isShuttingDown) {
      res.status(503).send('Service Unavailable');
      return;
    }

    this.activeRequests++;

    res.on('finish', () => {
      this.activeRequests--;
      if (this.isShuttingDown && this.activeRequests === 0 && this.resolveShutdown) {
        this.resolveShutdown();
      }
    });

    next();
  }

  async onApplicationShutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.activeRequests > 0) {
      console.log(`Waiting for ${this.activeRequests} requests to complete`);
      this.shutdownPromise = new Promise((resolve) => {
        this.resolveShutdown = resolve;
      });

      // Wait with timeout
      await Promise.race([
        this.shutdownPromise,
        new Promise((resolve) => setTimeout(resolve, 30000)),
      ]);
    }

    console.log('All requests completed');
  }
}
```

## Why This Matters

- **Zero downtime**: Rolling deployments without dropped requests
- **Data integrity**: Transactions complete properly
- **Resource cleanup**: No connection leaks or orphaned processes
- **User experience**: No failed requests during deploys

## Reference

- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [Kubernetes Graceful Shutdown](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)

---

### 10.2 Use ConfigModule for Environment Configuration

**Impact: LOW-MEDIUM** - Centralized config with validation prevents runtime errors

## Explanation

Use `@nestjs/config` for environment-based configuration. Validate configuration at startup to fail fast on misconfigurations. Use namespaced configuration for organization and type safety.

## Incorrect

```typescript
// DON'T: Access process.env directly
@Injectable()
export class DatabaseService {
  constructor() {
    // No validation, can fail at runtime
    this.connection = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT), // NaN if missing
      password: process.env.DB_PASSWORD, // undefined if missing
    });
  }
}

// DON'T: Scattered env access
@Injectable()
export class EmailService {
  sendEmail() {
    // Different services access env differently
    const apiKey = process.env.SENDGRID_API_KEY || 'default';
    // Typos go unnoticed: process.env.SENDGRID_API_KY
  }
}
```

## Correct

```typescript
// Setup validated configuration
import { ConfigModule, ConfigService, registerAs } from '@nestjs/config';
import * as Joi from 'joi';

// config/database.config.ts
export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
}));

// config/app.config.ts
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',
}));

// config/validation.schema.ts
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  REDIS_URL: Joi.string().uri().required(),
});

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Available everywhere without importing
      load: [databaseConfig, appConfig],
      validationSchema,
      validationOptions: {
        abortEarly: true, // Stop on first error
        allowUnknown: true, // Allow other env vars
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class AppModule {}
```

## Type-Safe Configuration

```typescript
// config/configuration.interface.ts
export interface AppConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
  apiPrefix: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

// Type-safe access
@Injectable()
export class AppService {
  constructor(private config: ConfigService) {}

  getPort(): number {
    // Type-safe with generic
    return this.config.get<number>('app.port');
  }

  getDatabaseConfig(): DatabaseConfig {
    return this.config.get<DatabaseConfig>('database');
  }
}

// Even better: inject namespaced config directly
@Injectable()
export class DatabaseService {
  constructor(
    @Inject(databaseConfig.KEY)
    private dbConfig: ConfigType<typeof databaseConfig>,
  ) {
    // Full type inference!
    const host = this.dbConfig.host; // string
    const port = this.dbConfig.port; // number
  }
}
```

## Environment Files

```typescript
// ConfigModule supports .env files
ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    '.env.local',
    '.env',
  ],
});

// .env.development
DB_HOST=localhost
DB_PORT=5432

// .env.production
DB_HOST=prod-db.example.com
DB_PORT=5432
```

## Why This Matters

- **Fail fast**: Validation catches missing config at startup
- **Type safety**: Prevents typos and type errors
- **Testability**: Easy to mock configuration in tests
- **Organization**: Namespaced config scales with app complexity

## Reference

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Configuration Namespaces](https://docs.nestjs.com/techniques/configuration#configuration-namespaces)

---

### 10.3 Use Structured Logging

**Impact: MEDIUM-HIGH** - Structured logs enable efficient debugging and monitoring

## Explanation

Use NestJS Logger with structured JSON output in production. Include contextual information (request ID, user ID, operation) to trace requests across services. Avoid console.log and implement proper log levels.

## Incorrect

```typescript
// DON'T: Use console.log in production
@Injectable()
export class UsersService {
  async createUser(dto: CreateUserDto): Promise<User> {
    console.log('Creating user:', dto);
    // Not structured, no levels, lost in production logs

    try {
      const user = await this.repo.save(dto);
      console.log('User created:', user.id);
      return user;
    } catch (error) {
      console.log('Error:', error); // Using log for errors
      throw error;
    }
  }
}

// DON'T: Log sensitive data
console.log('Login attempt:', { email, password }); // SECURITY RISK!

// DON'T: Inconsistent log format
logger.log('User ' + userId + ' created at ' + new Date());
// Hard to parse, no structure
```

## Correct

```typescript
// Configure logger in main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });
}

// Use NestJS Logger with context
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async createUser(dto: CreateUserDto): Promise<User> {
    this.logger.log('Creating user', { email: dto.email });

    try {
      const user = await this.repo.save(dto);
      this.logger.log('User created', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, {
        email: dto.email,
      });
      throw error;
    }
  }
}

// Custom logger for JSON output
@Injectable()
export class JsonLogger implements LoggerService {
  log(message: string, context?: object): void {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...context,
      }),
    );
  }

  error(message: string, trace?: string, context?: object): void {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        trace,
        ...context,
      }),
    );
  }

  warn(message: string, context?: object): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...context,
      }),
    );
  }

  debug(message: string, context?: object): void {
    console.debug(
      JSON.stringify({
        level: 'debug',
        timestamp: new Date().toISOString(),
        message,
        ...context,
      }),
    );
  }
}
```

## Request Context Logging

```typescript
// Use ClsModule for request-scoped context
import { ClsModule, ClsService } from 'nestjs-cls';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
      },
    }),
  ],
})
export class AppModule {}

// Middleware to set request context
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.headers['x-request-id'] || randomUUID();
    this.cls.set('requestId', requestId);
    this.cls.set('userId', req.user?.id);

    res.setHeader('x-request-id', requestId);
    next();
  }
}

// Logger that includes request context
@Injectable()
export class ContextLogger {
  constructor(private cls: ClsService) {}

  log(message: string, data?: object): void {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        requestId: this.cls.get('requestId'),
        userId: this.cls.get('userId'),
        message,
        ...data,
      }),
    );
  }

  error(message: string, error: Error, data?: object): void {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        requestId: this.cls.get('requestId'),
        userId: this.cls.get('userId'),
        message,
        error: error.message,
        stack: error.stack,
        ...data,
      }),
    );
  }
}
```

## Pino Integration for Performance

```typescript
// Use Pino for high-performance logging
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        redact: ['req.headers.authorization', 'req.body.password'],
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            query: req.query,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
  ],
})
export class AppModule {}

// Usage with Pino
@Injectable()
export class UsersService {
  constructor(private logger: PinoLogger) {
    this.logger.setContext(UsersService.name);
  }

  async findOne(id: string): Promise<User> {
    this.logger.info({ userId: id }, 'Finding user');
    // Pino uses first arg for data, second for message
  }
}
```

## Why This Matters

- **Debugging**: Find issues quickly with searchable logs
- **Monitoring**: Feed structured logs to observability tools
- **Compliance**: Audit trails with consistent format
- **Performance**: Pino is 5x faster than console.log

## Reference

- [NestJS Logger](https://docs.nestjs.com/techniques/logger)
- [nestjs-pino](https://github.com/iamolegga/nestjs-pino)

---

## References

- https://docs.nestjs.com
- https://github.com/nestjs/nest
- https://github.com/goldbergyoni/nodebestpractices

---

*Generated by build-agents.ts on 2026-01-15*
