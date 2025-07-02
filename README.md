# PoolMind

## AI-powered Cross-Exchange Arbitrage Trading System

PoolMind is an advanced crypto arbitrage trading system that uses AI to identify and execute profitable trading opportunities across multiple exchanges. The system leverages a hybrid multi-agent architecture with function calling and state management to optimize trading strategies.

![PoolMind Logo](https://via.placeholder.com/800x200?text=PoolMind+AI+Trading)

## Features

- **Multi-Exchange Arbitrage**: Scan and detect price discrepancies across exchanges
- **AI-Powered Decision Making**: LLM-based strategy generation and risk assessment
- **Pool-Based Trading**: Manage a pool of participants with different risk profiles
- **Real-Time Market Data**: Collect and analyze market data from multiple sources
- **Automated Execution**: Execute trades with optimal position sizing and timing
- **Risk Management**: Advanced risk scoring and mitigation strategies
- **Simulation Mode**: Test strategies without executing real trades

## Architecture

PoolMind is built with a modular architecture:

```
poolmind/
├── core/               # Core trading components
│   ├── config.py       # Configuration management
│   ├── pool_state.py   # Pool state and participant management
│   ├── arbitrage.py    # Arbitrage detection and execution
│   └── ...
├── ai/                 # AI components
│   ├── agent.py        # LLM agent implementation
│   └── ...
├── utils/              # Utility functions
│   ├── logging_setup.py # Logging configuration
│   ├── market_data.py  # Market data collection
│   └── ...
├── main.py             # Main application module
└── ...
```

## Installation

### Prerequisites

- Python 3.9+
- Groq API key for LLM services
- Exchange API keys (optional for simulation mode)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/poolmind.git
   cd poolmind
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the package in development mode:
   ```bash
   pip install -e ".[dev]"
   ```

4. Create a `.env` file with your configuration:
   ```
   # LLM Configuration
   LLM_PROVIDER=groq
   GROQ_API_KEY=your-api-key
   GROQ_MODEL=llama3-70b-8192
   
   # Trading Configuration
   INITIAL_POOL_VALUE=100000.0
   INITIAL_PARTICIPANTS=10
   CYCLE_INTERVAL=60
   TRADING_SYMBOLS=BTC/USDT,ETH/USDT,SOL/USDT
   MAX_POSITION_SIZE_PCT=0.05
   MIN_SPREAD_THRESHOLD=0.8
   
   # Exchange API Keys (for real trading)
   # BINANCE_API_KEY=your-binance-key
   # BINANCE_SECRET_KEY=your-binance-secret
   # COINBASE_API_KEY=your-coinbase-key
   # COINBASE_SECRET_KEY=your-coinbase-secret
   ```

## Usage

### Running the Application

```bash
# Run with default settings
python poolmind.py

# Run with custom settings
python poolmind.py --config custom.env --log-level DEBUG --sandbox
```

### Command Line Options

- `--config`: Path to configuration file (.env)
- `--log-level`: Set logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `--log-file`: Path to log file
- `--cycle-interval`: Trading cycle interval in seconds
- `--sandbox`: Run in sandbox mode (no real trades)

## Development

### Running Tests

```bash
# Run all tests
python -m pytest

# Run tests with coverage
python -m pytest --cov=poolmind

# Run specific test module
python -m pytest tests/test_arbitrage.py
```

### Test Suite Status

All tests are now passing! The test suite includes:

- **Arbitrage Tests**: Tests for arbitrage opportunity detection and execution
- **AI Agent Tests**: Tests for LLM-based strategy generation and risk assessment
- **Config Tests**: Tests for configuration management
- **Pool State Tests**: Tests for pool state and participant management

### Code Style

The project follows PEP 8 guidelines with some modifications. Code formatting is handled by Black and isort:

```bash
# Format code
black poolmind tests
isort poolmind tests
```

## System Components

### Core Components

- **Pool State Management**: Tracks participants, assets, and pool metrics
- **Arbitrage Detection**: Identifies price discrepancies across exchanges
- **Arbitrage Execution**: Simulates trades with optimal position sizing

### AI Components

- **LLM Agent**: Base class for all AI agents using Groq API
- **Strategy Agent**: Generates trading strategies based on market conditions
- **Risk Assessment Agent**: Evaluates risks and recommends mitigation strategies

### Utility Components

- **Market Data Collector**: Collects and normalizes market data from exchanges
- **Logging Setup**: Configures logging for the application

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Groq](https://groq.com/) for providing fast LLM inference
- [CCXT](https://github.com/ccxt/ccxt) for cryptocurrency exchange trading library

## Disclaimer

This software is for educational purposes only. Cryptocurrency trading involves significant risk. Use this software at your own risk. The authors are not responsible for any financial losses incurred while using this system.

## Project Status

- **Core Components**: Implemented and tested
- **AI Agents**: Implemented and tested
- **Test Suite**: All tests passing
- **Next Steps**: Integration with Telegram bot, deployment preparation
