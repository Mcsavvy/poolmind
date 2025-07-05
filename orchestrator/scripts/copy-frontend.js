const fs = require('fs');
const path = require('path');

// Cross-platform copy directory function
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main execution
try {
  const frontendDistPath = path.join(__dirname, '../src/frontend/dist');
  const backendPublicPath = path.join(__dirname, '../dist/public');

  console.log('🚀 Copying frontend files for production...');
  console.log(`   From: ${frontendDistPath}`);
  console.log(`   To: ${backendPublicPath}`);

  if (!fs.existsSync(frontendDistPath)) {
    console.error('❌ Frontend dist directory not found. Please run "npm run build:frontend" first.');
    process.exit(1);
  }

  copyDir(frontendDistPath, backendPublicPath);
  console.log('✅ Frontend files copied successfully!');
} catch (error) {
  console.error('❌ Error copying frontend files:', error.message);
  process.exit(1);
} 