// Generate a unique avatar using Dicebear Lorelei collection with themed gradients
export function generateWalletAvatar(walletAddress: string): string {
  // Create a hash from the wallet address for deterministic results
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    const char = walletAddress.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // App theme colors (orange/amber palette)
  const themeGradients = [
    // Primary orange gradients
    ['ff9800', 'ffc107'], // Orange to Amber
    ['f57c00', 'ff9800'], // Dark Orange to Orange
    ['ff8f00', 'ffb300'], // Amber variants
    
    // Secondary warm gradients
    ['f4511e', 'ff6f00'], // Deep Orange variants
    ['e65100', 'f57c00'], // Dark Orange spectrum
    ['ffb300', 'ffd54f'], // Light Amber range
    
    // Complementary warm gradients
    ['ff9800', 'e8a100'], // Orange with darker tone
    ['ffc107', 'fff176'], // Amber to light yellow
  ];

  // Select gradient based on hash
  const gradientIndex = Math.abs(hash) % themeGradients.length;
  const [color1, color2] = themeGradients[gradientIndex];
  
  // Generate rotation angle (0-360 degrees)
  const rotation = Math.abs(hash) % 360;
  
  // Use wallet address as seed for consistent avatars
  const seed = walletAddress;
  
  // Build Dicebear Lorelei API URL with gradient background
  const params = new URLSearchParams({
    seed: seed,
    backgroundColor: `${color1},${color2}`,
    backgroundType: 'gradientLinear',
    backgroundRotation: `${rotation}`,
    size: '100',
    // Add some variety to the avatar features
    flip: (Math.abs(hash) % 2 === 0).toString(),
  });
  
  return `https://api.dicebear.com/9.x/lorelei/svg?${params.toString()}`;
}

// Generate initials for wallet address (fallback)
export function getWalletInitials(walletAddress: string): string {
  if (!walletAddress) return 'U';
  
  // Take first 2 characters of the address
  return walletAddress.slice(0, 2).toUpperCase();
}

// Get a consistent color for the wallet address that matches app theme
export function getWalletColor(walletAddress: string): string {
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    const char = walletAddress.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // App theme colors - matches the gradient colors used in avatars
  const themeColors = [
    '#ff9800', // Primary orange
    '#ffc107', // Primary amber
    '#f57c00', // Dark orange
    '#ff8f00', // Amber variant
    '#f4511e', // Deep orange
    '#ffb300', // Light amber
    '#e65100', // Dark orange
    '#ff6f00', // Orange variant
  ];
  
  const colorIndex = Math.abs(hash) % themeColors.length;
  return themeColors[colorIndex];
} 