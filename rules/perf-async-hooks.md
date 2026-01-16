---
title: Use Async Lifecycle Hooks Correctly
impact: HIGH
impactDescription: Prevents blocking and ensures proper initialization order
tags:
  - performance
  - lifecycle
  - async
  - initialization
---

# Use Async Lifecycle Hooks Correctly

**Impact: HIGH** - Improper async handling blocks application startup

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
