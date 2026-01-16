---
title: Throw HTTP Exceptions from Services
impact: HIGH
impactDescription: Clean separation between business logic and HTTP concerns
tags:
  - error-handling
  - exceptions
  - services
  - http
---

# Throw HTTP Exceptions from Services

**Impact: HIGH** - Proper exception throwing simplifies error handling

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
