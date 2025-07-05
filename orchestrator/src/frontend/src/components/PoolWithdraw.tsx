import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isConnected, getLocalStorage } from "@stacks/connect";
import { withdrawFromPool } from "../utils/contract";
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

const PoolWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [plmdAmount, setPlmdAmount] = useState<string>("");
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

  // Calculate estimated STX to receive
  const calculateEstimatedStx = (plmd: string): string => {
    if (!plmd || parseFloat(plmd) <= 0 || !poolInfo) return "0";

    const plmdAmount = parseFloat(plmd); // User input in PLMD
    const navInStx = poolInfo.nav / 1_000_000; // Convert NAV from uSTX to STX
    const feeRate = poolInfo.exitFee / 1000; // Convert fee rate from basis points to decimal

    // Calculate gross STX value (PLMD * NAV in STX)
    const grossStx = plmdAmount * navInStx;

    // Calculate fee and net amount (in STX)
    const fee = grossStx * feeRate;
    const netStx = grossStx - fee;

    return netStx.toFixed(6);
  };

  // Calculate exit fee
  const calculateFee = (plmd: string): string => {
    if (!plmd || parseFloat(plmd) <= 0 || !poolInfo) return "0";

    const plmdAmount = parseFloat(plmd); // User input in PLMD
    const navInStx = poolInfo.nav / 1_000_000; // Convert NAV from uSTX to STX
    const feeRate = poolInfo.exitFee / 1000; // Convert fee rate from basis points to decimal

    const grossStx = plmdAmount * navInStx;
    const fee = grossStx * feeRate;

    return fee.toFixed(6);
  };

  // Handle withdraw transaction
  const handleWithdraw = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    if (!plmdAmount || parseFloat(plmdAmount) <= 0) {
      setError("Please enter a valid PLMD amount");
      return;
    }

    const plmdAmountNum = parseFloat(plmdAmount);
    const availablePlmd = balances?.plmd
      ? parseFloat(balances.plmd.balanceFormatted)
      : 0;

    if (plmdAmountNum > availablePlmd) {
      setError("Insufficient PLMD balance");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxStatus(null);
      setTxId(null);

      // Convert PLMD to micro-PLMD (multiply by 1,000,000)
      const microPlmdAmount = Math.floor(plmdAmountNum * 1000000).toString();

      const result = await withdrawFromPool(microPlmdAmount);

      if (result.txid) {
        setTxId(result.txid);
        setSuccess(`Transaction submitted. Now waiting for confirmation...`);
        setPlmdAmount(""); // Clear the form

        // Submit transaction to backend for monitoring
        const plmdAmountForBackend = parseFloat(plmdAmount);
        const grossStx =
          parseFloat(calculateEstimatedStx(plmdAmount)) +
          parseFloat(calculateFee(plmdAmount));
        const fee = parseFloat(calculateFee(plmdAmount));
        const netStx = parseFloat(calculateEstimatedStx(plmdAmount));

        const submitResult = await submitTransaction({
          txId: result.txid,
          type: "withdrawal",
          stxAmount: grossStx,
          plmdAmount: plmdAmountForBackend,
          nav: poolInfo?.nav,
          fee: fee,
          netAmount: netStx,
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
              setSuccess("Withdrawal confirmed successfully!");
              fetchBalances(); // Refresh balances on success
            } else if (pollResult.status === "failed") {
              setError("Withdrawal transaction failed to confirm.");
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
      console.error("Withdraw error:", err);
      setError(err instanceof Error ? err.message : "Failed to withdraw PLMD");
      setLoading(false);
    }
  };

  // Handle max amount
  const handleMaxAmount = () => {
    if (balances?.plmd) {
      const maxAmount = parseFloat(balances.plmd.balanceFormatted);
      setPlmdAmount(maxAmount.toFixed(6));
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
            Please connect your wallet to withdraw from the pool.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() =>
                navigate("/wallet/connect?redirect=/pool/withdraw")
              }
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
            💸 Withdraw from PoolMind
          </h2>
          <p className="text-gray-600">Burn PLMD tokens to receive STX</p>
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
                <span>Exit Fee:</span>
                <span className="font-mono">{poolInfo.exitFeeFormatted}</span>
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
              {balances.plmd && (
                <div className="flex justify-between text-sm">
                  <span>PLMD:</span>
                  <span className="font-mono">
                    {formatBalance(balances.plmd)}
                  </span>
                </div>
              )}
              {balances.stx && (
                <div className="flex justify-between text-sm">
                  <span>STX:</span>
                  <span className="font-mono">
                    {formatBalance(balances.stx)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Unable to load balances</p>
          )}
        </div>

        {/* Withdraw Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PLMD Amount to Withdraw
            </label>
            <div className="relative">
              <input
                type="number"
                value={plmdAmount}
                onChange={(e) => setPlmdAmount(e.target.value)}
                placeholder="0.000000"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.000001"
                min="0"
                disabled={loading}
              />
              <button
                onClick={handleMaxAmount}
                disabled={loading || !balances?.plmd}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-xs transition-all duration-200"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Transaction Summary */}
          {plmdAmount && parseFloat(plmdAmount) > 0 && poolInfo && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">
                Transaction Summary
              </h4>
              <div className="space-y-1 text-sm text-red-700">
                <div className="flex justify-between">
                  <span>PLMD to Burn:</span>
                  <span className="font-mono">
                    {parseFloat(plmdAmount).toFixed(6)} PLMD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gross STX Value:</span>
                  <span className="font-mono">
                    {(
                      parseFloat(plmdAmount) *
                      (poolInfo.nav / 1_000_000)
                    ).toFixed(6)}{" "}
                    STX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Exit Fee ({poolInfo.exitFeeFormatted}):</span>
                  <span className="font-mono">
                    {calculateFee(plmdAmount)} STX
                  </span>
                </div>
                <hr className="border-red-200" />
                <div className="flex justify-between font-semibold">
                  <span>STX to Receive:</span>
                  <span className="font-mono">
                    {calculateEstimatedStx(plmdAmount)} STX
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

          {/* Warning for first-time users */}
          {!balances?.plmd ||
          parseFloat(balances.plmd.balanceFormatted) === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 p-3 rounded-lg text-sm">
              <strong>Note:</strong> You don't have any PLMD tokens to withdraw.
              You need to deposit STX first to receive PLMD tokens.
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white border-none py-3 px-5 rounded-lg text-sm cursor-pointer transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleWithdraw}
              disabled={
                loading ||
                !plmdAmount ||
                parseFloat(plmdAmount) <= 0 ||
                !balances?.plmd ||
                parseFloat(balances.plmd.balanceFormatted) === 0
              }
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white border-none py-3 px-5 rounded-lg text-sm cursor-pointer transition-all duration-200"
            >
              {loading ? "Processing..." : "Withdraw STX"}
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Withdrawals are processed immediately on the Stacks blockchain.</p>
          <p>PLMD tokens will be permanently burned upon withdrawal.</p>
        </div>
      </div>
    </div>
  );
};

export default PoolWithdraw;
