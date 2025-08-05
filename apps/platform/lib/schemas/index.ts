// Export all schema utilities and types
export * from './base';
export * from './registry';
export * from './types';

// Re-export mongoose for convenience
export { default as mongoose } from 'mongoose';

// Export database connection
export { default as connectDB } from '../database';

// Example usage and quick start guide
export const exampleUsage = {
  // Example of creating a simple User model
  createUserModel: `
    import { createModel, IBaseDocument, commonFields } from '@/lib/schemas';

    interface IUser extends IBaseDocument {
      username: string;
      email: string;
      isVerified: boolean;
    }

    const User = createModel<IUser>('User', {
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
      },
      email: commonFields.email,
      isVerified: {
        type: Boolean,
        default: false
      }
    });

    export default User;
  `,

  // Example of using the model
  useModel: `
    import User from '@/models/User';
    import connectDB from '@/lib/database';

    export async function createUser(userData: { username: string; email: string }) {
      await connectDB();
      
      const user = new User(userData);
      await user.save();
      
      return user;
    }
  `,

  // Example of extending with custom methods
  customMethods: `
    const User = createModel<IUser>('User', {
      // ... schema definition
    }, {
      additionalMethods: {
        getDisplayName() {
          return this.username || this.email;
        }
      },
      additionalStatics: {
        findByEmail(email: string) {
          return this.findOne({ email });
        }
      }
    });
  `
};