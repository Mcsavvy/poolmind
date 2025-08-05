import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  withValidation, 
  validateRequest, 
  createMethodValidator,
  getValidatedData,
  createSuccessResponse,
  createValidationErrorResponse,
  commonSchemas 
} from './api-validation';
import { allSchemas } from './api-schemas';

// Example 1: Using withValidation HOF (Higher Order Function)
// This is the cleanest approach for most use cases
export const exampleWithHOF = withValidation({
  body: allSchemas.user.createUser,
  query: commonSchemas.pagination,
})(async (request, context, validatedData) => {
  // validatedData is fully typed based on your schemas
  const { body, query } = validatedData!;
  
  // Your business logic here with validated data
  console.log('Validated body:', body);
  console.log('Validated query:', query);
  
  return createSuccessResponse({
    user: body,
    pagination: query,
  });
});

// Example 2: Manual validation within handler
export async function exampleManualValidation(request: NextRequest) {
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
  
  // Your business logic here
  const pool = {
    ...body,
    isDraft: query?.draft ?? false,
  };
  
  return createSuccessResponse(pool, 'Pool created successfully', 201);
}

// Example 3: Method-specific validation (simplified for type consistency)
export async function exampleMethodSpecific(request: NextRequest) {
  const method = request.method;
  
  switch (method) {
    case 'GET':
      return withValidation({ query: allSchemas.pool.poolQuery })(
        async (req, ctx, data) => createSuccessResponse(data!.query)
      )(request);
      
    case 'POST':
      return withValidation({ 
        body: allSchemas.pool.createPool,
        query: z.object({ publishImmediately: commonSchemas.boolean.default(false) })
      })(async (req, ctx, data) => createSuccessResponse({
        pool: data!.body,
        publish: data!.query!.publishImmediately
      }))(request);
      
    case 'PATCH':
      return withValidation({ body: allSchemas.pool.updatePool })(
        async (req, ctx, data) => createSuccessResponse(data!.body)
      )(request);
      
    default:
      return NextResponse.json({ error: `Method ${method} not allowed` }, { status: 405 });
  }
}

// Example 4: Using getValidatedData utility
export async function exampleGetValidatedData(request: NextRequest) {
  const validatedData = await getValidatedData(request, {
    body: allSchemas.transaction.createTransaction,
  });

  if (!validatedData) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }

  // Process the validated transaction
  return createSuccessResponse(validatedData.body);
}

// Example 5: Complex nested validation
const complexUserSchema = z.object({
  profile: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    bio: z.string().max(500).optional(),
    socialLinks: z.object({
      twitter: commonSchemas.url.optional(),
      linkedin: commonSchemas.url.optional(),
      website: commonSchemas.url.optional(),
    }).optional(),
  }),
  preferences: allSchemas.notificationPreferences,
  investmentProfile: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
    investmentGoals: z.array(z.enum(['growth', 'income', 'preservation', 'speculation'])),
    experienceLevel: z.enum(['beginner', 'intermediate', 'expert']),
    annualIncome: z.enum(['<50k', '50k-100k', '100k-250k', '250k-500k', '500k+']).optional(),
  }),
});

export const exampleComplexValidation = withValidation({
  body: complexUserSchema,
  query: z.object({
    sendWelcomeEmail: commonSchemas.boolean.default(true),
  }),
})(async (request, context, validatedData) => {
  const { body, query } = validatedData!;
  
  // All nested data is validated and typed
  console.log('Risk tolerance:', body!.investmentProfile.riskTolerance);
  console.log('Social links:', body!.profile.socialLinks);
  console.log('Send welcome email:', query!.sendWelcomeEmail);
  
  return createSuccessResponse({
    message: 'Profile updated successfully',
    profile: body,
  });
});

// Example 6: Conditional validation based on user type
export async function exampleConditionalValidation(request: NextRequest) {
  const userType = request.headers.get('x-user-type') || 'regular';
  
  // Use different validation based on user type
  switch (userType) {
    case 'admin':
      const adminValidation = await validateRequest(request, {
        body: allSchemas.admin.systemSettings,
        query: commonSchemas.pagination,
      });
      if (!adminValidation.success) return createValidationErrorResponse(adminValidation.error);
      return createSuccessResponse({ userType, data: adminValidation.data });
      
    case 'investor':
      const investorValidation = await validateRequest(request, {
        body: allSchemas.pool.createInvestment,
        query: commonSchemas.pagination,
      });
      if (!investorValidation.success) return createValidationErrorResponse(investorValidation.error);
      return createSuccessResponse({ userType, data: investorValidation.data });
      
    default:
      const userValidation = await validateRequest(request, {
        body: allSchemas.user.updateUser,
        query: commonSchemas.pagination,
      });
      if (!userValidation.success) return createValidationErrorResponse(userValidation.error);
      return createSuccessResponse({ userType, data: userValidation.data });
  }
}

// Example 7: File upload validation
export const exampleFileUpload = withValidation({
  body: z.object({
    file: allSchemas.upload.imageUpload,
    metadata: z.object({
      alt: z.string().optional(),
      caption: z.string().max(200).optional(),
    }).optional(),
  }),
})(async (request, context, validatedData) => {
  const { body } = validatedData!;
  
  // Process file upload with validated data
  return createSuccessResponse({
    message: 'File uploaded successfully',
    file: body!.file,
    metadata: body!.metadata,
  });
});

// Example 8: Batch operations with array validation
const batchUserSchema = z.object({
  users: z.array(allSchemas.user.createUser).min(1).max(100),
  options: z.object({
    skipDuplicates: commonSchemas.boolean.default(false),
    sendNotifications: commonSchemas.boolean.default(true),
  }).optional(),
});

export const exampleBatchOperation = withValidation({
  body: batchUserSchema,
})(async (request, context, validatedData) => {
  const { body } = validatedData!;
  
  // Process batch user creation
  const results = body!.users.map((user, index) => {
    // Process each user
    return { index, user, status: 'processed' };
  });
  
  return createSuccessResponse({
    message: `Processed ${body!.users.length} users`,
    results,
    options: body!.options,
  });
});

// Example 9: Custom error handling
export async function exampleCustomErrorHandling(request: NextRequest) {
  const validation = await validateRequest(request, {
    body: allSchemas.auth.walletAuth,
  });

  if (!validation.success) {
    // Custom error response based on validation type
    const isWalletAddressError = validation.error.details.some(
      detail => detail.path.includes('walletAddress')
    );
    
    if (isWalletAddressError) {
      return NextResponse.json(
        { 
          error: 'Invalid wallet address',
          hint: 'Please ensure you\'re using a valid Stacks wallet address',
        },
        { status: 400 }
      );
    }
    
    return createValidationErrorResponse(validation.error);
  }

  return createSuccessResponse(validation.data);
}

// Example 10: Middleware-style usage
export function createValidationMiddleware<TBody = any, TQuery = any>(
  config: { body?: z.ZodSchema<TBody>; query?: z.ZodSchema<TQuery> }
) {
  return async function(
    request: NextRequest,
    handler: (req: NextRequest, validated: { body?: TBody; query?: TQuery }) => Promise<NextResponse>
  ) {
    const validation = await validateRequest(request, config);
    
    if (!validation.success) {
      return createValidationErrorResponse(validation.error);
    }
    
    return handler(request, validation.data);
  };
}