import mongoose from 'mongoose';
import { createBaseSchema, IBaseDocument, IBaseModel } from './base';

// Common field definitions
export const commonFields = {
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  url: {
    type: String,
    trim: true,
  },
};

// Common validators
export const validators = {
  email: {
    validator: function (v: string) {
      return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    },
    message: 'Invalid email format',
  },
  url: {
    validator: function (v: string) {
      return !v || /^https?:\/\/.+/.test(v);
    },
    message: 'Invalid URL format',
  },
  stacksWalletAddress: {
    validator: function (v: string) {
      return /^S[PT][0-9A-HJKMNP-TV-Z]{39}$/.test(v);
    },
    message: 'Invalid Stacks wallet address format',
  },
};

// Model creation helper
export function createModel<T extends IBaseDocument>(
  name: string,
  schemaDefinition: Record<string, any>,
  options?: {
    additionalMethods?: Record<string, (...args: any[]) => any>;
    additionalStatics?: Record<string, (...args: any[]) => any>;
    middleware?: {
      pre?: Array<{ hook: string; fn: (...args: any[]) => any }>;
      post?: Array<{ hook: string; fn: (...args: any[]) => any }>;
    };
    indexes?: Array<[Record<string, any>, Record<string, any>?]>;
  },
): IBaseModel<T> {
  const schema = createBaseSchema(schemaDefinition);

  // Add additional instance methods
  if (options?.additionalMethods) {
    Object.entries(options.additionalMethods).forEach(
      ([methodName, method]) => {
        schema.methods[methodName] = method;
      },
    );
  }

  // Add additional static methods
  if (options?.additionalStatics) {
    Object.entries(options.additionalStatics).forEach(
      ([staticName, staticMethod]) => {
        schema.statics[staticName] = staticMethod;
      },
    );
  }

  // Add middleware
  if (options?.middleware?.pre) {
    options.middleware.pre.forEach(({ hook, fn }) => {
      schema.pre(hook as any, fn);
    });
  }

  if (options?.middleware?.post) {
    options.middleware.post.forEach(({ hook, fn }) => {
      schema.post(hook as any, fn);
    });
  }

  // Add custom indexes
  if (options?.indexes) {
    options.indexes.forEach(([indexDef, indexOptions]) => {
      schema.index(indexDef, indexOptions);
    });
  }
  console.log('Creating model:', name);
  const model = mongoose.model<T>(name, schema) as IBaseModel<T>;
  Object.defineProperty(model, 'name', {
    value: name,
    configurable: true,
  });
  return model;
}
