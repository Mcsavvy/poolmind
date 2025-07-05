# Fund Request API Documentation

The Fund Request API provides secure endpoints for trading bots to request STX funds from the orchestrator's admin wallet. All endpoints are secured using HMAC-SHA256 signatures.

## Security

### HMAC Authentication

All fund request endpoints require HMAC-SHA256 authentication using the following headers:

- `x-signature`: HMAC signature in format `sha256=<signature>`
- `x-timestamp`: Request timestamp in milliseconds
- `x-signature` (for POST requests): Also requires `Content-Type: application/json`

### Signature Generation

The signature is generated using the following message format:

```
message = METHOD + URL + TIMESTAMP + BODY
```

Where:

- `METHOD`: HTTP method (GET, POST, etc.)
- `URL`: Full URL path (e.g., `/api/v1/fund-request`)
- `TIMESTAMP`: Timestamp in milliseconds as string
- `BODY`: Request body as string (empty for GET requests)

### Example Signature Generation (Node.js)

```javascript
const crypto = require("crypto");

function generateHmacSignature(method, url, timestamp, body, secret) {
  const message = `${method}${url}${timestamp}${body}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

// Example usage
const method = "POST";
const url = "/api/v1/fund-request";
const timestamp = Date.now().toString();
const body = JSON.stringify({
  recipientAddress: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
  amount: 10.5,
  memo: "Trading bot funding",
});

const signature = generateHmacSignature(
  method,
  url,
  timestamp,
  body,
  HMAC_SECRET,
);
```

## API Endpoints

### 1. Request Funds

**POST** `/api/v1/fund-request`

Request STX funds from the admin wallet.

#### Request Body

```json
{
  "recipientAddress": "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
  "amount": 10.5,
  "memo": "Trading bot funding request"
}
```

#### Request Headers

```
Content-Type: application/json
x-signature: sha256=<hmac_signature>
x-timestamp: <timestamp_in_ms>
```

#### Response

**Success (200)**

```json
{
  "success": true,
  "message": "Fund transfer initiated successfully",
  "data": {
    "txId": "0x1234567890abcdef",
    "recipientAddress": "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
    "amount": 10.5,
    "amountMicroSTX": 10500000,
    "memo": "Trading bot funding request",
    "senderAddress": "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN0QKK"
  }
}
```

**Error (400)**

```json
{
  "success": false,
  "message": "Invalid STX address format"
}
```

**Error (401)**

```json
{
  "success": false,
  "message": "Invalid HMAC signature"
}
```

**Error (500)**

```json
{
  "success": false,
  "message": "Fund transfer failed",
  "error": "Insufficient funds"
}
```

### 2. Get Admin Info

**GET** `/api/v1/fund-request/admin/info`

Get information about the admin wallet.

#### Request Headers

```
x-signature: sha256=<hmac_signature>
x-timestamp: <timestamp_in_ms>
```

#### Response

**Success (200)**

```json
{
  "success": true,
  "data": {
    "adminAddress": "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN0QKK"
  }
}
```

## Usage Examples

### Using curl

#### Request Funds

```bash
curl -X POST "http://localhost:3000/api/v1/fund-request" \
  -H "Content-Type: application/json" \
  -H "x-signature: sha256=<signature>" \
  -H "x-timestamp: <timestamp>" \
  -d '{
    "recipientAddress": "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
    "amount": 10.5,
    "memo": "Trading bot funding"
  }'
```

#### Get Admin Info

```bash
curl -X GET "http://localhost:3000/api/v1/fund-request/admin/info" \
  -H "x-signature: sha256=<signature>" \
  -H "x-timestamp: <timestamp>"
```

### Using the HMAC Generator Script

The project includes a utility script to generate HMAC signatures:

```bash
# Set your HMAC secret
export HMAC_SECRET="your-hmac-secret-key-here"

# Generate fund request signature
node scripts/generate-hmac-signature.js fund-request SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE 10.5 "Trading bot funding"

# Generate admin info signature
node scripts/generate-hmac-signature.js admin-info
```

### Using Node.js

```javascript
const crypto = require("crypto");
const fetch = require("node-fetch");

class FundRequestClient {
  constructor(baseUrl, hmacSecret) {
    this.baseUrl = baseUrl;
    this.hmacSecret = hmacSecret;
  }

  generateSignature(method, url, timestamp, body) {
    const message = `${method}${url}${timestamp}${body}`;
    return crypto
      .createHmac("sha256", this.hmacSecret)
      .update(message)
      .digest("hex");
  }

  async requestFunds(recipientAddress, amount, memo) {
    const method = "POST";
    const url = "/api/v1/fund-request";
    const timestamp = Date.now().toString();
    const body = JSON.stringify({
      recipientAddress,
      amount,
      memo,
    });

    const signature = this.generateSignature(method, url, timestamp, body);

    const response = await fetch(`${this.baseUrl}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-signature": `sha256=${signature}`,
        "x-timestamp": timestamp,
      },
      body,
    });

    return response.json();
  }

  async getAdminInfo() {
    const method = "GET";
    const url = "/api/v1/fund-request/admin/info";
    const timestamp = Date.now().toString();
    const body = "";

    const signature = this.generateSignature(method, url, timestamp, body);

    const response = await fetch(`${this.baseUrl}${url}`, {
      method,
      headers: {
        "x-signature": `sha256=${signature}`,
        "x-timestamp": timestamp,
      },
    });

    return response.json();
  }
}

// Usage
const client = new FundRequestClient(
  "http://localhost:3000",
  process.env.HMAC_SECRET,
);

// Request funds
client
  .requestFunds(
    "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
    10.5,
    "Trading bot funding",
  )
  .then(console.log);

// Get admin info
client.getAdminInfo().then(console.log);
```

## Security Considerations

1. **HMAC Secret**: Keep the HMAC secret secure and never expose it in client-side code
2. **Timestamp Validation**: Requests are rejected if the timestamp is more than 5 minutes old
3. **Request Logging**: All fund requests are logged with IP addresses and user agents
4. **Address Validation**: STX addresses are validated before processing transfers
5. **Amount Validation**: Transfer amounts must be positive numbers

## Error Handling

The API uses standard HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid HMAC signature)
- `500`: Internal Server Error (transfer failed)

All error responses include a `success: false` field and a descriptive `message` field.

## Rate Limiting

The fund request endpoints are subject to the same rate limiting as other API endpoints:

- 100 requests per 15-minute window per IP address
- Additional rate limiting may be applied specifically to fund request endpoints

## Monitoring and Logging

All fund request activities are logged with the following information:

- Request timestamp
- Recipient address
- Transfer amount
- Memo
- Client IP address
- User agent
- Transaction ID (if successful)
- Error details (if failed)

Logs are stored in the configured log files and can be monitored for security and operational purposes.
