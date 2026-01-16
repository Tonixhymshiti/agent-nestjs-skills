---
title: Use Supertest for E2E Testing
impact: MEDIUM-HIGH
impactDescription: E2E tests catch integration issues that unit tests miss
tags:
  - testing
  - e2e
  - supertest
  - integration
---

# Use Supertest for E2E Testing

**Impact: MEDIUM-HIGH** - E2E tests validate the full request/response cycle

## Explanation

End-to-end tests use Supertest to make real HTTP requests against your NestJS application. They test the full stack including middleware, guards, pipes, and interceptors. E2E tests catch integration issues that unit tests miss.

## Incorrect

```typescript
// DON'T: Only unit test controllers
describe('UsersController', () => {
  it('should return users', async () => {
    const service = { findAll: jest.fn().mockResolvedValue([]) };
    const controller = new UsersController(service as any);

    const result = await controller.findAll();

    expect(result).toEqual([]);
    // Doesn't test: routes, guards, pipes, serialization
  });
});

// DON'T: E2E tests without proper setup/teardown
describe('Users API', () => {
  it('should create user', async () => {
    const app = await NestFactory.create(AppModule);
    // No proper initialization
    // No cleanup after test
    // Hits real database
  });
});
```

## Correct

```typescript
// Proper E2E test setup
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same config as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create a user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'john@test.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('John');
          expect(res.body.email).toBe('john@test.com');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'invalid-email' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('email');
        });
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({})
        .expect(400);
    });
  });

  describe('/users (GET)', () => {
    it('should return array of users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(404);
    });
  });
});
```

## Testing with Authentication

```typescript
describe('Protected Routes (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password' });

    authToken = loginResponse.body.accessToken;
  });

  it('should return 401 without token', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .expect(401);
  });

  it('should return user profile with valid token', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('test@test.com');
      });
  });

  it('should deny access with invalid token', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
```

## Database Isolation

```typescript
// Use test database and clean between tests
describe('Orders API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test', // Test database config
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);
    await app.init();
  });

  beforeEach(async () => {
    // Clean database between tests
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('should create order and update inventory', async () => {
    // Seed test data
    await dataSource.getRepository(Product).save({
      id: 'prod-1',
      name: 'Test Product',
      stock: 10,
    });

    // Create order
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({
        items: [{ productId: 'prod-1', quantity: 2 }],
      })
      .expect(201);

    expect(response.body.total).toBeDefined();

    // Verify inventory updated
    const product = await dataSource.getRepository(Product).findOne({
      where: { id: 'prod-1' },
    });
    expect(product.stock).toBe(8);
  });
});
```

## Why This Matters

- **Full stack testing**: Catches routing, middleware, serialization bugs
- **Integration issues**: Tests component interactions
- **Real behavior**: Tests actual HTTP request/response
- **Confidence**: Ensures API contract works as expected

## Reference

- [NestJS E2E Testing](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing)
- [Supertest](https://github.com/visionmedia/supertest)
