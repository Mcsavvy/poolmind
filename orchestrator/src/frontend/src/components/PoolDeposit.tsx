import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isConnected, getLocalStorage } from "@stacks/connect";
import { depositToPool } from "../utils/contract";
import { getUserBalances, getPoolState } from "../utils/api";
import {
  submitTransaction,
  pollTransactionStatus,
} from "../utils/transactions";
import config from "../config";
import type { PoolState } from "../utils/api";

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

const PoolDeposit: React.FC = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [stxAmount, setStxAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [poolInfo, setPoolInfo] = useState<PoolState | null>(null);
  const [poolInfoLoading, setPoolInfoLoading] = useState(true);

  // Check wallet connection status
  useEffect(() => {
    const checkConnection = () => {
      if (isConnected()) {
        const userData = getLocalStorage();
        if (userData?.addresses?.stx?.[0]?.address) {
          setWalletAddress(userData.addresses.stx[0].address);
        }
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    const fetchPoolInfo = async () => {
      try {
        setPoolInfoLoading(true);
        const result = await getPoolState();
        if (result.success && result.data) {
          setPoolInfo(result.data);
        } else {
          setError("Failed to fetch pool information.");
        }
      } catch (err: unknown) {
        console.error("Pool info fetch error:", err);
        setError("Failed to fetch pool information.");
      } finally {
        setPoolInfoLoading(false);
      }
    };
    fetchPoolInfo();
  }, []);

  // Fetch user balances
  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;

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
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchBalances();
    }
  }, [walletAddress, fetchBalances]);

  // Calculate estimated PLMD tokens to receive
  const calculateEstimatedTokens = (stx: string): string => {
    if (!stx || parseFloat(stx) <= 0 || !poolInfo) return "0";

    const stxAmount = parseFloat(stx); // User input in STX
    const navInStx = poolInfo.nav / 1_000_000; // Convert NAV from uSTX to STX
    const feeRate = poolInfo.entryFee / 1000; // Convert fee rate from basis points to decimal

    // Calculate fee and net amount (in STX)
    const fee = stxAmount * feeRate;
    const netAmount = stxAmount - fee;

    // Calculate tokens to receive: net STX amount / NAV (STX per token)
    const tokens = netAmount / navInStx;

    return tokens.toFixed(6);
  };

  // Calculate entry fee
  const calculateFee = (stx: string): string => {
    if (!stx || parseFloat(stx) <= 0 || !poolInfo) return "0";

    const stxAmount = parseFloat(stx); // User input in STX
    const feeRate = poolInfo.entryFee / 1000; // Convert fee rate from basis points to decimal
    const fee = stxAmount * feeRate;

    return fee.toFixed(6);
  };

  // Handle deposit transaction
  const handleDeposit = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    if (!stxAmount || parseFloat(stxAmount) <= 0) {
      setError("Please enter a valid STX amount");
      return;
    }

    const stxAmountNum = parseFloat(stxAmount);
    const availableStx = balances?.stx
      ? parseFloat(balances.stx.balanceFormatted)
      : 0;

    if (stxAmountNum > availableStx) {
      setError("Insufficient STX balance");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxStatus(null);
      setTxId(null);

      // Convert STX to micro-STX (multiply by 1,000,000)
      const microStxAmount = Math.floor(stxAmountNum * 1000000).toString();

      const result = await depositToPool(microStxAmount);

      if (result.txid) {
        setTxId(result.txid);
        setSuccess(`Transaction submitted. Now waiting for confirmation...`);
        setStxAmount(""); // Clear the form

        // Submit transaction to backend for monitoring
        const stxAmountForBackend = parseFloat(stxAmount);
        const fee = parseFloat(calculateFee(stxAmount));
        const netAmount = stxAmountForBackend - fee;
        const plmdAmount = parseFloat(calculateEstimatedTokens(stxAmount));

        const submitResult = await submitTransaction({
          txId: result.txid,
          type: "deposit",
          stxAmount: stxAmountForBackend,
          plmdAmount: plmdAmount,
          nav: poolInfo?.nav,
          fee: fee,
          netAmount: netAmount,
        });

        if (!submitResult.success) {
          console.warn(
            "Failed to submit transaction to backend:",
            submitResult.error,
          );
          // Continue with polling anyway for backward compatibility
        }

        // Poll transaction status using backend API
        pollTransactionStatus(result.txid, (status) => {
          setTxStatus(`Transaction is ${status}...`);
        })
          .then((pollResult) => {
            if (pollResult.status === "success") {
              setSuccess("Deposit confirmed successfully!");
              fetchBalances(); // Refresh balances on success
            } else if (pollResult.status === "failed") {
              setError("Deposit transaction failed to confirm.");
            } else if (pollResult.status === "timeout") {
              setError(
                "Transaction polling timed out. Please check the explorer for status.",
              );
            }
            setTxStatus(null);
          })
          .catch((err) => {
            console.error("Polling error:", err);
            if (err instanceof Error && err.message.includes("timed out")) {
              setError(
                "Transaction polling timed out. Please check the explorer for status.",
              );
            } else {
              setError("An error occurred while monitoring the transaction.");
            }
            setTxStatus(null);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setError("Transaction failed - no transaction ID received");
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error("Deposit error:", err);
      setError(err instanceof Error ? err.message : "Failed to deposit STX");
      setLoading(false);
    }
  };

  // Handle max amount
  const handleMaxAmount = () => {
    if (balances?.stx) {
      const maxAmount = parseFloat(balances.stx.balanceFormatted);
      // Leave a small buffer for transaction fees
      const safeAmount = Math.max(0, maxAmount - 0.1);
      setStxAmount(safeAmount.toFixed(6));
    }
  };

  const formatBalance = (balance: TokenBalance) => {
    const amount = parseFloat(balance.balanceFormatted);
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
          <h2 className="mb-4 text-gray-800 text-2xl font-semibold">
            🔒 Wallet Not Connected
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to deposit STX into the pool.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/wallet/connect?redirect=/pool/deposit")}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200"
            >
              Connect Wallet
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            💰 Deposit to PoolMind
          </h2>
          <p className="text-gray-600">Deposit STX to receive PLMD tokens</p>
        </div>

        {/* Pool Information */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Pool Information</h3>
          {poolInfoLoading ? (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          ) : poolInfo ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Current NAV:</span>
                <span className="font-mono">
                  {poolInfo.navFormatted} STX per PLMD
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Value Locked:</span>
                <span className="font-mono">
                  {poolInfo.stxBalanceFormatted} STX
                </span>
              </div>
              <div className="flex justify-between">
                <span>Entry Fee:</span>
                <span className="font-mono">{poolInfo.entryFeeFormatted}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Unable to load pool information
            </p>
          )}
        </div>

        {/* Current Balances */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Your Balances</h3>
          {balanceLoading ? (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          ) : balances ? (
            <div className="space-y-2">
              {balances.stx && (
                <div className="flex justify-between text-sm">
                  <span>STX:</span>
                  <span className="font-mono">
                    {formatBalance(balances.stx)}
                  </span>
                </div>
              )}
              {balances.plmd && (
                <div className="flex justify-between text-sm">
                  <span>PLMD:</span>
                  <span className="font-mono">
                    {formatBalance(balances.plmd)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Unable to load balances</p>
          )}
        </div>

        {/* Deposit Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              STX Amount to Deposit
            </label>
            <div className="relative">
              <input
                type="number"
                value={stxAmount}
                onChange={(e) => setStxAmount(e.target.value)}
                placeholder="0.000000"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.000001"
                min="0"
                disabled={loading}
              />
              <button
                onClick={handleMaxAmount}
                disabled={loading || !balances?.stx}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-xs transition-all duration-200"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Transaction Summary */}
          {stxAmount && parseFloat(stxAmount) > 0 && poolInfo && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">
                Transaction Summary
              </h4>
              <div className="space-y-1 text-sm text-blue-700">
                <div className="flex justify-between">
                  <span>STX Deposit:</span>
                  <span className="font-mono">
                    {parseFloat(stxAmount).toFixed(6)} STX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Entry Fee ({poolInfo.entryFeeFormatted}):</span>
                  <span className="font-mono">
                    {calculateFee(stxAmount)} STX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Net Amount:</span>
                  <span className="font-mono">
                    {(
                      parseFloat(stxAmount) -
                      parseFloat(calculateFee(stxAmount))
                    ).toFixed(6)}{" "}
                    STX
                  </span>
                </div>
                <hr className="border-blue-200" />
                <div className="flex justify-between font-semibold">
                  <span>PLMD Tokens to Receive:</span>
                  <span className="font-mono">
                    {calculateEstimatedTokens(stxAmount)} PLMD
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {txStatus && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg text-sm">
              <p>{txStatus}</p>
              {txId && (
                <a
                  href={`https://explorer.hiro.so/txid/${txId}?chain=${config.stacksNetwork}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline mt-1 inline-block"
                >
                  View on Explorer
                </a>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white border-none py-3 px-5 rounded-lg text-sm cursor-pointer transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              disabled={loading || !stxAmount || parseFloat(stxAmount) <= 0}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white border-none py-3 px-5 rounded-lg text-sm cursor-pointer transition-all duration-200"
            >
              {loading ? "Processing..." : "Deposit STX"}
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Deposits are processed immediately on the Stacks blockchain.</p>
          <p>Make sure you have enough STX for transaction fees.</p>
        </div>
      </div>
    </div>
  );
};

export default PoolDeposit;
