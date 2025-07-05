import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { disconnect } from "@stacks/connect";
import {
  getUserProfile,
  removeAuthToken,
  unlinkWalletAddress,
  getUserBalances,
} from "../utils/api";

interface User {
  _id: string;
  telegramId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  kycStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  preferences?: {
    notifications?: boolean;
    language?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TokenBalance {
  balance: number;
  balanceFormatted: string;
  decimals?: number;
  unit?: string;
}

interface BalanceData {
  address: string;
  plmd?: TokenBalance;
  stx?: TokenBalance;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!user?.walletAddress) return;

    try {
      setBalanceLoading(true);
      const result = await getUserBalances();

      if (result.success && result.data) {
        setBalances(result.data);
      } else {
        console.error("Failed to fetch balances:", result.error);
      }
    } catch (err: unknown) {
      console.error("Balance fetch error:", err);
    } finally {
      setBalanceLoading(false);
    }
  }, [user?.walletAddress]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await getUserProfile();

        if (result.success && result.data) {
          setUser(result.data);
        } else {
          setError(result.error || "Failed to load profile");
          // If profile fetch fails, redirect to unauthenticated page
          navigate("/auth/login");
        }
      } catch (err: unknown) {
        console.error(err);
        setError("Failed to load profile");
        navigate("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Fetch balances when user data is loaded and has wallet
  useEffect(() => {
    if (user?.walletAddress) {
      fetchBalances();
    }
  }, [user?.walletAddress, fetchBalances]);

  const handleLogout = () => {
    removeAuthToken();
    navigate("/auth/login");
  };

  const handleUnlinkWallet = async () => {
    if (!confirm("Are you sure you want to unlink your wallet?")) {
      return;
    }

    try {
      setUnlinkLoading(true);
      const result = await unlinkWalletAddress();

      if (result.success && result.data) {
        // Clear the Stacks wallet session from local storage
        disconnect();
        // Clear balances when wallet is unlinked
        setBalances(null);
        setUser(result.data);
        alert("Wallet unlinked successfully!");
      } else {
        alert(`Failed to unlink wallet: ${result.error}`);
      }
    } catch (err: unknown) {
      console.error(err);
      alert("Failed to unlink wallet");
    } finally {
      setUnlinkLoading(false);
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getKycStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "✅ Approved";
      case "rejected":
        return "❌ Rejected";
      default:
        return "⏳ Pending";
    }
  };

  const formatBalance = (balance: TokenBalance, tokenSymbol: string) => {
    const amount = parseFloat(balance.balanceFormatted);

    // Format based on token type
    if (tokenSymbol === "STX") {
      // Format STX with up to 2 decimal places, remove trailing zeros
      return amount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } else if (tokenSymbol === "PLMD") {
      // Format PLMD with up to 2 decimal places, remove trailing zeros
      return amount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }

    // Default formatting
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
          <h2 className="mb-4 text-gray-800 text-2xl font-semibold">
            ❌ Error
          </h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={handleLogout}
            className="bg-blue-500 hover:bg-blue-600 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full">
        <h2 className="mb-6 text-gray-800 text-2xl font-semibold text-center">
          👤 User Profile
        </h2>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">
              Personal Information
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Username:</span> @{user.username}
              </p>
              {user.firstName && (
                <p>
                  <span className="font-medium">First Name:</span>{" "}
                  {user.firstName}
                </p>
              )}
              {user.lastName && (
                <p>
                  <span className="font-medium">Last Name:</span>{" "}
                  {user.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">
              Wallet & Verification
            </h3>
            <div className="space-y-2 text-sm">
              {user.walletAddress ? (
                <p className="break-all">
                  <span className="font-medium">Wallet:</span>{" "}
                  {user.walletAddress}
                </p>
              ) : (
                <p className="text-gray-500">No wallet linked</p>
              )}
              <div className="flex items-center gap-2">
                <span className="font-medium">KYC Status:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getKycStatusColor(user.kycStatus)}`}
                >
                  {getKycStatusText(user.kycStatus)}
                </span>
              </div>
            </div>
          </div>

          {user.walletAddress && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-3">
                Wallet Balances
              </h3>
              {balanceLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-sm text-gray-600">
                    Loading balances...
                  </span>
                </div>
              ) : balances ? (
                <div className="space-y-3">
                  {balances.stx && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src="/tokens/stx.png"
                          alt="STX"
                          className="w-6 h-6"
                        />
                        <span className="font-medium">STX</span>
                      </div>
                      <span className="font-mono text-sm">
                        {formatBalance(balances.stx, "STX")}
                      </span>
                    </div>
                  )}
                  {balances.plmd && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src="/tokens/plmd.png"
                          alt="PLMD"
                          className="w-6 h-6"
                        />
                        <span className="font-medium">PLMD</span>
                      </div>
                      <span className="font-mono text-sm">
                        {formatBalance(balances.plmd, "PLMD")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Unable to load balances</p>
              )}

              {/* Pool Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate("/pool/deposit")}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white border-none py-2 px-3 rounded-md text-xs cursor-pointer transition-all duration-200"
                >
                  💰 Deposit
                </button>
                <button
                  onClick={() => navigate("/pool/withdraw")}
                  disabled={
                    !balances?.plmd ||
                    parseFloat(balances.plmd.balanceFormatted) === 0
                  }
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white border-none py-2 px-3 rounded-md text-xs cursor-pointer transition-all duration-200"
                >
                  💸 Withdraw
                </button>
              </div>
            </div>
          )}

          {user.preferences && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Preferences</h3>
              <div className="space-y-2 text-sm">
                {user.preferences.language && (
                  <p>
                    <span className="font-medium">Language:</span>{" "}
                    {user.preferences.language}
                  </p>
                )}
                <p>
                  <span className="font-medium">Notifications:</span>{" "}
                  {user.preferences.notifications ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">
              Account Details
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Status:</span>{" "}
                {user.isActive ? "Active" : "Inactive"}
              </p>
              <p>
                <span className="font-medium">Member Since:</span>{" "}
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {user.walletAddress ? (
            <button
              onClick={handleUnlinkWallet}
              disabled={unlinkLoading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200"
            >
              {unlinkLoading ? "Unlinking..." : "Unlink Wallet"}
            </button>
          ) : (
            <button
              onClick={() => navigate("/wallet/connect?redirect=/profile")}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200"
            >
              Connect Wallet
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
