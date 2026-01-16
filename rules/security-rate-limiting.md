---
title: Implement Rate Limiting
impact: HIGH
impactDescription: Prevents abuse, DoS attacks, and resource exhaustion
tags:
  - security
  - rate-limiting
  - throttling
  - ddos
---

# Implement Rate Limiting

**Impact: HIGH** - Rate limiting protects against abuse and ensures fair resource usage

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
