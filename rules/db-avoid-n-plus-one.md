---
title: Avoid N+1 Query Problems
impact: HIGH
impactDescription: N+1 queries cause exponential database load and slow responses
tags:
  - database
  - performance
  - typeorm
  - queries
---

# Avoid N+1 Query Problems

**Impact: HIGH** - N+1 queries are one of the most common performance killers

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
