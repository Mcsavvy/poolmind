const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load backend environment variables
const backendEnvPath = path.join(__dirname, '../.env');
const frontendEnvPath = path.join(__dirname, '../src/frontend/.env.production.local');

// Environment variable mapping from backend to frontend
const ENV_MAPPING = {
  'STACKS_NETWORK': 'VITE_STACKS_NETWORK',
  'POOLMIND_CONTRACT_ADDRESS': 'VITE_POOLMIND_CONTRACT_ADDRESS',
  'POOLMIND_CONTRACT_NAME': 'VITE_POOLMIND_CONTRACT_NAME',
};

// Default values for frontend-specific variables
const FRONTEND_DEFAULTS = {
  'VITE_API_PREFIX': 'api/v1',
};

function propagateEnvVars() {
  console.log('🔄 Propagating environment variables from backend to frontend...');
  
  // Check if backend .env file exists
  if (!fs.existsSync(backendEnvPath)) {
    console.warn('⚠️  Backend .env file not found. Skipping environment propagation.');
    return;
  }
  
  // Load backend environment variables
  const backendEnv = dotenv.config({ path: backendEnvPath });
  
  if (backendEnv.error) {
    console.error('❌ Error loading backend environment variables:', backendEnv.error.message);
    process.exit(1);
  }
  
  const backendVars = backendEnv.parsed || {};
  const frontendVars = { ...FRONTEND_DEFAULTS };
  
  // Map backend variables to frontend variables
  Object.entries(ENV_MAPPING).forEach(([backendKey, frontendKey]) => {
    if (backendVars[backendKey]) {
      frontendVars[frontendKey] = backendVars[backendKey];
      console.log(`   ✓ ${backendKey} → ${frontendKey}`);
    }
  });
  
  // Create frontend .env content
  const frontendEnvContent = Object.entries(frontendVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Write frontend .env file
  try {
    fs.writeFileSync(frontendEnvPath, frontendEnvContent);
    console.log(`✅ Frontend environment variables written to: ${frontendEnvPath}`);
    console.log('📝 Generated frontend .env file:');
    console.log(frontendEnvContent);
  } catch (error) {
    console.error('❌ Error writing frontend .env file:', error.message);
    process.exit(1);
  }
}

// Add validation function
function validateRequiredVars() {
  const requiredBackendVars = [
    'POOLMIND_CONTRACT_ADDRESS',
    'POOLMIND_CONTRACT_NAME',
    'STACKS_NETWORK'
  ];
  
  const backendEnv = dotenv.config({ path: backendEnvPath });
  const backendVars = backendEnv.parsed || {};
  
  const missingVars = requiredBackendVars.filter(varName => !backendVars[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required backend environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  try {
    validateRequiredVars();
    propagateEnvVars();
  } catch (error) {
    console.error('❌ Error propagating environment variables:', error.message);
    process.exit(1);
  }
}

module.exports = { propagateEnvVars, ENV_MAPPING, FRONTEND_DEFAULTS }; 