#!/usr/bin/env node

/**
 * HMAC Signature Generator for Fund Request API
 * 
 * This script generates HMAC signatures for testing the fund request endpoint.
 * It follows the same signature format as the server expects.
 */

const crypto = require('crypto');

// Configuration
const HMAC_SECRET = process.env.HMAC_SECRET || 'your-hmac-secret-key-here';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Generate HMAC signature for a request
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} url - Full URL path
 * @param {string} timestamp - Timestamp in milliseconds
 * @param {string} body - Request body as string
 * @param {string} secret - HMAC secret key
 * @returns {string} HMAC signature
 */
function generateHmacSignature(method, url, timestamp, body, secret) {
  const message = `${method}${url}${timestamp}${body}`;
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

/**
 * Generate fund request signature
 * @param {Object} payload - Request payload
 * @param {string} payload.recipientAddress - STX address to receive funds
 * @param {number} payload.amount - Amount in STX
 * @param {string} [payload.memo] - Optional memo
 * @returns {Object} Request data with signature
 */
function generateFundRequestSignature(payload) {
  const method = 'POST';
  const url = '/api/v1/fund-request';
  const timestamp = Date.now().toString();
  const body = JSON.stringify(payload);
  
  const signature = generateHmacSignature(method, url, timestamp, body, HMAC_SECRET);
  
  return {
    url: `${API_BASE_URL}${url}`,
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-signature': `sha256=${signature}`,
      'x-timestamp': timestamp,
    },
    body: payload,
  };
}

/**
 * Generate admin info request signature
 * @returns {Object} Request data with signature
 */
function generateAdminInfoSignature() {
  const method = 'GET';
  const url = '/api/v1/fund-request/admin/info';
  const timestamp = Date.now().toString();
  const body = '';
  
  const signature = generateHmacSignature(method, url, timestamp, body, HMAC_SECRET);
  
  return {
    url: `${API_BASE_URL}${url}`,
    method,
    headers: {
      'x-signature': `sha256=${signature}`,
      'x-timestamp': timestamp,
    },
  };
}

/**
 * Generate signature for pool state request
 * @returns {Object} Request data with signature
 */
function generatePoolStateSignature() {
  const method = 'GET';
  const url = '/api/v1/pool/state';
  const timestamp = Date.now().toString();
  const body = '';
  
  const signature = generateHmacSignature(method, url, timestamp, body, HMAC_SECRET);
  
  return {
    url: `${API_BASE_URL}${url}`,
    method,
    headers: {
      'x-signature': `sha256=${signature}`,
      'x-timestamp': timestamp,
    },
  };
}

/**
 * Generate signature for balance by address request
 * @param {string} address - STX address to query
 * @param {string} balanceType - 'plmd', 'stx', or 'all'
 * @returns {Object} Request data with signature
 */
function generateBalanceByAddressSignature(address, balanceType = 'all') {
  const method = 'GET';
  const url = `/api/v1/balance/address/${address}/${balanceType}`;
  const timestamp = Date.now().toString();
  const body = '';
  
  const signature = generateHmacSignature(method, url, timestamp, body, HMAC_SECRET);
  
  return {
    url: `${API_BASE_URL}${url}`,
    method,
    headers: {
      'x-signature': `sha256=${signature}`,
      'x-timestamp': timestamp,
    },
  };
}

/**
 * Generate signature for queue stats request
 * @returns {Object} Request data with signature
 */
function generateQueueStatsSignature() {
  const method = 'GET';
  const url = '/api/v1/transactions/queue/stats';
  const timestamp = Date.now().toString();
  const body = '';
  
  const signature = generateHmacSignature(method, url, timestamp, body, HMAC_SECRET);
  
  return {
    url: `${API_BASE_URL}${url}`,
    method,
    headers: {
      'x-signature': `sha256=${signature}`,
      'x-timestamp': timestamp,
    },
  };
}

/**
 * Generate curl command for fund request
 * @param {Object} payload - Request payload
 * @returns {string} Curl command
 */
function generateFundRequestCurl(payload) {
  const requestData = generateFundRequestSignature(payload);
  
  return `curl -X POST "${requestData.url}" \\
  -H "Content-Type: ${requestData.headers['Content-Type']}" \\
  -H "x-signature: ${requestData.headers['x-signature']}" \\
  -H "x-timestamp: ${requestData.headers['x-timestamp']}" \\
  -d '${JSON.stringify(requestData.body)}'`;
}

/**
 * Generate curl command for admin info
 * @returns {string} Curl command
 */
function generateAdminInfoCurl() {
  const requestData = generateAdminInfoSignature();
  
  return `curl -X GET "${requestData.url}" \\
  -H "x-signature: ${requestData.headers['x-signature']}" \\
  -H "x-timestamp: ${requestData.headers['x-timestamp']}"`;
}

/**
 * Generate curl command for pool state
 * @returns {string} Curl command
 */
function generatePoolStateCurl() {
  const requestData = generatePoolStateSignature();
  
  return `curl -X GET "${requestData.url}" \\
  -H "x-signature: ${requestData.headers['x-signature']}" \\
  -H "x-timestamp: ${requestData.headers['x-timestamp']}"`;
}

/**
 * Generate curl command for balance by address
 * @param {string} address - STX address to query
 * @param {string} balanceType - 'plmd', 'stx', or 'all'
 * @returns {string} Curl command
 */
function generateBalanceByAddressCurl(address, balanceType = 'all') {
  const requestData = generateBalanceByAddressSignature(address, balanceType);
  
  return `curl -X GET "${requestData.url}" \\
  -H "x-signature: ${requestData.headers['x-signature']}" \\
  -H "x-timestamp: ${requestData.headers['x-timestamp']}"`;
}

/**
 * Generate curl command for queue stats
 * @returns {string} Curl command
 */
function generateQueueStatsCurl() {
  const requestData = generateQueueStatsSignature();
  
  return `curl -X GET "${requestData.url}" \\
  -H "x-signature: ${requestData.headers['x-signature']}" \\
  -H "x-timestamp: ${requestData.headers['x-timestamp']}"`;
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('HMAC Signature Generator for PoolMind API');
    console.log('');
    console.log('Usage:');
    console.log('  node generate-hmac-signature.js fund-request <address> <amount> [memo]');
    console.log('  node generate-hmac-signature.js admin-info');
    console.log('  node generate-hmac-signature.js pool-state');
    console.log('  node generate-hmac-signature.js balance <address> [type]');
    console.log('  node generate-hmac-signature.js queue-stats');
    console.log('');
    console.log('Environment Variables:');
    console.log('  HMAC_SECRET - HMAC secret key (required)');
    console.log('  API_BASE_URL - API base URL (default: http://localhost:3000/api/v1)');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-hmac-signature.js fund-request SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE 10.5 "Trading bot funding"');
    console.log('  node generate-hmac-signature.js admin-info');
    console.log('  node generate-hmac-signature.js pool-state');
    console.log('  node generate-hmac-signature.js balance SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE all');
    console.log('  node generate-hmac-signature.js queue-stats');
    process.exit(1);
  }
  
  const command = args[0];
  
  if (command === 'fund-request') {
    const recipientAddress = args[1];
    const amount = parseFloat(args[2]);
    const memo = args[3];
    
    if (!recipientAddress || !amount) {
      console.error('Error: recipientAddress and amount are required');
      process.exit(1);
    }
    
    const payload = {
      recipientAddress,
      amount,
      ...(memo && { memo }),
    };
    
    console.log('Fund Request Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');
    
    const requestData = generateFundRequestSignature(payload);
    console.log('Request Headers:');
    console.log(JSON.stringify(requestData.headers, null, 2));
    console.log('');
    
    console.log('Curl Command:');
    console.log(generateFundRequestCurl(payload));
    
  } else if (command === 'admin-info') {
    const requestData = generateAdminInfoSignature();
    console.log('Request Headers:');
    console.log(JSON.stringify(requestData.headers, null, 2));
    console.log('');
    
    console.log('Curl Command:');
    console.log(generateAdminInfoCurl());
    
  } else if (command === 'pool-state') {
    const requestData = generatePoolStateSignature();
    console.log('Request Headers:');
    console.log(JSON.stringify(requestData.headers, null, 2));
    console.log('');
    
    console.log('Curl Command:');
    console.log(generatePoolStateCurl());
    
  } else if (command === 'balance') {
    const address = args[1];
    const balanceType = args[2] || 'all';
    
    if (!address) {
      console.error('Error: address is required');
      process.exit(1);
    }
    
    const requestData = generateBalanceByAddressSignature(address, balanceType);
    console.log('Request Headers:');
    console.log(JSON.stringify(requestData.headers, null, 2));
    console.log('');
    
    console.log('Curl Command:');
    console.log(generateBalanceByAddressCurl(address, balanceType));
    
  } else if (command === 'queue-stats') {
    const requestData = generateQueueStatsSignature();
    console.log('Request Headers:');
    console.log(JSON.stringify(requestData.headers, null, 2));
    console.log('');
    
    console.log('Curl Command:');
    console.log(generateQueueStatsCurl());
    
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

// Export functions for use as a module
module.exports = {
  generateHmacSignature,
  generateFundRequestSignature,
  generateAdminInfoSignature,
  generatePoolStateSignature,
  generateBalanceByAddressSignature,
  generateQueueStatsSignature,
  generateFundRequestCurl,
  generateAdminInfoCurl,
  generatePoolStateCurl,
  generateBalanceByAddressCurl,
  generateQueueStatsCurl,
}; 