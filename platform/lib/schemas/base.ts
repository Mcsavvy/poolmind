import mongoose, { Document, Schema, Model } from 'mongoose';

// Base interface that all models should extend
export interface IBaseDocument extends Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  version: number;
}

// Base schema options
export const baseSchemaOptions = {
  timestamps: true, // Adds createdAt and updatedAt
  versionKey: '__v',
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
};

// Base schema definition
export const baseSchemaDefinition = {
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  version: {
    type: Number,
    default: 1
  }
};

// Base schema with common fields and methods
export const createBaseSchema = (schemaDefinition: Record<string, any> = {}) => {
  const schema = new Schema(
    {
      ...baseSchemaDefinition,
      ...schemaDefinition
    },
    baseSchemaOptions
  );

  // Add common methods
  schema.methods.softDelete = function() {
    this.isActive = false;
    return this.save();
  };

  schema.methods.restore = function() {
    this.isActive = true;
    return this.save();
  };

  schema.methods.incrementVersion = function() {
    this.version += 1;
    return this.save();
  };

  // Add common statics
  schema.statics.findActive = function() {
    return this.find({ isActive: true });
  };

  schema.statics.findInactive = function() {
    return this.find({ isActive: false });
  };

  schema.statics.softDeleteById = function(id: string) {
    return this.findByIdAndUpdate(id, { isActive: false }, { new: true });
  };

  schema.statics.restoreById = function(id: string) {
    return this.findByIdAndUpdate(id, { isActive: true }, { new: true });
  };

  // Add pre-save middleware
  schema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
      this.version += 1;
    }
    next();
  });

  // Add indexes for common queries
  schema.index({ createdAt: -1 });
  schema.index({ updatedAt: -1 });
  schema.index({ isActive: 1, createdAt: -1 });

  return schema;
};

// Base static methods interface for TypeScript
export interface IBaseModel<T extends IBaseDocument> extends Model<T> {
  findActive(): mongoose.Query<T[], T>;
  findInactive(): mongoose.Query<T[], T>;
  softDeleteById(id: string): mongoose.Query<T | null, T>;
  restoreById(id: string): mongoose.Query<T | null, T>;
}