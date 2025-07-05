import User, { IUser } from "../models/User";
import { AuthUtils, TelegramAuthData } from "../utils/auth";

export interface CreateUserData {
  telegramId: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  preferences?: {
    notifications?: boolean;
    language?: string;
  };
}

export interface LinkWalletData {
  walletAddress: string;
  signature?: string; // For wallet verification
}

export class UserService {
  /**
   * Register or login user via Telegram bot/webapp
   */
  static async authenticateWithTelegram(
    authData: TelegramAuthData,
  ): Promise<{ user: IUser; token: string; isNewUser: boolean }> {
    // Parse Telegram user data
    const telegramUser = AuthUtils.parseTelegramUserData(authData);

    if (!telegramUser) {
      throw new Error("Invalid Telegram user data");
    }

    const {
      id: telegramId,
      username,
      first_name: firstName,
      last_name: lastName,
    } = telegramUser;

    // Check if user exists
    let user = await User.findOne({ telegramId: telegramId.toString() });
    let isNewUser = false;

    if (!user) {
      // Create new user
      user = new User({
        telegramId: telegramId.toString(),
        username: username || `user_${telegramId}`,
        firstName,
        lastName,
      });

      await user.save();
      isNewUser = true;
    } else {
      // Update existing user data
      user.username = username || user.username;
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      await user.save();
    }

    // Generate JWT token
    const token = AuthUtils.generateToken(user);

    return { user, token, isNewUser };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  /**
   * Get user by Telegram ID
   */
  static async getUserByTelegramId(telegramId: string): Promise<IUser | null> {
    return await User.findOne({ telegramId, isActive: true });
  }

  /**
   * Get user by wallet address
   */
  static async getUserByWalletAddress(
    walletAddress: string,
  ): Promise<IUser | null> {
    return await User.findOne({ walletAddress, isActive: true });
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updateData: UpdateUserData,
  ): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  /**
   * Link wallet address to user account
   */
  static async linkWallet(
    userId: string,
    linkData: LinkWalletData,
  ): Promise<IUser | null> {
    const { walletAddress } = linkData;

    // Check if wallet is already linked to another user
    const existingUser = await User.findOne({
      walletAddress,
      _id: { $ne: userId },
      isActive: true,
    });

    if (existingUser) {
      throw new Error("Wallet address already linked to another account");
    }

    // TODO: Implement wallet signature verification here
    // if (linkData.signature) {
    //   const isValidSignature = await this.verifyWalletSignature(walletAddress, linkData.signature);
    //   if (!isValidSignature) {
    //     throw new Error('Invalid wallet signature');
    //   }
    // }

    return await User.findByIdAndUpdate(
      userId,
      { $set: { walletAddress } },
      { new: true, runValidators: true },
    );
  }

  /**
   * Unlink wallet address from user account
   */
  static async unlinkWallet(userId: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { $unset: { walletAddress: 1 } },
      { new: true },
    );
  }

  /**
   * Update KYC status
   */
  static async updateKYCStatus(
    userId: string,
    status: "pending" | "approved" | "rejected",
  ): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { $set: { kycStatus: status } },
      { new: true },
    );
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(userId: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true },
    );
  }

  /**
   * Get all users with pagination
   */
  static async getUsers(
    page: number = 1,
    limit: number = 10,
    filters: any = {},
  ): Promise<{
    users: IUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const query = { isActive: true, ...filters };

    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    kycApproved: number;
    walletsLinked: number;
  }> {
    const [totalUsers, activeUsers, kycApproved, walletsLinked] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ kycStatus: "approved", isActive: true }),
        User.countDocuments({
          walletAddress: { $exists: true, $ne: null },
          isActive: true,
        }),
      ]);

    return {
      totalUsers,
      activeUsers,
      kycApproved,
      walletsLinked,
    };
  }
}
