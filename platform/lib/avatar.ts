// Generate a unique avatar based on wallet address
export function generateWalletAvatar(walletAddress: string): string {
  // Create a hash from the wallet address
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    const char = walletAddress.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate colors based on the hash
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 180) % 360; // Complementary color
  const saturation = 60 + (Math.abs(hash) % 40); // 60-100%
  const lightness = 45 + (Math.abs(hash) % 20); // 45-65%

  // Create SVG with unique pattern
  const pattern = hash % 4; // 4 different patterns
  const size = 100;
  
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Background
  svg += `<rect width="${size}" height="${size}" fill="hsl(${hue1}, ${saturation}%, ${lightness}%)"/>`;
  
  switch (pattern) {
    case 0: // Circles
      svg += `<circle cx="30" cy="30" r="15" fill="hsl(${hue2}, ${saturation}%, ${lightness}%)"/>`;
      svg += `<circle cx="70" cy="70" r="12" fill="hsl(${hue2}, ${saturation}%, ${lightness}%)"/>`;
      svg += `<circle cx="70" cy="30" r="8" fill="hsl(${hue2}, ${saturation}%, ${lightness}%)"/>`;
      break;
    case 1: // Triangles
      svg += `<polygon points="50,20 30,60 70,60" fill="hsl(${hue2}, ${saturation}%, ${lightness}%)"/>`;
      svg += `<polygon points="50,80 35,50 65,50" fill="hsl(${hue2}, ${saturation}%, ${lightness}%)"/>`;
      break;
    case 2: // Squares
      svg += `<rect x="20" y="20" width="25" height="25" fill="hsl(${hue2}, ${saturation}%, ${lightness}%)"/>`;
      svg += `<rect x="55" y="55" width="20" height="20" fill="hsl(${hue2}, ${saturation}%, ${lightness}%)"/>`;
      svg += `<rect x="60" y="25" width="15" height="15" fill="hsl(${hue2}, ${saturation}%, ${lightness}%)"/>`;
      break;
    case 3: // Lines
      svg += `<line x1="20" y1="30" x2="80" y2="30" stroke="hsl(${hue2}, ${saturation}%, ${lightness}%)" stroke-width="8"/>`;
      svg += `<line x1="20" y1="60" x2="80" y2="60" stroke="hsl(${hue2}, ${saturation}%, ${lightness}%)" stroke-width="8"/>`;
      svg += `<line x1="20" y1="45" x2="80" y2="45" stroke="hsl(${hue2}, ${saturation}%, ${lightness}%)" stroke-width="4"/>`;
      break;
  }
  
  svg += '</svg>';
  
  // Convert to data URL
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Generate initials for wallet address (fallback)
export function getWalletInitials(walletAddress: string): string {
  if (!walletAddress) return 'U';
  
  // Take first 2 characters of the address
  return walletAddress.slice(0, 2).toUpperCase();
}

// Get a consistent color for the wallet address
export function getWalletColor(walletAddress: string): string {
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    const char = walletAddress.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 40);
  const lightness = 45 + (Math.abs(hash) % 20);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
} 