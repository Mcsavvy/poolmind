# PoolMind - Pooled Crypto Arbitrage Fund

A Clarity smart contract for a pooled crypto arbitrage fund on the Stacks blockchain. Users deposit STX into the contract and receive "PoolMind" (PLMD) tokens, which represent their proportional stake in the fund's Net Asset Value (NAV). These shares can be redeemed at any time for the corresponding amount of STX based on the current NAV.

## Features

- **Deposit STX** to mint PoolMind tokens representing your stake in the fund
- **Withdraw STX** by burning PoolMind tokens based on current NAV
- **Custom SIP-010 Fungible Token** with optional transferability controls
- **Admin-controlled NAV updates** to reflect fund performance from arbitrage trading
- **Configurable entry and exit fees** (default 0.5% each)
- **Emergency pause controls** for contract security
- **Historical NAV tracking** with event emissions for transparency
- **Admin STX management** for moving capital to external exchanges

## Contract Architecture

### Core Components

1. **SIP-010 Fungible Token Implementation**: Custom PLMD token with transfer controls
2. **Admin Controls**: Centralized management functions for fund operations
3. **User Functions**: Deposit and withdrawal mechanisms
4. **NAV Management**: Historical tracking and updates
5. **Fee System**: Configurable entry and exit fees

### Key Constants

- `TOKEN_PRECISION`: 1,000,000 (6 decimals)
- Default entry fee: 0.5% (5 per 1000)
- Default exit fee: 0.5% (5 per 1000)

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Clarinet CLI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd poolmind/contracts
```

2. Install dependencies:
```bash
npm install
```

3. Initialize Clarinet (if not already done):
```bash
clarinet new . --overwrite
```

## Testing

The project includes comprehensive tests using the `@clarinet-js-sdk` testing framework.

### Run Tests

```bash
npm run test
```

### Test Coverage

The test suite covers:

- **Initialization and SIP-010 Compliance** (2 tests)
  - Token properties verification
  - Initial state validation

- **Admin Controls** (9 tests)
  - Admin authorization and management
  - Pause/unpause functionality
  - Fee configuration
  - NAV updates
  - STX deposit/withdrawal by admin

- **Deposits and Withdrawals** (6 tests)
  - User deposit functionality
  - User withdrawal functionality
  - Edge cases and error conditions

- **Token Transfers (SIP-010)** (5 tests)
  - Transfer controls and permissions
  - SIP-010 compliance validation

**Total: 22 tests** covering all major functionality and edge cases.

## Usage

### For Users

#### Depositing STX

Users can deposit STX to receive PLMD tokens:

```clarity
(contract-call? .poolmind deposit u10000000) ;; Deposit 10 STX
```

The number of PLMD tokens minted is calculated as:
```
shares = (deposit_amount - entry_fee) * TOKEN_PRECISION / current_NAV
```

#### Withdrawing STX

Users can burn PLMD tokens to withdraw STX:

```clarity
(contract-call? .poolmind withdraw u5000000) ;; Withdraw 5 PLMD tokens
```

The STX amount received is calculated as:
```
stx_amount = (shares * current_NAV / TOKEN_PRECISION) - exit_fee
```

#### Checking Balances

```clarity
;; Get PLMD token balance
(contract-call? .poolmind get-balance 'SP1234...)

;; Get current NAV
(contract-call? .poolmind get-nav)

;; Get contract state
(contract-call? .poolmind get-contract-state)
```

### For Administrators

#### Setting Up the Fund

1. **Set Admin**: Transfer admin rights from contract owner
```clarity
(contract-call? .poolmind set-admin 'SP-ADMIN-ADDRESS)
```

2. **Set Initial NAV**: Required before users can deposit
```clarity
(contract-call? .poolmind update-nav u1000000) ;; Set NAV to 1 STX per token
```

3. **Configure Fees** (optional):
```clarity
(contract-call? .poolmind set-entry-fee-rate u10) ;; 1% entry fee
(contract-call? .poolmind set-exit-fee-rate u10)  ;; 1% exit fee
```

#### Managing the Fund

- **Update NAV**: Reflect trading performance
```clarity
(contract-call? .poolmind update-nav u1100000) ;; 10% increase
```

- **Deposit Trading Profits**:
```clarity
(contract-call? .poolmind admin-deposit u50000000) ;; Deposit 50 STX profit
```

- **Withdraw for Trading**:
```clarity
(contract-call? .poolmind withdraw-to-admin u100000000) ;; Withdraw 100 STX for trading
```

- **Emergency Controls**:
```clarity
(contract-call? .poolmind set-paused true)  ;; Pause deposits/withdrawals
(contract-call? .poolmind set-token-transferable true) ;; Enable token transfers
```

## Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 101 | `ERR_NOT_AUTHORIZED` | Caller not authorized for this action |
| 102 | `ERR_PAUSED` | Contract is paused |
| 103 | `ERR_TRANSFERS_DISABLED` | Token transfers are disabled |
| 104 | `ERR_INSUFFICIENT_BALANCE` | Insufficient token balance |
| 105 | `ERR_ZERO_DEPOSIT` | Cannot deposit zero amount |
| 106 | `ERR_ZERO_WITHDRAWAL` | Cannot withdraw zero amount |
| 107 | `ERR_NAV_NOT_POSITIVE` | NAV must be positive for deposits |
| 108 | `ERR_SELF_TRANSFER` | Cannot transfer tokens to self |
| 109 | `ERR_INSUFFICIENT_STX_BALANCE` | Contract has insufficient STX balance |

## Security Considerations

### Access Controls
- **Contract Owner**: Can set initial admin
- **Admin**: Can manage NAV, fees, pause state, and STX movements
- **Users**: Can only deposit, withdraw, and transfer (when enabled)

### Safety Features
- **Pause Mechanism**: Admin can halt deposits/withdrawals in emergencies
- **Transfer Controls**: Token transfers can be disabled to prevent speculation
- **Balance Checks**: All operations validate sufficient balances before execution
- **NAV Validation**: Deposits require positive NAV to prevent division by zero

### Best Practices
1. **Regular NAV Updates**: Keep NAV current to reflect actual fund value
2. **Careful STX Management**: Ensure contract has sufficient STX for withdrawals
3. **Fee Monitoring**: Review and adjust fees based on market conditions
4. **Emergency Preparedness**: Use pause functionality if issues arise

## Development

### Project Structure
```
contracts/
├── contracts/
│   └── poolmind.clar          # Main contract
├── tests/
│   ├── poolmind.test.ts       # Comprehensive test suite
│   └── poolmind-token-trait.test.ts  # SIP-010 trait test
├── Clarinet.toml              # Clarinet configuration
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

### Adding New Features

1. Implement the feature in `contracts/poolmind.clar`
2. Add comprehensive tests in `tests/poolmind.test.ts`
3. Update this README with new functionality
4. Test thoroughly with `npm run test`

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

[Add your license information here]

## Disclaimer

This smart contract handles financial assets and should be thoroughly audited before mainnet deployment. Use at your own risk. The developers are not responsible for any loss of funds.