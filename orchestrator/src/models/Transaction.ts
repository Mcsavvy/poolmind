import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
  txId: string;
  userId: string;
  userAddress: string;
  type: "deposit" | "withdrawal";
  status: "pending" | "success" | "failed" | "timeout";
  stxAmount?: number; // Amount in microSTX
  plmdAmount?: number; // Amount in PLMD tokens
  nav?: number; // NAV at time of transaction
  fee?: number; // Fee amount in microSTX
  netAmount?: number; // Net amount after fees
  blockHeight?: number;
  errorMessage?: string;
  retryCount: number;
  lastPolledAt?: Date;
  confirmedAt?: Date;
  timeoutAt: Date; // When to stop polling (5 minutes from creation)
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    txId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userAddress: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "timeout"],
      default: "pending",
      index: true,
    },
    stxAmount: {
      type: Number,
      min: 0,
    },
    plmdAmount: {
      type: Number,
      min: 0,
    },
    nav: {
      type: Number,
      min: 0,
    },
    fee: {
      type: Number,
      min: 0,
    },
    netAmount: {
      type: Number,
      min: 0,
    },
    blockHeight: {
      type: Number,
      min: 0,
    },
    errorMessage: {
      type: String,
      maxlength: 1000,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPolledAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
    timeoutAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
TransactionSchema.index({ userId: 1, status: 1 });
TransactionSchema.index({ status: 1, timeoutAt: 1 });
TransactionSchema.index({ txId: 1, status: 1 });

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);
