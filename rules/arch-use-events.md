---
title: Use Event-Driven Architecture for Decoupling
impact: MEDIUM-HIGH
impactDescription: Events reduce coupling between modules and improve scalability
tags:
  - architecture
  - events
  - decoupling
  - scalability
---

# Use Event-Driven Architecture for Decoupling

**Impact: MEDIUM-HIGH** - Events decouple modules and enable asynchronous processing

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
