"""Configuration management for the PoolMind system."""

import os
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv


class Config:
    """Configuration manager for the PoolMind system.
    
    Handles loading environment variables and providing access to configuration settings.
    """
    
    def __init__(self, env_file: Optional[str] = None):
        """Initialize configuration from environment variables.
        
        Args:
            env_file: Path to .env file. If None, looks for .env in current directory.
        """
        self.env_file = env_file or os.path.join(os.getcwd(), '.env')
        self._load_env()
        self._validate_required_config()
    
    def _load_env(self) -> None:
        """Load environment variables from .env file."""
        if os.path.exists(self.env_file):
            load_dotenv(self.env_file)
        else:
            print(f"Warning: Environment file {self.env_file} not found.")
    
    def _validate_required_config(self) -> None:
        """Validate that required configuration variables are present."""
        required_vars = [
            # Core configuration
            "ENVIRONMENT",
            # LLM configuration
            "GROQ_API_KEY",
            # Trading configuration
            "INITIAL_POOL_VALUE",
            "TRADING_SYMBOLS",
        ]
        
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            print(f"Warning: Missing required environment variables: {', '.join(missing)}")
    
    @property
    def environment(self) -> str:
        """Get the current environment (development, production, etc.)."""
        return os.getenv("ENVIRONMENT", "development")
    
    @property
    def debug(self) -> bool:
        """Get debug mode status."""
        return os.getenv("DEBUG", "false").lower() == "true"
    
    @property
    def sandbox_mode(self) -> bool:
        """Get sandbox mode status."""
        return os.getenv("SANDBOX_MODE", "true").lower() == "true"
    
    @property
    def llm_config(self) -> Dict[str, Any]:
        """Get LLM configuration."""
        return {
            "provider": os.getenv("LLM_PROVIDER", "groq"),
            "api_key": os.getenv("GROQ_API_KEY", ""),
            "model": os.getenv("GROQ_MODEL", "llama3-70b-8192"),
            "temperature": float(os.getenv("GROQ_TEMPERATURE", "0.1")),
            "max_tokens": int(os.getenv("GROQ_MAX_TOKENS", "2000")),
            "timeout": int(os.getenv("GROQ_TIMEOUT", "30")),
        }
    
    @property
    def trading_config(self) -> Dict[str, Any]:
        """Get trading configuration."""
        return {
            "initial_pool_value": float(os.getenv("INITIAL_POOL_VALUE", "100000.0")),
            "initial_participants": int(os.getenv("INITIAL_PARTICIPANTS", "10")),
            "cycle_interval": int(os.getenv("CYCLE_INTERVAL", "30")),
            "trading_symbols": os.getenv("TRADING_SYMBOLS", "BTC/USDT,ETH/USDT").split(","),
            "max_position_size_pct": float(os.getenv("MAX_POSITION_SIZE_PCT", "0.10")),
            "min_spread_threshold": float(os.getenv("MIN_SPREAD_THRESHOLD", "0.5")),
        }
    
    @property
    def database_config(self) -> Dict[str, Any]:
        """Get database configuration."""
        return {
            "url": os.getenv("DATABASE_URL", "sqlite:///data/poolmind.db"),
        }
    
    @property
    def exchange_apis(self) -> Dict[str, Dict[str, str]]:
        """Get exchange API configurations."""
        return {
            "binance": {
                "api_key": os.getenv("BINANCE_API_KEY", ""),
                "secret": os.getenv("BINANCE_SECRET", ""),
                "testnet": os.getenv("BINANCE_TESTNET", "true").lower() == "true",
            },
            "coinbase": {
                "api_key": os.getenv("COINBASE_API_KEY", ""),
                "secret": os.getenv("COINBASE_SECRET", ""),
                "passphrase": os.getenv("COINBASE_PASSPHRASE", ""),
                "sandbox": os.getenv("COINBASE_SANDBOX", "true").lower() == "true",
            },
        }
    
    @property
    def vector_db_config(self) -> Dict[str, Any]:
        """Get vector database configuration."""
        return {
            "db_path": os.getenv("CHROMA_DB_PATH", "./data/chroma_db"),
            "collection_name": os.getenv("CHROMA_COLLECTION_NAME", "trade_history"),
            "embedding_model": os.getenv("EMBEDDING_MODEL", "text-embedding-ada-002"),
            "embedding_dimension": int(os.getenv("EMBEDDING_DIMENSION", "1536")),
            "max_retrieval_results": int(os.getenv("MAX_RETRIEVAL_RESULTS", "5")),
        }
    
    @property
    def feature_flags(self) -> Dict[str, bool]:
        """Get feature flags."""
        return {
            "risk_management": os.getenv("ENABLE_RISK_MANAGEMENT", "true").lower() == "true",
            "backtesting": os.getenv("ENABLE_BACKTESTING", "true").lower() == "true",
            "paper_trading": os.getenv("ENABLE_PAPER_TRADING", "true").lower() == "true",
            "live_trading": os.getenv("ENABLE_LIVE_TRADING", "false").lower() == "true",
        }


# Create a global config instance
config = Config()
