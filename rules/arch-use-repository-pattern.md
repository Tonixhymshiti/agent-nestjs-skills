---
title: Use Repository Pattern for Data Access
impact: HIGH
impactDescription: Abstracts database logic and improves testability
tags:
  - architecture
  - repository
  - data-access
  - abstraction
---

# Use Repository Pattern for Data Access

**Impact: HIGH** - Repository pattern decouples business logic from database implementation

## Explanation

Create custom repositories to encapsulate complex queries and database logic. This keeps services focused on business logic, makes testing easier with mock repositories, and allows changing database implementations without affecting business code.

## Incorrect

```typescript
// DON'T: Complex queries in services
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
  ) {}

  async findActiveWithOrders(minOrders: number): Promise<User[]> {
    // Complex query logic mixed with business logic
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.orders', 'order')
      .where('user.isActive = :active', { active: true })
      .andWhere('user.deletedAt IS NULL')
      .groupBy('user.id')
      .having('COUNT(order.id) >= :min', { min: minOrders })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async findByEmailDomain(domain: string): Promise<User[]> {
    // Another complex query
    return this.repo
      .createQueryBuilder('user')
      .where('user.email LIKE :domain', { domain: `%@${domain}` })
      .andWhere('user.verified = :verified', { verified: true })
      .getMany();
  }

  // Service becomes bloated with query logic
}

// DON'T: Duplicate queries across services
@Injectable()
export class ReportsService {
  async generateUserReport(): Promise<Report> {
    // Same query logic duplicated here
    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .getMany();
  }
}
```

## Correct

```typescript
// Custom repository with encapsulated queries
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findActive(): Promise<User[]> {
    return this.repo.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveWithMinOrders(minOrders: number): Promise<User[]> {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.orders', 'order')
      .where('user.isActive = :active', { active: true })
      .andWhere('user.deletedAt IS NULL')
      .groupBy('user.id')
      .having('COUNT(order.id) >= :min', { min: minOrders })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async findByEmailDomain(domain: string): Promise<User[]> {
    return this.repo
      .createQueryBuilder('user')
      .where('user.email LIKE :domain', { domain: `%@${domain}` })
      .andWhere('user.verified = :verified', { verified: true })
      .getMany();
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { deletedAt: new Date() });
  }
}

// Clean service with business logic only
@Injectable()
export class UsersService {
  constructor(private usersRepo: UsersRepository) {}

  async getActiveUsersWithOrders(): Promise<User[]> {
    return this.usersRepo.findActiveWithMinOrders(1);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = new User();
    user.email = dto.email;
    user.name = dto.name;
    // Business logic only, no query details

    return this.usersRepo.save(user);
  }
}

// Register repository as provider
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersRepository, UsersService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
```

## Repository Interface for Testing

```typescript
// Define interface for dependency injection
export interface IUsersRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findActive(): Promise<User[]>;
  save(user: User): Promise<User>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

// Implementation
@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}
  // ... implementations
}

// Service uses interface
@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private usersRepo: IUsersRepository,
  ) {}
}

// Easy to mock in tests
describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: jest.Mocked<IUsersRepository>;

  beforeEach(async () => {
    mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findActive: jest.fn(),
      save: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USERS_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('should throw on duplicate email', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com' } as User);

    await expect(
      service.create({ email: 'test@test.com', name: 'Test' }),
    ).rejects.toThrow(ConflictException);
  });
});
```

## Why This Matters

- **Testability**: Mock repositories without database setup
- **Maintainability**: Query changes don't affect business logic
- **Reusability**: Share query logic across services
- **Clarity**: Services focus on business rules, repos on data access

## Reference

- [TypeORM Custom Repositories](https://typeorm.io/custom-repository)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
