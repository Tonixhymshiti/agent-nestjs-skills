---
title: Use Transactions for Multi-Step Operations
impact: MEDIUM-HIGH
impactDescription: Prevents data inconsistency and partial updates
tags:
  - database
  - transactions
  - typeorm
  - consistency
---

# Use Transactions for Multi-Step Operations

**Impact: MEDIUM-HIGH** - Transactions ensure data consistency in multi-step operations

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
