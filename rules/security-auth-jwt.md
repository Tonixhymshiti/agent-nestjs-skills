---
title: Implement Secure JWT Authentication
impact: CRITICAL
impactDescription: Insecure auth implementation leads to unauthorized access
tags:
  - security
  - authentication
  - jwt
  - passport
---

# Implement Secure JWT Authentication

**Impact: CRITICAL** - Proper JWT implementation is essential for secure APIs

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
