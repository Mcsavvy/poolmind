import mongoose, { Schema, Model, IndexDefinition, IndexOptions } from 'mongoose';
import { createBaseSchema, IBaseDocument, IBaseModel } from './base';

// Schema registry to keep track of registered schemas
class SchemaRegistry {
  private static instance: SchemaRegistry;
  private schemas: Map<string, Schema> = new Map();
  private models: Map<string, Model<any>> = new Map();

  private constructor() {}

  static getInstance(): SchemaRegistry {
    if (!SchemaRegistry.instance) {
      SchemaRegistry.instance = new SchemaRegistry();
    }
    return SchemaRegistry.instance;
  }

  // Register a new schema
  registerSchema(name: string, schema: Schema): void {
    if (this.schemas.has(name)) {
      console.warn(`Schema '${name}' is already registered. Skipping registration.`);
      return;
    }
    this.schemas.set(name, schema);
  }

  // Get a registered schema
  getSchema(name: string): Schema | undefined {
    return this.schemas.get(name);
  }

  // Register a new model
  registerModel<T extends IBaseDocument>(
    name: string, 
    model: Model<T>
  ): void {
    if (this.models.has(name)) {
      console.warn(`Model '${name}' is already registered. Skipping registration.`);
      return;
    }
    this.models.set(name, model);
  }

  // Get a registered model
  getModel<T extends IBaseDocument>(name: string): Model<T> | undefined {
    return this.models.get(name) as Model<T>;
  }

  // Get all registered schema names
  getSchemaNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  // Get all registered model names
  getModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  // Clear all registrations (useful for testing)
  clear(): void {
    this.schemas.clear();
    this.models.clear();
  }
}

// Utility functions for creating and registering schemas
export const schemaRegistry = SchemaRegistry.getInstance();

/**
 * Create and register a new schema that extends the base schema
 */
export function createSchema<T extends IBaseDocument>(
  name: string,
  schemaDefinition: Record<string, any>,
  options?: {
    skipRegistration?: boolean;
    additionalMethods?: Record<string, Function>;
    additionalStatics?: Record<string, Function>;
    middleware?: {
      pre?: Array<{ hook: string; fn: Function }>;
      post?: Array<{ hook: string; fn: Function }>;
    };
  }
): Schema<T> {
  const schema = createBaseSchema(schemaDefinition);

  // Add additional methods if provided
  if (options?.additionalMethods) {
    Object.entries(options.additionalMethods).forEach(([methodName, methodFn]) => {
      schema.methods[methodName] = methodFn;
    });
  }

  // Add additional static methods if provided
  if (options?.additionalStatics) {
    Object.entries(options.additionalStatics).forEach(([staticName, staticFn]) => {
      (schema.statics as any)[staticName] = staticFn;
    });
  }

  // Add additional middleware if provided
  if (options?.middleware?.pre) {
    options.middleware.pre.forEach(({ hook, fn }) => {
      (schema as any).pre(hook, fn);
    });
  }

  if (options?.middleware?.post) {
    options.middleware.post.forEach(({ hook, fn }) => {
      (schema as any).post(hook, fn);
    });
  }

  // Register the schema unless explicitly skipped
  if (!options?.skipRegistration) {
    schemaRegistry.registerSchema(name, schema);
  }

  return schema;
}

/**
 * Create and register a new model that extends the base model
 */
export function createModel<T extends IBaseDocument>(
  name: string,
  schemaDefinition: Record<string, any>,
  options?: {
    skipRegistration?: boolean;
    additionalMethods?: Record<string, Function>;
    additionalStatics?: Record<string, Function>;
    middleware?: {
      pre?: Array<{ hook: string; fn: Function }>;
      post?: Array<{ hook: string; fn: Function }>;
    };
    indexes?: Array<[IndexDefinition, IndexOptions]>;
  }
): Model<T> {
  // Check if model already exists (for Next.js hot reloading)
  if (mongoose.models[name]) {
    const existingModel = mongoose.models[name] as Model<T>;
    
    // Register the existing model if not already registered
    if (!options?.skipRegistration && !schemaRegistry.getModel(name)) {
      schemaRegistry.registerModel(name, existingModel);
    }
    
    return existingModel;
  }

  // Create new schema
  const schema = createSchema<T>(name, schemaDefinition, {
    ...options,
    skipRegistration: true // We'll register the model instead
  });

  // Create the model
  const model = mongoose.model<T>(name, schema);

  // Add indexes if provided
  if (options?.indexes) {
    options.indexes.forEach(([indexDefinition, indexOptions]) => {
      model.schema.index(indexDefinition, indexOptions);
    });
  }

  // Register the model unless explicitly skipped
  if (!options?.skipRegistration) {
    schemaRegistry.registerModel(name, model);
  }

  return model;
}

/**
 * Get an existing model or create a new one
 */
export function getOrCreateModel<T extends IBaseDocument>(
  name: string,
  schemaDefinition?: Record<string, any>,
  options?: Parameters<typeof createModel>[2]
): Model<T> {
  // Try to get existing model from registry first
  const existingModel = schemaRegistry.getModel<T>(name);
  if (existingModel) {
    return existingModel;
  }

  // Try to get existing model from mongoose
  if (mongoose.models[name]) {
    const model = mongoose.models[name] as Model<T>;
    schemaRegistry.registerModel(name, model);
    return model;
  }

  // Create new model if schema definition is provided
  if (schemaDefinition) {
    return createModel<T>(name, schemaDefinition, options);
  }

  throw new Error(`Model '${name}' not found and no schema definition provided`);
}

export { SchemaRegistry };