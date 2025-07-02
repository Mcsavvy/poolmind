"""Arbitrage detection and execution for the PoolMind system."""

from typing import Dict, List, Any, Optional, Tuple
import time
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ArbitrageOpportunity:
    """Represents an arbitrage opportunity between exchanges."""
    
    symbol: str
    buy_exchange: str
    sell_exchange: str
    buy_price: float
    sell_price: float
    spread_pct: float
    max_volume_usd: float
    timestamp: float = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()
    
    @property
    def profit_pct(self) -> float:
        """Calculate the potential profit percentage."""
        return self.spread_pct - self.estimated_fees_pct
    
    @property
    def estimated_fees_pct(self) -> float:
        """Estimate the total fees for this arbitrage as a percentage."""
        # This is a simplified estimate - in reality would depend on exchange fee structures
        return 0.2  # Assuming 0.1% fee on each exchange (buy and sell)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "symbol": self.symbol,
            "buy_exchange": self.buy_exchange,
            "sell_exchange": self.sell_exchange,
            "buy_price": self.buy_price,
            "sell_price": self.sell_price,
            "spread_pct": self.spread_pct,
            "profit_pct": self.profit_pct,
            "max_volume_usd": self.max_volume_usd,
            "timestamp": self.timestamp
        }


class ArbitrageDetector:
    """Detects arbitrage opportunities across exchanges."""
    
    def __init__(self, min_spread_threshold: float = 0.5):
        """Initialize the arbitrage detector.
        
        Args:
            min_spread_threshold: Minimum spread percentage to consider as an opportunity
        """
        self.min_spread_threshold = min_spread_threshold
        self.last_scan_time = 0
    
    def scan_for_opportunities(
        self, 
        market_data: Dict[str, Dict[str, Dict[str, float]]]
    ) -> List[ArbitrageOpportunity]:
        """Scan market data for arbitrage opportunities.
        
        Args:
            market_data: Nested dictionary with structure:
                {symbol: {exchange: {"bid": price, "ask": price, "volume": volume}}}
                
        Returns:
            List of arbitrage opportunities
        """
        opportunities = []
        self.last_scan_time = time.time()
        
        # Iterate through each symbol
        for symbol, exchanges_data in market_data.items():
            # Find best bid and ask across exchanges
            best_bids = []
            best_asks = []
            
            for exchange, prices in exchanges_data.items():
                if "bid" in prices and prices["bid"] > 0:
                    best_bids.append((exchange, prices["bid"], prices.get("volume", 0)))
                if "ask" in prices and prices["ask"] > 0:
                    best_asks.append((exchange, prices["ask"], prices.get("volume", 0)))
            
            # Sort bids descending (highest bid first) and asks ascending (lowest ask first)
            best_bids.sort(key=lambda x: x[1], reverse=True)
            best_asks.sort(key=lambda x: x[1])
            
            # Check for opportunities
            for sell_exchange, sell_price, sell_volume in best_bids:
                for buy_exchange, buy_price, buy_volume in best_asks:
                    # Skip if same exchange (can't arbitrage on same exchange)
                    if sell_exchange == buy_exchange:
                        continue
                    
                    # Calculate spread
                    spread = sell_price - buy_price
                    spread_pct = (spread / buy_price) * 100
                    
                    # If spread exceeds threshold, we have an opportunity
                    if spread_pct > self.min_spread_threshold:
                        # Calculate maximum volume based on available liquidity
                        max_volume_native = min(sell_volume, buy_volume)
                        max_volume_usd = max_volume_native * buy_price
                        
                        opportunity = ArbitrageOpportunity(
                            symbol=symbol,
                            buy_exchange=buy_exchange,
                            sell_exchange=sell_exchange,
                            buy_price=buy_price,
                            sell_price=sell_price,
                            spread_pct=spread_pct,
                            max_volume_usd=max_volume_usd
                        )
                        
                        opportunities.append(opportunity)
        
        # Sort opportunities by profit percentage
        opportunities.sort(key=lambda x: x.profit_pct, reverse=True)
        
        logger.info(f"Found {len(opportunities)} arbitrage opportunities")
        return opportunities
    
    def filter_opportunities(
        self, 
        opportunities: List[ArbitrageOpportunity], 
        min_profit_pct: float = 0.1,
        min_volume_usd: float = 1000
    ) -> List[ArbitrageOpportunity]:
        """Filter arbitrage opportunities based on criteria.
        
        Args:
            opportunities: List of arbitrage opportunities
            min_profit_pct: Minimum profit percentage after fees
            min_volume_usd: Minimum volume in USD
            
        Returns:
            Filtered list of arbitrage opportunities
        """
        filtered = [
            opp for opp in opportunities
            if opp.profit_pct >= min_profit_pct and opp.max_volume_usd >= min_volume_usd
        ]
        
        logger.info(f"Filtered {len(opportunities)} opportunities to {len(filtered)}")
        return filtered


class ArbitrageExecutor:
    """Executes arbitrage trades based on detected opportunities."""
    
    def __init__(self, max_position_size_pct: float = 0.1):
        """Initialize the arbitrage executor.
        
        Args:
            max_position_size_pct: Maximum position size as percentage of pool value
        """
        self.max_position_size_pct = max_position_size_pct
    
    def calculate_position_size(
        self, 
        opportunity: ArbitrageOpportunity, 
        pool_value: float
    ) -> float:
        """Calculate the optimal position size for an arbitrage opportunity.
        
        Args:
            opportunity: The arbitrage opportunity
            pool_value: Current pool value in USD
            
        Returns:
            Position size in USD
        """
        # Calculate maximum position based on pool value
        max_position_by_pool = pool_value * self.max_position_size_pct
        
        # Use the smaller of max position by pool or max volume by liquidity
        position_size = min(max_position_by_pool, opportunity.max_volume_usd)
        
        # Apply additional risk scaling based on spread
        # Higher spread = more confidence, but still cap at max position
        confidence_factor = min(opportunity.spread_pct / 2, 1.0)
        
        return position_size * confidence_factor
    
    def execute_arbitrage(
        self, 
        opportunity: ArbitrageOpportunity, 
        position_size_usd: float,
        exchange_apis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute an arbitrage trade.
        
        Args:
            opportunity: The arbitrage opportunity
            position_size_usd: Position size in USD
            exchange_apis: Dictionary of exchange API clients
            
        Returns:
            Dictionary with execution results
        """
        # In a real implementation, this would interact with exchange APIs
        # For now, we'll simulate the execution
        
        logger.info(f"Executing arbitrage: {opportunity.symbol} - "
                   f"Buy on {opportunity.buy_exchange} at {opportunity.buy_price}, "
                   f"Sell on {opportunity.sell_exchange} at {opportunity.sell_price}")
        
        # Calculate native asset amount
        asset_amount = position_size_usd / opportunity.buy_price
        
        # Simulate execution with random slippage
        import random
        buy_slippage_pct = random.uniform(0, 0.2)  # 0-0.2% slippage
        sell_slippage_pct = random.uniform(0, 0.2)
        
        actual_buy_price = opportunity.buy_price * (1 + buy_slippage_pct/100)
        actual_sell_price = opportunity.sell_price * (1 - sell_slippage_pct/100)
        
        # Calculate actual profit
        cost_usd = asset_amount * actual_buy_price
        revenue_usd = asset_amount * actual_sell_price
        profit_usd = revenue_usd - cost_usd
        profit_pct = (profit_usd / cost_usd) * 100
        
        execution_result = {
            "opportunity": opportunity.to_dict(),
            "position_size_usd": position_size_usd,
            "asset_amount": asset_amount,
            "actual_buy_price": actual_buy_price,
            "actual_sell_price": actual_sell_price,
            "cost_usd": cost_usd,
            "revenue_usd": revenue_usd,
            "profit_usd": profit_usd,
            "profit_pct": profit_pct,
            "execution_time": time.time(),
            "success": profit_pct > 0
        }
        
        logger.info(f"Arbitrage execution result: {profit_usd:.2f} USD ({profit_pct:.2f}%)")
        return execution_result
