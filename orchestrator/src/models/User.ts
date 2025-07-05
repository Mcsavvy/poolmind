import mongoose, { Document, Schema } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - telegramId
 *         - username
 *       properties:
 *         telegramId:
 *           type: string
 *           description: Telegram user ID
 *         username:
 *           type: string
 *           description: Telegram username
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         walletAddress:
 *           type: string
 *           description: Linked Stacks wallet address
 *         kycStatus:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           description: KYC verification status
 *         isActive:
 *           type: boolean
 *           description: Account active status
 *         preferences:
 *           type: object
 *           properties:
 *             notifications:
 *               type: boolean
 *             language:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export interface IUser extends Document<mongoose.Types.ObjectId> {
  telegramId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  kycStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  preferences: {
    notifications: boolean;
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    kycStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    preferences: {
      notifications: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        default: "en",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
UserSchema.index({ telegramId: 1, isActive: 1 });
UserSchema.index({ walletAddress: 1, isActive: 1 });

export default mongoose.model<IUser>("User", UserSchema);
