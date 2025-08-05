import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';

// Types for our validation utility
export interface ValidationConfig<TBody = any, TQuery = any> {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
}

export interface ValidatedRequest<TBody = any, TQuery = any> extends NextRequest {
  validatedBody?: TBody;
  validatedQuery?: TQuery;
}

export interface ValidationResult<TBody = any, TQuery = any> {
  success: true;
  data: {
    body?: TBody;
    query?: TQuery;
  };
}

export interface ValidationError {
  success: false;
  error: {
    message: string;
    details: Array<{
      path: string[];
      message: string;
      code: string;
    }>;
  };
}

// Common Zod schemas for reuse
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    offset: z.coerce.number().int().min(0).optional(),
  }),

  // Sorting
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  // Search
  search: z.object({
    q: z.string().min(1).optional(),
    search: z.string().min(1).optional(),
  }),

  // Common field validations
  email: z.email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  strongPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 
      'Password must contain uppercase, lowercase, number and special character'),
  url: z.string().url('Invalid URL format'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  
  // Wallet address validation (assuming Stacks based on your dependencies)
  walletAddress: z.string().regex(/^S[0-9A-Z]{39}$/, 'Invalid Stacks wallet address'),
  
  // Boolean coercion for query params
  boolean: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true' || val === '1'),
    z.number().transform((val) => val === 1),
  ]),
};

// Helper function to convert query params to proper types
function parseQueryParams(searchParams: URLSearchParams): Record<string, any> {
  const params: Record<string, any> = {};
  
  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      // Handle multiple values for the same key
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    } else {
      params[key] = value;
    }
  }
  
  return params;
}

// Format Zod errors for better API responses
function formatZodError(error: ZodError<any>): ValidationError['error'] {
  return {
    message: 'Validation failed',
    details: error.issues.map((err: any) => ({
      path: err.path.map(String),
      message: err.message,
      code: err.code,
    })),
  };
}

// Main validation function
export async function validateRequest<TBody = any, TQuery = any>(
  request: NextRequest,
  config: ValidationConfig<TBody, TQuery>
): Promise<ValidationResult<TBody, TQuery> | ValidationError> {
  try {
    const result: { body?: TBody; query?: TQuery } = {};

    // Validate request body if schema provided
    if (config.body) {
      try {
        const body = await request.json();
        result.body = config.body.parse(body);
      } catch (parseError) {
        if (parseError instanceof ZodError) {
          return {
            success: false,
            error: formatZodError(parseError),
          };
        }
        // Handle JSON parsing errors
        return {
          success: false,
          error: {
            message: 'Invalid JSON in request body',
            details: [{
              path: ['body'],
              message: 'Request body must be valid JSON',
              code: 'invalid_json',
            }],
          },
        };
      }
    }

    // Validate query parameters if schema provided
    if (config.query) {
      try {
        const queryParams = parseQueryParams(request.nextUrl.searchParams);
        result.query = config.query.parse(queryParams);
      } catch (parseError) {
        if (parseError instanceof ZodError) {
          return {
            success: false,
            error: formatZodError(parseError),
          };
        }
      }
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Validation error',
        details: [{
          path: [],
          message: 'An unexpected validation error occurred',
          code: 'unknown_error',
        }],
      },
    };
  }
}

// Higher-order function to create validated API handlers
export function withValidation<TBody = any, TQuery = any>(
  config: ValidationConfig<TBody, TQuery>
) {
  return function <THandler extends (
    request: NextRequest,
    context?: any,
    validatedData?: { body?: TBody; query?: TQuery }
  ) => Promise<NextResponse>>(handler: THandler) {
    return async function (request: NextRequest, context?: any): Promise<NextResponse> {
      const validation = await validateRequest(request, config);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: validation.error.message,
            details: validation.error.details,
          },
          { status: 400 }
        );
      }

      // Call the original handler with validated data
      return handler(request, context, validation.data);
    };
  };
}

// Utility for creating method-specific validators
export function createMethodValidator<TBody = any, TQuery = any>(
  methods: Record<string, ValidationConfig<TBody, TQuery>>
) {
  return async function (request: NextRequest, context?: any): Promise<NextResponse> {
    const method = request.method;
    const config = methods[method];

    if (!config) {
      return NextResponse.json(
        { error: `Method ${method} not allowed` },
        { status: 405 }
      );
    }

    const validation = await validateRequest(request, config);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.message,
          details: validation.error.details,
        },
        { status: 400 }
      );
    }

    // Return the validated data - you'll typically use this in a wrapper
    return NextResponse.json({ validatedData: validation.data });
  };
}

// Utility to extract validated data from a request (for manual validation)
export async function getValidatedData<TBody = any, TQuery = any>(
  request: NextRequest,
  config: ValidationConfig<TBody, TQuery>
): Promise<{ body?: TBody; query?: TQuery } | null> {
  const validation = await validateRequest(request, config);
  return validation.success ? validation.data : null;
}

// Error response helper
export function createValidationErrorResponse(
  error: ValidationError['error'],
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      error: error.message,
      details: error.details,
    },
    { status }
  );
}

// Success response helper with TypeScript support
export function createSuccessResponse<T = any>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}