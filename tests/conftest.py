"""
Common pytest fixtures for PoolMind tests.
"""

import os
import pytest
import time
from unittest.mock import patch, MagicMock
from datetime import datetime

from poolmind.core.config import Config
from poolmind.core.pool_state import PoolState, Participant
from poolmind.core.arbitrage import ArbitrageOpportunity, ArbitrageDetector


@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing."""
    env_vars = {
        # General config
        "ENVIRONMENT": "test",
        "DEBUG": "true",
        "LOG_LEVEL": "DEBUG",
        "SANDBOX_MODE": "true",
        
        # LLM config
        "LLM_PROVIDER": "groq",
        "GROQ_API_KEY": "test-api-key",
        "GROQ_MODEL": "llama3-70b-8192",
        "GROQ_TEMPERATURE": "0.1",
        "GROQ_MAX_TOKENS": "1000",
        "GROQ_TIMEOUT": "30",
        
        # Trading config
        "INITIAL_POOL_VALUE": "100000.0",
        "INITIAL_PARTICIPANTS": "10",
        "CYCLE_INTERVAL": "30",
        "TRADING_SYMBOLS": "BTC/USDT,ETH/USDT,SOL/USDT",
        "MAX_POSITION_SIZE_PCT": "0.10",
        "MIN_SPREAD_THRESHOLD": "0.5",
        
        # Database config
        "DB_TYPE": "sqlite",
        "SQLITE_PATH": ":memory:",
        
        # Exchange simulation
        "USE_SIMULATED_EXCHANGES": "true",
        "SIMULATED_EXCHANGES": "binance,coinbase,kraken"
    }
    
    with patch.dict(os.environ, env_vars):
        yield env_vars


@pytest.fixture
def config(mock_env_vars):
    """Config fixture with mocked environment variables."""
    with patch('os.path.exists', return_value=True):
        return Config()


@pytest.fixture
def sample_participant():
    """Sample participant fixture."""
    return Participant(
        id="p123",
        initial_investment=10000.0,
        current_value=10000.0,
        join_date=time.time()
    )


@pytest.fixture
def pool_state():
    """Pool state fixture with initial setup."""
    state = PoolState(initial_pool_value=100000.0, initial_participants=2)
    
    # Add assets to the pool
    state.assets = {
        "BTC/USDT": 0.5,
        "ETH/USDT": 5.0
    }
    
    # Update cash reserve to reflect asset allocation
    btc_value = 0.5 * 50000.0  # 0.5 BTC at $50,000
    eth_value = 5.0 * 3000.0   # 5 ETH at $3,000
    state.cash_reserve = state.initial_pool_value - (btc_value + eth_value)
    
    return state


@pytest.fixture
def sample_arbitrage_opportunity():
    """Sample arbitrage opportunity fixture."""
    return ArbitrageOpportunity(
        symbol="BTC/USDT",
        buy_exchange="binance",
        sell_exchange="coinbase",
        buy_price=49000.0,
        sell_price=50000.0,
        spread_pct=2.04,
        max_volume_usd=50000.0,
        timestamp=time.time()
    )


@pytest.fixture
def mock_market_data():
    """Mock market data for testing."""
    return {
        "binance": {
            "BTC/USDT": {"bid": 49000.0, "ask": 49100.0, "volume": 10.0},
            "ETH/USDT": {"bid": 2900.0, "ask": 2910.0, "volume": 50.0},
            "SOL/USDT": {"bid": 95.0, "ask": 95.5, "volume": 1000.0}
        },
        "coinbase": {
            "BTC/USDT": {"bid": 49900.0, "ask": 50000.0, "volume": 8.0},
            "ETH/USDT": {"bid": 2890.0, "ask": 2900.0, "volume": 40.0},
            "SOL/USDT": {"bid": 94.5, "ask": 95.0, "volume": 800.0}
        },
        "kraken": {
            "BTC/USDT": {"bid": 49500.0, "ask": 49600.0, "volume": 5.0},
            "ETH/USDT": {"bid": 2905.0, "ask": 2915.0, "volume": 30.0},
            "SOL/USDT": {"bid": 95.2, "ask": 95.7, "volume": 600.0}
        }
    }


@pytest.fixture
def mock_exchange_clients():
    """Mock exchange clients for testing."""
    binance_client = MagicMock()
    coinbase_client = MagicMock()
    kraken_client = MagicMock()
    
    # Set up mock methods
    for client in [binance_client, coinbase_client, kraken_client]:
        client.create_order = MagicMock(return_value={"id": "test-order-id", "status": "filled"})
        client.fetch_ticker = MagicMock(return_value={"bid": 50000.0, "ask": 50100.0, "volume": 10.0})
        client.fetch_balance = MagicMock(return_value={"free": {"BTC": 1.0, "ETH": 10.0, "USDT": 100000.0}})
    
    return {
        "binance": binance_client,
        "coinbase": coinbase_client,
        "kraken": kraken_client
    }


@pytest.fixture
def mock_groq_client():
    """Mock Groq client for testing."""
    with patch("groq.AsyncGroq") as MockGroq:
        mock_client = MagicMock()
        MockGroq.return_value = mock_client
        
        # Mock the chat.completions.create method
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "This is a test response"
        mock_client.chat.completions.create = MagicMock(return_value=mock_response)
        
        yield mock_client
