import { IBaseDocument } from './base';

// Common field types that can be reused across schemas
export const commonFields = {
  // String fields
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Number fields
  price: {
    type: Number,
    min: 0
  },
  
  quantity: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Array fields
  tags: [{
    type: String,
    trim: true
  }],
  
  // Reference fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status fields
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'completed'],
    default: 'active'
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
};

// Import mongoose for ObjectId type
import mongoose from 'mongoose';

// Utility types for better TypeScript support
export type DocumentId = mongoose.Types.ObjectId | string;

export type PopulatedDocument<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] extends mongoose.Types.ObjectId | undefined 
    ? IBaseDocument 
    : T[P] extends mongoose.Types.ObjectId[] | undefined
    ? IBaseDocument[]
    : T[P];
};

// Helper type for creating schema definitions
export type SchemaDefinition<T = any> = {
  [K in keyof T]?: any;
};

// Common validation functions
export const validators = {
  email: {
    validator: function(v: string) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    },
    message: 'Please enter a valid email address'
  },
  
  strongPassword: {
    validator: function(v: string) {
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
    },
    message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
  },
  
  phoneNumber: {
    validator: function(v: string) {
      return /^\+?[\d\s\-\(\)]+$/.test(v);
    },
    message: 'Please enter a valid phone number'
  },
  
  url: {
    validator: function(v: string) {
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Please enter a valid URL'
  }
};

// Common schema options
export const schemaOptions = {
  strict: true,
  strictQuery: true,
  runValidators: true,
  context: 'query'
};

// Enum definitions for common status types
export const StatusEnum = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type Status = typeof StatusEnum[keyof typeof StatusEnum];

// Priority enum
export const PriorityEnum = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export type Priority = typeof PriorityEnum[keyof typeof PriorityEnum];