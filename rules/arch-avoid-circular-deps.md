---
title: Avoid Circular Dependencies
impact: CRITICAL
impactDescription: Prevents runtime crashes and unpredictable behavior
tags:
  - architecture
  - modules
  - dependencies
  - circular
---

# Avoid Circular Dependencies

**Impact: CRITICAL** - Circular dependencies cause undefined behavior and runtime errors

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
