---
title: Use Lazy Loading for Large Modules
impact: MEDIUM
impactDescription: Reduces startup time and memory usage for large applications
tags:
  - performance
  - lazy-loading
  - modules
  - startup
---

# Use Lazy Loading for Large Modules

**Impact: MEDIUM** - Lazy loading improves startup time for large applications

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
