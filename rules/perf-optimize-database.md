---
title: Optimize Database Queries
impact: HIGH
impactDescription: Database queries are often the biggest performance bottleneck
tags:
  - performance
  - database
  - optimization
  - queries
---

# Optimize Database Queries

**Impact: HIGH** - Database queries are typically the largest source of latency

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
