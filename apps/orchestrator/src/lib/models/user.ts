import {
  createModel,
  IBaseDocument,
  commonFields,
  validators,
} from '../schemas';

// Notification preferences interface
export interface INotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  security: boolean;
}

// User interface extending base document
export interface IUser extends IBaseDocument {
  // Wallet authentication (primary)
  walletAddress: string; // Stacks wallet address
  publicKey?: string; // Public key for additional verification

  // Profile information (optional)
  username?: string;
  email?: string;
  displayName?: string;
  profilePicture?: string;
  bio?: string;

  // Authentication metadata
  lastLoginAt?: Date;
  loginCount: number;
  isEmailVerified: boolean;

  // Notification preferences
  notificationPreferences: INotificationPreferences;

  // Social links (optional)
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    website?: string;
  };

  // User role and permissions
  role: 'user' | 'admin' | 'moderator';

  // Wallet connection history
  connectionHistory: Array<{
    connectedAt: Date;
    walletType: string;
    ipAddress?: string;
  }>;
}

// Create the User model with custom methods and statics
const User = createModel<IUser>(
  'User',
  {
    // Primary authentication field
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // Stacks addresses are typically uppercase
      validate: validators.stacksWalletAddress,
    },

    publicKey: {
      type: String,
      trim: true,
      sparse: true, // Allows null values but enforces uniqueness when present
    },

    // Profile fields
    username: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 30,
      sparse: true, // Allows null but unique when present
      match: /^[a-zA-Z0-9_-]+$/,
    },

    email: {
      ...commonFields.email,
      sparse: true,
      validate: validators.email,
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    profilePicture: {
      type: String,
      validate: validators.url,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Authentication tracking
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },

    loginCount: {
      type: Number,
      default: 1,
      min: 0,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Notification preferences with defaults
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      marketing: {
        type: Boolean,
        default: false,
      },
      security: {
        type: Boolean,
        default: true,
      },
    },

    // Role-based access
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },

    // Connection tracking
    connectionHistory: [
      {
        connectedAt: {
          type: Date,
          default: Date.now,
        },
        walletType: {
          type: String,
          required: true,
        },
        ipAddress: String,
      },
    ],
  },
  {
    // Additional instance methods
    additionalMethods: {
      // Get display name with fallback logic
      getDisplayName(this: IUser): string {
        return (
          this.displayName ||
          this.username ||
          `${this.walletAddress.substring(0, 8)}...`
        );
      },

      // Update login tracking
      updateLoginInfo(this: IUser): Promise<IUser> {
        this.lastLoginAt = new Date();
        this.loginCount += 1;
        return this.save();
      },

      // Add connection to history
      addConnection(
        this: IUser,
        walletType: string,
        ipAddress?: string,
      ): Promise<IUser> {
        this.connectionHistory.unshift({
          connectedAt: new Date(),
          walletType,
          ipAddress,
        });

        // Keep only last 10 connections
        if (this.connectionHistory.length > 10) {
          this.connectionHistory = this.connectionHistory.slice(0, 10);
        }

        return this.save();
      },

      // Update notification preferences
      updateNotificationPreferences(
        this: IUser,
        preferences: Partial<INotificationPreferences>,
      ): Promise<IUser> {
        this.notificationPreferences = {
          ...this.notificationPreferences,
          ...preferences,
        };
        return this.save();
      },

      // Check if user has admin privileges
      isAdmin(this: IUser): boolean {
        return this.role === 'admin';
      },

      // Check if user has moderator or admin privileges
      isModerator(this: IUser): boolean {
        return this.role === 'moderator' || this.role === 'admin';
      },
    },

    // Additional static methods
    additionalStatics: {
      // Find user by wallet address
      findByWalletAddress(walletAddress: string): Promise<IUser | null> {
        return this.findOne({ walletAddress: walletAddress.toUpperCase() });
      },

      // Find user by username
      findByUsername(username: string): Promise<IUser | null> {
        return this.findOne({ username: username.toLowerCase() });
      },

      // Find user by email
      findByEmail(email: string): Promise<IUser | null> {
        return this.findOne({ email: email.toLowerCase() });
      },

      // Find users with email notifications enabled
      findWithEmailNotifications(): Promise<IUser[]> {
        return this.find({
          'notificationPreferences.email': true,
          isActive: true,
          email: { $exists: true, $ne: null },
        });
      },

      // Get user statistics
      async getStats() {
        const stats = await this.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              usersWithEmail: {
                $sum: { $cond: [{ $ne: ['$email', null] }, 1, 0] },
              },
              usersWithUsername: {
                $sum: { $cond: [{ $ne: ['$username', null] }, 1, 0] },
              },
              adminUsers: {
                $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] },
              },
            },
          },
        ]);

        return (
          stats[0] || {
            totalUsers: 0,
            usersWithEmail: 0,
            usersWithUsername: 0,
            adminUsers: 0,
          }
        );
      },
    },

    // Middleware
    middleware: {
      pre: [
        {
          hook: 'save',
          fn: function (this: IUser, next: any) {
            // Normalize wallet address to uppercase
            if (this.walletAddress) {
              this.walletAddress = this.walletAddress.toUpperCase();
            }

            // Normalize email to lowercase
            if (this.email) {
              this.email = this.email.toLowerCase();
            }

            // Normalize username to lowercase
            if (this.username) {
              this.username = this.username.toLowerCase();
            }

            next();
          },
        },
      ],
    },
    indexes: [[{ walletAddress: 1, isActive: 1 }, { unique: true }]],
  },
);

export default User;
