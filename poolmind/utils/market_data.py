"""Market data collection for the PoolMind system."""

import time
import random
import logging
import asyncio
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class MarketDataCollector:
    """Collects market data from various exchanges."""
    
    def __init__(self, symbols: List[str]):
        """Initialize the market data collector.
        
        Args:
            symbols: List of trading symbols to collect data for (e.g. ["BTC/USDT", "ETH/USDT"])
        """
        self.symbols = symbols
        self.exchanges = ["binance", "coinbase", "kraken", "kucoin", "huobi"]
        self.last_update_time = 0
        self.cache_ttl = 5  # Cache data for 5 seconds
        self.cached_data = {}
    
    async def get_market_data(self) -> Dict[str, Dict[str, Dict[str, float]]]:
        """Get market data for all configured symbols across exchanges.
        
        Returns:
            Nested dictionary with structure:
                {symbol: {exchange: {"bid": price, "ask": price, "volume": volume}}}
        """
        current_time = time.time()
        
        # Use cached data if it's fresh enough
        if current_time - self.last_update_time < self.cache_ttl and self.cached_data:
            return self.cached_data
        
        # In a real implementation, this would make API calls to exchanges
        # For now, we'll simulate the data
        market_data = {}
        
        for symbol in self.symbols:
            market_data[symbol] = {}
            
            # Generate a base price for this symbol
            base_price = self._get_base_price_for_symbol(symbol)
            
            # Generate data for each exchange with slight variations
            for exchange in self.exchanges:
                # Skip some exchanges randomly to simulate that not all exchanges have all pairs
                if random.random() < 0.2:
                    continue
                
                # Add random variation to prices for each exchange
                variation = 0.98 + (random.random() * 0.04)  # ±2% variation
                mid_price = base_price * variation
                
                # Create a bid-ask spread
                spread = mid_price * (0.0005 + random.random() * 0.002)  # 0.05% to 0.25% spread
                bid = mid_price - spread / 2
                ask = mid_price + spread / 2
                
                # Generate volume
                volume = random.uniform(10, 100) * base_price  # Higher base price = higher volume
                
                market_data[symbol][exchange] = {
                    "bid": round(bid, 8),
                    "ask": round(ask, 8),
                    "volume": round(volume, 2)
                }
        
        # Update cache
        self.cached_data = market_data
        self.last_update_time = current_time
        
        logger.debug(f"Collected market data for {len(self.symbols)} symbols across {len(self.exchanges)} exchanges")
        return market_data
    
    def _get_base_price_for_symbol(self, symbol: str) -> float:
        """Get a realistic base price for a symbol.
        
        Args:
            symbol: Trading symbol
            
        Returns:
            Base price for the symbol
        """
        # These are just example prices - in a real implementation, 
        # we would fetch actual market prices
        base_prices = {
            "BTC/USDT": 50000.0,
            "ETH/USDT": 3000.0,
            "ADA/USDT": 0.5,
            "DOT/USDT": 15.0,
            "LINK/USDT": 20.0,
            "XRP/USDT": 0.6,
            "SOL/USDT": 100.0,
            "DOGE/USDT": 0.1,
            "AVAX/USDT": 35.0,
            "MATIC/USDT": 1.2
        }
        
        return base_prices.get(symbol, 10.0)  # Default to $10 if symbol not found
    
    async def get_historical_data(
        self, 
        symbol: str,
        timeframe: str = "1h",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get historical market data for a symbol.
        
        Args:
            symbol: Trading symbol
            timeframe: Timeframe for candles (e.g. "1m", "5m", "1h", "1d")
            limit: Number of candles to return
            
        Returns:
            List of candles with OHLCV data
        """
        # In a real implementation, this would fetch historical data from an exchange
        # For now, we'll simulate the data
        base_price = self._get_base_price_for_symbol(symbol)
        current_time = int(time.time())
        
        # Determine candle duration in seconds
        if timeframe.endswith("m"):
            duration = int(timeframe[:-1]) * 60
        elif timeframe.endswith("h"):
            duration = int(timeframe[:-1]) * 60 * 60
        elif timeframe.endswith("d"):
            duration = int(timeframe[:-1]) * 60 * 60 * 24
        else:
            duration = 3600  # Default to 1h
        
        candles = []
        price = base_price * 0.9  # Start 10% below current price
        
        for i in range(limit):
            timestamp = current_time - (limit - i) * duration
            
            # Simulate price movement
            price_change = price * random.uniform(-0.02, 0.02)  # ±2% change
            price += price_change
            
            # Generate OHLCV data
            open_price = price
            high_price = price * random.uniform(1.0, 1.02)
            low_price = price * random.uniform(0.98, 1.0)
            close_price = price * random.uniform(0.99, 1.01)
            volume = random.uniform(10, 100) * base_price
            
            candle = {
                "timestamp": timestamp,
                "open": round(open_price, 8),
                "high": round(high_price, 8),
                "low": round(low_price, 8),
                "close": round(close_price, 8),
                "volume": round(volume, 2)
            }
            
            candles.append(candle)
        
        logger.debug(f"Generated {len(candles)} historical candles for {symbol}")
        return candles
