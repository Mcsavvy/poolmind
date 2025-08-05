# Next.js API Route Validation with Zod

A robust validation utility for Next.js API routes that provides type-safe request body and query parameter validation using Zod.

## Features

- 🔍 **Request body validation** with full TypeScript support
- 🎯 **Query parameter validation** with automatic type coercion
- 🛡️ **Type safety** - fully typed validated data
- 🚀 **Multiple usage patterns** - HOF, manual validation, method-specific
- 📝 **Detailed error responses** with field-specific error messages
- 🔧 **Reusable schemas** for common validation patterns
- 🎨 **Consistent error handling** across all API routes

## Quick Start

### 1. Basic Usage with Higher-Order Function

The cleanest approach for most use cases:

```typescript
import { withValidation, createSuccessResponse } from '@/lib/api-validation';
import { allSchemas } from '@/lib/api-schemas';

export const POST = withValidation({
  body: allSchemas.user.createUser,
  query: commonSchemas.pagination,
})(async (request, context, validatedData) => {
  const { body, query } = validatedData!;
  
  // body and query are fully typed and validated
  console.log('User:', body.walletAddress);
  console.log('Page:', query.page);
  
  return createSuccessResponse({
    user: body,
    pagination: query,
  }, 'User created successfully', 201);
});
```

### 2. Manual Validation

For more control over the validation flow:

```typescript
import { validateRequest, createValidationErrorResponse } from '@/lib/api-validation';

export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, {
    body: allSchemas.pool.createPool,
    query: z.object({
      draft: commonSchemas.boolean.optional(),
    }),
  });

  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const { body, query } = validation.data;
  // Process validated data...
  
  return createSuccessResponse(result);
}
```

### 3. Method-Specific Validation

Handle different HTTP methods with different validation rules:

```typescript
import { createMethodValidator } from '@/lib/api-validation';

const handler = createMethodValidator({
  GET: {
    query: allSchemas.pool.poolQuery,
  },
  POST: {
    body: allSchemas.pool.createPool,
    query: z.object({
      publishImmediately: commonSchemas.boolean.default(false),
    }),
  },
  PATCH: {
    body: allSchemas.pool.updatePool,
  },
});

export { handler as GET, handler as POST, handler as PATCH };
```

## Available Schemas

### Common Schemas (`commonSchemas`)

- `pagination` - Standard pagination (page, limit, offset)
- `sort` - Sorting parameters (sortBy, sortOrder)
- `search` - Search parameters (q, search)
- `email` - Email validation
- `password` - Basic password validation
- `strongPassword` - Strong password validation
- `url` - URL validation
- `slug` - URL-friendly slug validation
- `objectId` - MongoDB ObjectId validation
- `walletAddress` - Stacks wallet address validation
- `boolean` - Boolean coercion for query params

### Project-Specific Schemas (`allSchemas`)

- `user.*` - User-related validations
- `pool.*` - Pool/investment validations
- `transaction.*` - Transaction validations
- `auth.*` - Authentication validations
- `admin.*` - Admin operation validations
- `upload.*` - File upload validations

## Query Parameter Handling

The utility automatically handles query parameter type coercion:

```typescript
// URL: /api/users?page=2&verified=true&tags=crypto&tags=defi
const querySchema = z.object({
  page: z.coerce.number().int().min(1),
  verified: commonSchemas.boolean,
  tags: z.array(z.string()).optional(),
});

// Results in:
// {
//   page: 2,           // number
//   verified: true,    // boolean
//   tags: ['crypto', 'defi']  // string array
// }
```

## Error Responses

Validation errors return structured responses:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email format",
      "code": "invalid_string"
    },
    {
      "path": ["age"],
      "message": "Expected number, received string",
      "code": "invalid_type"
    }
  ]
}
```

## Custom Validation Schemas

Create custom schemas for your specific needs:

```typescript
import { z } from 'zod';
import { commonSchemas } from '@/lib/api-validation';

const customUserSchema = z.object({
  profile: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    bio: z.string().max(500).optional(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    notifications: commonSchemas.boolean.default(true),
  }),
  socialLinks: z.array(
    z.object({
      platform: z.enum(['twitter', 'linkedin', 'github']),
      url: commonSchemas.url,
    })
  ).max(5).optional(),
});
```

## Advanced Patterns

### Conditional Validation

```typescript
export async function POST(request: NextRequest) {
  const userType = request.headers.get('x-user-type');
  
  const bodySchema = userType === 'admin' 
    ? allSchemas.admin.systemSettings
    : allSchemas.user.updateUser;

  const validation = await validateRequest(request, {
    body: bodySchema,
  });

  // Handle validation...
}
```

### Batch Operations

```typescript
const batchSchema = z.object({
  items: z.array(allSchemas.user.createUser).min(1).max(100),
  options: z.object({
    skipDuplicates: commonSchemas.boolean.default(false),
    validateAll: commonSchemas.boolean.default(true),
  }),
});

export const POST = withValidation({
  body: batchSchema,
})(async (request, context, validatedData) => {
  const { items, options } = validatedData!.body!;
  
  // Process batch operation...
});
```

### Custom Error Handling

```typescript
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, {
    body: allSchemas.auth.walletAuth,
  });

  if (!validation.success) {
    // Custom error logic
    const hasWalletError = validation.error.details.some(
      detail => detail.path.includes('walletAddress')
    );
    
    if (hasWalletError) {
      return NextResponse.json({
        error: 'Invalid wallet address',
        hint: 'Please connect a valid Stacks wallet',
      }, { status: 400 });
    }
    
    return createValidationErrorResponse(validation.error);
  }

  // Process validated data...
}
```

## Utilities

### `getValidatedData`

Extract validated data without automatic error responses:

```typescript
const validatedData = await getValidatedData(request, {
  body: mySchema,
});

if (!validatedData) {
  // Handle validation failure
  return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
}

// Use validatedData.body and validatedData.query
```

### `createSuccessResponse`

Create consistent success responses:

```typescript
return createSuccessResponse(
  { users: [...] },           // data
  'Users fetched successfully', // message (optional)
  200                          // status (optional, default 200)
);
```

### `createValidationErrorResponse`

Create validation error responses:

```typescript
return createValidationErrorResponse(
  validationError,  // error object from validation
  400              // status (optional, default 400)
);
```

## TypeScript Support

All validation results are fully typed:

```typescript
export const POST = withValidation({
  body: z.object({
    name: z.string(),
    age: z.number(),
  }),
  query: z.object({
    format: z.enum(['json', 'xml']),
  }),
})(async (request, context, validatedData) => {
  // TypeScript knows the exact shape:
  const name: string = validatedData!.body!.name;
  const age: number = validatedData!.body!.age;
  const format: 'json' | 'xml' = validatedData!.query!.format;
});
```

## Best Practices

1. **Use the HOF pattern** (`withValidation`) for clean, readable code
2. **Reuse common schemas** instead of duplicating validation logic
3. **Create project-specific schemas** for complex validation patterns
4. **Use type coercion** for query parameters (numbers, booleans)
5. **Provide helpful error messages** in your schemas
6. **Validate early** - validate at the API boundary before business logic
7. **Use strict mode** for objects to prevent unexpected fields

## Performance Considerations

- Validation happens on every request - keep schemas simple for high-traffic endpoints
- Use `.optional()` and `.default()` appropriately to reduce validation overhead
- Consider caching complex validation schemas if they're computed dynamically
- The utility handles JSON parsing errors gracefully without throwing exceptions

## Migration from Existing Code

Replace manual validation:

```typescript
// Before
const body = await request.json();
if (!body.email || typeof body.email !== 'string') {
  return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
}

// After
export const POST = withValidation({
  body: z.object({
    email: commonSchemas.email,
  }),
})(async (request, context, validatedData) => {
  const { email } = validatedData!.body!;
  // email is guaranteed to be a valid string
});
```

This utility eliminates boilerplate validation code, provides better error messages, and ensures type safety throughout your API routes.