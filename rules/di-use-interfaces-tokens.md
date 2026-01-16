---
title: Use Injection Tokens for Interfaces
impact: HIGH
impactDescription: Enables proper abstraction and testability
tags:
  - dependency-injection
  - interfaces
  - tokens
  - abstraction
---

# Use Injection Tokens for Interfaces

**Impact: HIGH** - TypeScript interfaces don't exist at runtime; tokens enable proper DI

## Explanation

TypeScript interfaces are erased at compile time and can't be used as injection tokens. Use string tokens, symbols, or abstract classes when you want to inject implementations of interfaces. This enables swapping implementations for testing or different environments.

## Incorrect

```typescript
// DON'T: Interface can't be used as injection token
interface PaymentGateway {
  charge(amount: number): Promise<PaymentResult>;
}

@Injectable()
export class StripeService implements PaymentGateway {
  charge(amount: number) { /* ... */ }
}

@Injectable()
export class OrdersService {
  // This WON'T work - PaymentGateway doesn't exist at runtime
  constructor(private payment: PaymentGateway) {}
}
```

## Correct

```typescript
// Option 1: String/Symbol tokens (most flexible)
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PaymentGateway {
  charge(amount: number): Promise<PaymentResult>;
}

@Injectable()
export class StripeService implements PaymentGateway {
  async charge(amount: number): Promise<PaymentResult> {
    // Stripe implementation
  }
}

@Injectable()
export class MockPaymentService implements PaymentGateway {
  async charge(amount: number): Promise<PaymentResult> {
    return { success: true, id: 'mock-id' };
  }
}

// Module registration
@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useClass: process.env.NODE_ENV === 'test'
        ? MockPaymentService
        : StripeService,
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentModule {}

// Injection
@Injectable()
export class OrdersService {
  constructor(
    @Inject(PAYMENT_GATEWAY) private payment: PaymentGateway,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    await this.payment.charge(dto.amount);
  }
}

// Option 2: Abstract class (carries runtime type info)
export abstract class PaymentGateway {
  abstract charge(amount: number): Promise<PaymentResult>;
}

@Injectable()
export class StripeService extends PaymentGateway {
  async charge(amount: number): Promise<PaymentResult> {
    // Implementation
  }
}

@Module({
  providers: [
    {
      provide: PaymentGateway,
      useClass: StripeService,
    },
  ],
})
export class PaymentModule {}

// No @Inject needed with abstract class
@Injectable()
export class OrdersService {
  constructor(private payment: PaymentGateway) {}
}
```

## Testing Benefits

```typescript
describe('OrdersService', () => {
  let service: OrdersService;
  let mockPayment: jest.Mocked<PaymentGateway>;

  beforeEach(async () => {
    mockPayment = {
      charge: jest.fn().mockResolvedValue({ success: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PAYMENT_GATEWAY,
          useValue: mockPayment,
        },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  it('should charge payment', async () => {
    await service.createOrder({ amount: 100 });
    expect(mockPayment.charge).toHaveBeenCalledWith(100);
  });
});
```

## Why This Matters

- **Abstraction**: Code depends on interface, not implementation
- **Testability**: Easy to swap real services for mocks
- **Flexibility**: Change implementations without changing consumers
- **Runtime safety**: Tokens ensure DI works correctly

## Reference

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [Injection Tokens](https://docs.nestjs.com/fundamentals/custom-providers#non-class-based-provider-tokens)
