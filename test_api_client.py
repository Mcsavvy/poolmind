#!/usr/bin/env python3
"""
Test script for the PoolMind API Client

This script creates a simple mock server using aiohttp and tests the API client against it.
"""

import asyncio
import json
import logging
from aiohttp import web
from poolmind.api_client import PoolMindAPIClient

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Mock API responses
MOCK_RESPONSES = {
    "/status": {
        "is_running": True,
        "last_cycle_time": 1720000000.0,
        "pool_metrics": {
            "total_pool_value": 125000.0,
            "initial_pool_value": 100000.0,
            "cash_reserve": 25000.0,
            "cash_ratio": 0.2,
            "roi": 0.25,
            "participant_count": 5,
            "asset_count": 3
        },
        "execution_count": 120,
        "recent_executions": []
    },
    "/exchanges": {
        "exchanges": [
            {
                "id": "binance",
                "name": "Binance",
                "status": "active",
                "supported_assets": ["BTC", "ETH", "STX", "USDT"]
            },
            {
                "id": "gate",
                "name": "Gate.io",
                "status": "active",
                "supported_assets": ["BTC", "ETH", "STX", "USDT"]
            },
            {
                "id": "hotcoin",
                "name": "Hotcoin",
                "status": "active",
                "supported_assets": ["BTC", "STX", "USDT"]
            },
            {
                "id": "coinw",
                "name": "Coin W",
                "status": "active",
                "supported_assets": ["BTC", "ETH", "STX", "USDT"]
            },
            {
                "id": "bybit",
                "name": "Bybit",
                "status": "active",
                "supported_assets": ["BTC", "ETH", "STX", "USDT"]
            },
            {
                "id": "orangex",
                "name": "OrangeX",
                "status": "active",
                "supported_assets": ["BTC", "STX", "USDT"]
            }
        ]
    },
    "/markets/stx": {
        "symbol": "STX/USDT",
        "markets": [
            {
                "exchange": "binance",
                "price": 3.245,
                "bid": 3.24,
                "ask": 3.25,
                "volume_24h": 1250000.0,
                "timestamp": 1720000000.0
            },
            {
                "exchange": "gate",
                "price": 3.255,
                "bid": 3.25,
                "ask": 3.26,
                "volume_24h": 980000.0,
                "timestamp": 1720000000.0
            },
            {
                "exchange": "hotcoin",
                "price": 3.235,
                "bid": 3.23,
                "ask": 3.24,
                "volume_24h": 750000.0,
                "timestamp": 1720000000.0
            },
            {
                "exchange": "coinw",
                "price": 3.26,
                "bid": 3.25,
                "ask": 3.27,
                "volume_24h": 620000.0,
                "timestamp": 1720000000.0
            },
            {
                "exchange": "bybit",
                "price": 3.25,
                "bid": 3.24,
                "ask": 3.26,
                "volume_24h": 890000.0,
                "timestamp": 1720000000.0
            },
            {
                "exchange": "orangex",
                "price": 3.23,
                "bid": 3.22,
                "ask": 3.24,
                "volume_24h": 540000.0,
                "timestamp": 1720000000.0
            }
        ]
    }
}

# Mock API handlers
async def handle_request(request):
    """Handle API requests with mock responses."""
    path = request.path
    
    # For exchange-specific endpoints
    if path.startswith("/exchanges/") and path.endswith("/markets"):
        exchange_id = path.split("/")[2]
        return web.json_response({
            "exchange": exchange_id,
            "markets": [
                {
                    "symbol": "STX/USDT",
                    "price": 3.25,
                    "bid": 3.24,
                    "ask": 3.26,
                    "volume_24h": 980000.0,
                    "timestamp": 1720000000.0
                }
            ]
        })
    
    # For standard endpoints
    if path in MOCK_RESPONSES:
        return web.json_response(MOCK_RESPONSES[path])
    
    # Default response
    return web.json_response({"error": "Endpoint not found"}, status=404)

async def start_mock_server():
    """Start a mock API server."""
    app = web.Application()
    app.router.add_get('/{tail:.*}', handle_request)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8000)
    await site.start()
    
    logger.info("Mock API server started at http://localhost:8000")
    return runner

async def test_api_client():
    """Test the API client against the mock server."""
    # Initialize API client with mock server URL
    api_client = PoolMindAPIClient(base_url="http://localhost:8000")
    
    try:
        # Test status endpoint
        logger.info("Testing status endpoint...")
        status = await api_client.get_status()
        logger.info(f"Status: {json.dumps(status, indent=2)}")
        
        # Test exchanges endpoint
        logger.info("\nTesting exchanges endpoint...")
        exchanges = await api_client.get_exchanges()
        logger.info(f"Exchanges: {json.dumps(exchanges, indent=2)}")
        
        # Test STX markets endpoint
        logger.info("\nTesting STX markets endpoint...")
        stx_markets = await api_client.get_stx_markets()
        logger.info(f"STX Markets: {json.dumps(stx_markets, indent=2)}")
        
        # Test exchange-specific markets endpoint
        logger.info("\nTesting exchange-specific markets endpoint...")
        exchange_markets = await api_client.get_exchange_markets("binance")
        logger.info(f"Binance Markets: {json.dumps(exchange_markets, indent=2)}")
        
        logger.info("\nAll tests completed successfully!")
    finally:
        await api_client.close()

async def main():
    """Main entry point."""
    # Start mock server
    runner = await start_mock_server()
    
    try:
        # Run tests
        await test_api_client()
    finally:
        # Cleanup
        await runner.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
