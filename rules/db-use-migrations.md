---
title: Use Database Migrations
impact: HIGH
impactDescription: Migrations ensure consistent database schema across environments
tags:
  - database
  - migrations
  - typeorm
  - schema
---

# Use Database Migrations

**Impact: HIGH** - Migrations enable safe, repeatable database schema changes

## Explanation

Never use `synchronize: true` in production. Use migrations for all schema changes. Migrations provide version control for your database, enable safe rollbacks, and ensure consistency across all environments.

## Incorrect

```typescript
// DON'T: Use synchronize in production
TypeOrmModule.forRoot({
  type: 'postgres',
  synchronize: true, // DANGEROUS in production!
  // Can drop columns, tables, or data
});

// DON'T: Manual SQL in production
@Injectable()
export class DatabaseService {
  async addColumn(): Promise<void> {
    await this.dataSource.query('ALTER TABLE users ADD COLUMN age INT');
    // No version control, no rollback, inconsistent across envs
  }
}

// DON'T: Modify entities without migration
@Entity()
export class User {
  @Column()
  email: string;

  @Column() // Added without migration
  newField: string; // Will crash in production if synchronize is false
}
```

## Correct

```typescript
// Configure TypeORM for migrations
// ormconfig.ts or data-source.ts
export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false, // Always false in production
  migrationsRun: true, // Run migrations on startup
});

// app.module.ts
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
    synchronize: config.get('NODE_ENV') === 'development', // Only in dev
    migrations: ['dist/migrations/*.js'],
    migrationsRun: true,
  }),
});
```

## Generate and Run Migrations

```bash
# Generate migration from entity changes
npx typeorm migration:generate -d ./data-source.ts ./migrations/AddUserAge

# Create empty migration for custom SQL
npx typeorm migration:create ./migrations/SeedInitialData

# Run pending migrations
npx typeorm migration:run -d ./data-source.ts

# Revert last migration
npx typeorm migration:revert -d ./data-source.ts
```

## Migration Best Practices

```typescript
// migrations/1705312800000-AddUserAge.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAge1705312800000 implements MigrationInterface {
  name = 'AddUserAge1705312800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column with default to handle existing rows
    await queryRunner.query(`
      ALTER TABLE "users" ADD "age" integer DEFAULT 0
    `);

    // Add index for frequently queried columns
    await queryRunner.query(`
      CREATE INDEX "IDX_users_age" ON "users" ("age")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Always implement down for rollback
    await queryRunner.query(`DROP INDEX "IDX_users_age"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "age"`);
  }
}

// Safe column rename (two-step)
export class RenameNameToFullName1705312900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new column
    await queryRunner.query(`
      ALTER TABLE "users" ADD "full_name" varchar(255)
    `);

    // Step 2: Copy data
    await queryRunner.query(`
      UPDATE "users" SET "full_name" = "name"
    `);

    // Step 3: Add NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL
    `);

    // Step 4: Drop old column (after verifying app works)
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "name" varchar(255)`);
    await queryRunner.query(`UPDATE "users" SET "name" = "full_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`);
  }
}
```

## Data Migrations

```typescript
// Migrate data, not just schema
export class MigrateUserRoles1705313000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create new roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(50) NOT NULL UNIQUE
      )
    `);

    // Seed default roles
    await queryRunner.query(`
      INSERT INTO "roles" ("name") VALUES ('admin'), ('user'), ('moderator')
    `);

    // Create user_roles junction table
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "role_id" uuid REFERENCES "roles"("id") ON DELETE CASCADE,
        PRIMARY KEY ("user_id", "role_id")
      )
    `);

    // Migrate existing data
    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role_id")
      SELECT u.id, r.id
      FROM "users" u, "roles" r
      WHERE u.is_admin = true AND r.name = 'admin'
    `);

    // Remove old column after migration
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_admin"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "is_admin" boolean DEFAULT false`);
    await queryRunner.query(`
      UPDATE "users" u SET "is_admin" = true
      WHERE EXISTS (
        SELECT 1 FROM "user_roles" ur
        JOIN "roles" r ON ur.role_id = r.id
        WHERE ur.user_id = u.id AND r.name = 'admin'
      )
    `);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
```

## Why This Matters

- **Safety**: No accidental data loss from sync
- **Consistency**: Same schema in all environments
- **Auditability**: Version control for database changes
- **Rollback**: Ability to undo problematic changes

## Reference

- [TypeORM Migrations](https://typeorm.io/migrations)
- [Database Migration Best Practices](https://documentation.red-gate.com/soc/common-concepts/static-data)
