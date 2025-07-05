import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  connect,
  disconnect,
  isConnected,
  getLocalStorage,
} from "@stacks/connect";
import {
  isMobile,
  hasStacksWallet,
  isXverseInstalled,
  openXverseDeepLink,
  getCompatibleWallets,
} from "../utils/mobile";
import {
  linkWalletAddress,
  getUserProfile,
  setAuthToken,
  getAuthToken,
} from "../utils/api";
import type { WalletState } from "../types/wallet";

const NETWORK = import.meta.env.VITE_STACKS_NETWORK || "mainnet";

const WalletConnect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    publicKey: null,
    network: null,
    loading: false,
    error: null,
  });
  const [showMobileInstructions, setShowMobileInstructions] = useState(false);
  const [copyableUrl, setCopyableUrl] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const accessToken = searchParams.get("access_token");
  const redirectUrl = searchParams.get("redirect") || "/profile";
  const mobile = isMobile();
  const hasWallet = hasStacksWallet();
  const xverseInstalled = isXverseInstalled();
  const compatibleWallets = getCompatibleWallets();

  // Check authentication status on component mount
  const checkAuthStatus = useCallback(async () => {
    try {
      setAuthChecked(false);

      // If access_token is provided in URL, store it in localStorage
      if (accessToken) {
        setAuthToken(accessToken);
      }

      // Check if user has a valid auth token and can fetch profile
      const token = getAuthToken();
      if (token) {
        const profileResult = await getUserProfile();
        if (profileResult.success) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          // If we can't fetch profile, redirect to unauthenticated page
          navigate("/auth/login");
          return;
        }
      } else {
        setIsAuthenticated(false);
        // No token available, redirect to unauthenticated page
        navigate("/auth/login");
        return;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      navigate("/auth/login");
    } finally {
      setAuthChecked(true);
    }
  }, [accessToken, navigate]);

  const linkWalletToProfile = useCallback(async (address: string) => {
    try {
      const result = await linkWalletAddress(address);

      if (!result.success) {
        throw new Error(result.error || "Failed to link wallet address");
      }

      return result;
    } catch (error) {
      console.error("Wallet linking error:", error);
      setWalletState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to link wallet",
      }));
      throw error;
    }
  }, []);

  const checkConnectionStatus = useCallback(async () => {
    try {
      if (isConnected()) {
        // Get stored user data using getLocalStorage()
        const userData = getLocalStorage();

        if (userData?.addresses?.stx?.[0]?.address) {
          const address = userData.addresses.stx[0].address;

          setWalletState({
            isConnected: true,
            address: address,
            publicKey: "", // publicKey not available in localStorage
            network: NETWORK,
            loading: false,
            error: null,
          });

          // Link wallet to profile if we are authenticated
          if (isAuthenticated) {
            await linkWalletToProfile(address);
          }

          // If user is already connected and came from another page, redirect them
          if (redirectUrl && redirectUrl !== "/wallet/connect") {
            setTimeout(() => {
              navigate(redirectUrl);
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
    }
  }, [isAuthenticated, linkWalletToProfile, navigate, redirectUrl]);

  useEffect(() => {
    // First check authentication status
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    // Only proceed with wallet logic if authentication is checked and user is authenticated
    if (!authChecked || !isAuthenticated) {
      return;
    }

    // Set the copyable URL for mobile wallets
    setCopyableUrl(window.location.href);

    // Auto-connect logic
    if (mobile && !hasWallet) {
      setShowMobileInstructions(true);
    }

    // Check if user is already connected using the new isConnected() function
    checkConnectionStatus();
  }, [authChecked, isAuthenticated, mobile, hasWallet, checkConnectionStatus]);

  const handleConnect = async () => {
    if (!isAuthenticated) {
      setWalletState((prev) => ({
        ...prev,
        error: "Authentication required",
      }));
      return;
    }

    setWalletState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Use the new connect() function from the Hiro docs

      const response = await connect();

      // The response contains the user's addresses
      console.log("Wallet connection response:", response);

      // Get the connected address from the response or localStorage
      const userData = getLocalStorage();
      if (userData?.addresses?.stx?.[0]?.address) {
        const address = userData.addresses.stx[0].address;

        try {
          // Link wallet to user profile
          await linkWalletToProfile(address);

          setWalletState({
            isConnected: true,
            address: address,
            publicKey: "", // publicKey not available in localStorage
            network: NETWORK,
            loading: false,
            error: null,
          });

          alert("Wallet connected successfully!");

          // Redirect to the specified URL after successful connection
          setTimeout(() => {
            navigate(redirectUrl);
          }, 2000);
        } catch (linkError) {
          console.error("Wallet linking error:", linkError);
          setWalletState((prev) => ({
            ...prev,
            loading: false,
            error:
              linkError instanceof Error
                ? linkError.message
                : "Failed to link wallet",
          }));
        }
      } else {
        throw new Error("No wallet address found after connection");
      }
    } catch (connectError) {
      console.error("Wallet connection error:", connectError);
      setWalletState((prev) => ({
        ...prev,
        loading: false,
        error:
          connectError instanceof Error
            ? connectError.message
            : "Connection failed",
      }));
    }
  };

  const handleDisconnect = () => {
    // Use the disconnect() function to clear local storage and selected wallet
    disconnect();
    setWalletState({
      isConnected: false,
      address: null,
      publicKey: null,
      network: null,
      loading: false,
      error: null,
    });
  };

  const handleMobileConnect = () => {
    if (xverseInstalled) {
      openXverseDeepLink(window.location.href);
    } else {
      alert("Please install Xverse wallet first, then return to this page.");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("URL copied to clipboard!");
    } catch (error: unknown) {
      console.error("Error copying to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("URL copied to clipboard!");
    }
  };

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, this will be handled by redirect to /auth/login
  // But just in case, show error
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
          <h2 className="mb-4 text-gray-800 text-2xl font-semibold">
            ❌ Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need to be authenticated to connect your wallet.
          </p>
          <button
            onClick={() => navigate("/auth/login")}
            className="bg-blue-500 hover:bg-blue-600 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (walletState.isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
          <h2 className="mb-4 text-gray-800 text-2xl font-semibold">
            ✅ Wallet Connected Successfully!
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg my-5 text-left">
            <p className="my-2 font-mono text-sm break-all">
              <strong>Address:</strong> {walletState.address}
            </p>
            <p className="my-2 font-mono text-sm break-all">
              <strong>Network:</strong> {walletState.network}
            </p>
            {walletState.publicKey && (
              <p className="my-2 font-mono text-xs break-all">
                <strong>Public Key:</strong>{" "}
                {walletState.publicKey.substring(0, 20)}...
              </p>
            )}
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your wallet address has been linked to your profile.
            {redirectUrl && redirectUrl !== "/wallet/connect"
              ? " You will be redirected shortly."
              : " You can now close this window."}
          </p>
          <button
            onClick={handleDisconnect}
            className="bg-red-500 hover:bg-red-600 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (showMobileInstructions && mobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
          <h2 className="mb-4 text-gray-800 text-2xl font-semibold">
            🔗 Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            We detected you're on a mobile device.
          </p>

          {xverseInstalled ? (
            <div className="mb-6">
              <p className="text-green-600 mb-4">✅ Xverse wallet detected!</p>
              <button
                onClick={handleMobileConnect}
                className="bg-orange-500 hover:bg-orange-600 text-white border-none py-3 px-6 rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 w-full mb-3 hover:-translate-y-0.5"
              >
                Open in Xverse Wallet
              </button>
            </div>
          ) : (
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Option 1: Install Xverse Wallet
              </h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                ⚠️ You need to have Xverse wallet installed to use this feature.
              </p>
              <button
                onClick={() => {
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  const storeUrl = isIOS
                    ? "https://apps.apple.com/app/xverse-wallet/id1552792205"
                    : "https://play.google.com/store/apps/details?id=com.secretkeylabs.xverse";
                  window.open(storeUrl, "_blank");
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white border-none py-2.5 px-5 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 mx-2 mb-4"
              >
                Install Xverse Wallet
              </button>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Option 2: Use Another Compatible Wallet
              </h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                If you have another Stacks-compatible wallet, copy this URL and
                paste it in your wallet's browser:
              </p>
              <div className="flex mb-4 gap-2">
                <input
                  type="text"
                  value={copyableUrl}
                  readOnly
                  className="flex-1 p-2 border border-gray-300 rounded-md text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(copyableUrl)}
                  className="bg-blue-500 hover:bg-blue-600 text-white border-none py-2 px-4 rounded-md text-sm cursor-pointer"
                >
                  Copy URL
                </button>
              </div>

              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3">
                  Compatible Wallets:
                </h4>
                <ul className="list-none p-0 m-0">
                  {compatibleWallets.map((wallet, index) => (
                    <li
                      key={index}
                      className="my-2 flex items-center justify-between"
                    >
                      <a
                        href={wallet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 no-underline font-medium hover:underline"
                      >
                        {wallet.name}
                      </a>
                      <div>
                        {wallet.mobile && (
                          <span className="bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs ml-2">
                            Mobile
                          </span>
                        )}
                        {wallet.browser && (
                          <span className="bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs ml-2">
                            Browser
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowMobileInstructions(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200 mx-2"
          >
            ← Back to Desktop View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
        <h2 className="mb-4 text-gray-800 text-2xl font-semibold">
          🔗 Connect Your Stacks Wallet
        </h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Connect your wallet to authenticate with PoolMind.
        </p>

        {walletState.error && (
          <div className="bg-red-100 text-red-600 py-3 px-4 rounded-lg mb-5 border border-red-200">
            ⚠️ {walletState.error}
          </div>
        )}

        <div className="mb-6">
          {hasWallet ? (
            <button
              onClick={handleConnect}
              disabled={walletState.loading || !isAuthenticated}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white border-none py-3 px-6 rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 w-full mb-3 hover:-translate-y-0.5 disabled:transform-none"
            >
              {walletState.loading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <div className="text-left">
              <p className="text-gray-600 mb-4 leading-relaxed">
                ⚠️ No Stacks wallet detected in your browser.
              </p>
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3">
                  Install a Stacks Wallet:
                </h4>
                <ul className="list-none p-0 m-0">
                  {compatibleWallets
                    .filter((w) => w.browser)
                    .map((wallet, index) => (
                      <li key={index} className="my-2">
                        <a
                          href={wallet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 no-underline font-medium hover:underline"
                        >
                          Install {wallet.name}
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 hover:bg-gray-700 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200 mx-2"
              >
                Refresh Page After Installation
              </button>

              {mobile && (
                <button
                  onClick={() => setShowMobileInstructions(true)}
                  className="bg-gray-600 hover:bg-gray-700 text-white border-none py-2.5 px-5 rounded-md text-sm cursor-pointer transition-all duration-200 mx-2"
                >
                  Mobile Wallet Options
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
