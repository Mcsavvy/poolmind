export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};

export const hasStacksWallet = (): boolean => {
  return typeof window !== "undefined" && "StacksProvider" in window;
};

export const isXverseInstalled = (): boolean => {
  return typeof window !== "undefined" && "XverseProviders" in window;
};

export const generateXverseDeepLink = (url: string): string => {
  const encodedUrl = encodeURIComponent(url);
  return `https://connect.xverse.app/browser?url=${encodedUrl}`;
};

export const openXverseDeepLink = (url: string): void => {
  const deepLink = generateXverseDeepLink(url);

  // Try to open the deep link
  window.location.href = deepLink;

  // Fallback: if the deep link doesn't work after a timeout,
  // redirect to Xverse app store
  setTimeout(() => {
    // Check if the user is still on the page (deep link didn't work)
    if (!document.hidden) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const storeUrl = isIOS
        ? "https://apps.apple.com/app/xverse-wallet/id1552792205"
        : "https://play.google.com/store/apps/details?id=com.secretkeylabs.xverse";

      if (
        confirm(
          "Xverse wallet is not installed. Would you like to download it?",
        )
      ) {
        window.open(storeUrl, "_blank");
      }
    }
  }, 2000);
};

export const getCompatibleWallets = () => {
  return [
    {
      name: "Xverse",
      url: "https://www.xverse.app/",
      mobile: true,
      browser: true,
    },
    {
      name: "Leather (formerly Hiro Wallet)",
      url: "https://leather.io/",
      mobile: true,
      browser: true,
    },
  ];
};
