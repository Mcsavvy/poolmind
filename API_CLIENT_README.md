# PoolMind API Client

This module provides a client interface to interact with the external PoolMind API at https://poolmind.futurdevs.com/api.

## Overview

The PoolMind system has been updated to use an external API endpoint instead of running a local FastAPI server. This allows for easier integration and leveraging the developer-provided external API for improved system interaction.

## Components

1. **API Client** (`poolmind/api_client.py`): A client library for interacting with the external PoolMind API.
2. **CLI Tool** (`poolmind_cli.py`): A command-line interface for interacting with the API.
3. **Application** (`app.py`): Updated to use the API client instead of running a local server.

## Usage

### API Client

```python
from poolmind.api_client import PoolMindAPIClient
import asyncio

async def example():
    # Initialize the API client
    client = PoolMindAPIClient(base_url="https://poolmind.futurdevs.com/api")
    
    try:
        # Get system status
        status = await client.get_status()
        print(f"System status: {status}")
        
        # Start the system
        result = await client.start_system()
        print(f"Start result: {result}")
        
        # Run a trading cycle
        cycle_result = await client.run_cycle()
        print(f"Cycle result: {cycle_result}")
    finally:
        # Close the client session
        await client.close()

# Run the example
asyncio.run(example())
```

### CLI Tool

The `poolmind_cli.py` script provides a command-line interface for interacting with the API:

```bash
# Get system status
./poolmind_cli.py status

# Start the system
./poolmind_cli.py start

# Stop the system
./poolmind_cli.py stop

# Run a single trading cycle
./poolmind_cli.py run-cycle

# Get pool metrics
./poolmind_cli.py pool

# Get participants information
./poolmind_cli.py participants
./poolmind_cli.py participants --id participant123

# Add a new participant
./poolmind_cli.py add-participant --id participant123 --investment 1000.0

# Request a withdrawal
./poolmind_cli.py request-withdrawal --id participant123 --amount 500.0

# Process all pending withdrawals
./poolmind_cli.py process-withdrawals

# Get system configuration
./poolmind_cli.py config
```

### Application

The `app.py` script has been updated to use the API client instead of running a local server:

```bash
# Run the application (monitors the system status)
python app.py

# Run a single trading cycle and exit
python app.py --run-cycle

# Monitor the system status without starting it
python app.py --monitor

# Specify a custom API URL
python app.py --api-url https://custom-poolmind-api.example.com/api
```

## Exchange API Keys

The following exchanges are configured for STX trading:

1. **Hotcoin**
2. **Gate.io**
3. **Binance**
4. **Coin W**
5. **Bybit**
6. **OrangeX**

The API keys for these exchanges are stored in the `.env` file and will be used by the external API for STX trading across multiple exchanges, enabling comprehensive arbitrage opportunities.

> **IMPORTANT SECURITY NOTE:** Never expose API keys in documentation or commit them to version control. The keys in the `.env` file should be kept secure and only accessed by authorized systems.

## Dependencies

The API client requires the following dependencies:

- aiohttp>=3.8.0
- asyncio
- python-dotenv>=1.0.0
- logging

These dependencies are included in the `requirements.txt` file.
