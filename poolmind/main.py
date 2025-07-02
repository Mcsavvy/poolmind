"""Main module for the PoolMind arbitrage trading system."""

import time
import logging
import json
from typing import Dict, List, Any, Optional
import asyncio

from .core.config import config
from .core.pool_state import PoolState
from .core.arbitrage import ArbitrageDetector, ArbitrageExecutor
from .ai.agent import StrategyAgent, RiskAssessmentAgent
from .utils.market_data import MarketDataCollector
from .utils.logging_setup import setup_logging

logger = logging.getLogger(__name__)


class PoolMind:
    """Main class for the PoolMind arbitrage trading system."""
    
    def __init__(self):
        """Initialize the PoolMind system."""
        # Set up logging
        setup_logging(log_level=config.debug and "DEBUG" or "INFO")
        
        logger.info("Initializing PoolMind system")
        
        # Initialize core components
        self.pool_state = PoolState(
            initial_pool_value=config.trading_config["initial_pool_value"],
            initial_participants=config.trading_config["initial_participants"]
        )
        
        self.arbitrage_detector = ArbitrageDetector(
            min_spread_threshold=config.trading_config["min_spread_threshold"]
        )
        
        self.arbitrage_executor = ArbitrageExecutor(
            max_position_size_pct=config.trading_config["max_position_size_pct"]
        )
        
        # Initialize AI agents
        self.strategy_agent = StrategyAgent()
        self.risk_agent = RiskAssessmentAgent()
        
        # Initialize market data collector
        self.market_data_collector = MarketDataCollector(
            symbols=config.trading_config["trading_symbols"]
        )
        
        # Runtime variables
        self.is_running = False
        self.cycle_interval = config.trading_config["cycle_interval"]
        self.last_cycle_time = 0
        self.execution_history = []
    
    async def run_cycle(self) -> Dict[str, Any]:
        """Run a single trading cycle.
        
        Returns:
            Dictionary with cycle results
        """
        cycle_start_time = time.time()
        cycle_id = int(cycle_start_time)
        
        logger.info(f"Starting trading cycle {cycle_id}")
        
        # Step 1: Collect market data
        logger.info("Collecting market data")
        market_data = await self.market_data_collector.get_market_data()
        
        # Step 2: Detect arbitrage opportunities
        logger.info("Detecting arbitrage opportunities")
        opportunities = self.arbitrage_detector.scan_for_opportunities(market_data)
        filtered_opportunities = self.arbitrage_detector.filter_opportunities(opportunities)
        
        # Step 3: Generate trading strategy
        if filtered_opportunities:
            logger.info("Generating trading strategy")
            pool_metrics = self.pool_state.get_pool_metrics()
            strategy_result = self.strategy_agent.generate_strategy(
                pool_state=pool_metrics,
                market_data=market_data,
                opportunities=[opp.to_dict() for opp in filtered_opportunities]
            )
            
            if "error" in strategy_result:
                logger.error(f"Error generating strategy: {strategy_result['error']}")
                return {
                    "cycle_id": cycle_id,
                    "status": "error",
                    "error": strategy_result["error"],
                    "duration": time.time() - cycle_start_time
                }
            
            strategy = strategy_result["strategy"]
            
            # Step 4: Assess risk
            logger.info("Assessing risk")
            risk_result = self.risk_agent.assess_risk(
                pool_state=pool_metrics,
                strategy=strategy,
                opportunities=[opp.to_dict() for opp in filtered_opportunities]
            )
            
            risk_assessment = risk_result.get("assessment", {})
            
            # Step 5: Execute trades if risk is acceptable
            executions = []
            if risk_assessment.get("risk_score", 10) <= 7:  # Risk threshold
                logger.info("Executing trades")
                
                for i, opp_index in enumerate(strategy.get("selected_opportunities", [])):
                    if opp_index < len(filtered_opportunities):
                        opportunity = filtered_opportunities[opp_index]
                        position_size = strategy["position_sizes"][i] if i < len(strategy["position_sizes"]) else 0
                        
                        if position_size > 0:
                            execution_result = self.arbitrage_executor.execute_arbitrage(
                                opportunity=opportunity,
                                position_size_usd=position_size,
                                exchange_apis={}  # Would contain actual exchange API clients
                            )
                            executions.append(execution_result)
                
                # Update pool state based on executions
                if executions:
                    total_profit = sum(exec_result["profit_usd"] for exec_result in executions)
                    new_pool_value = self.pool_state.current_pool_value + total_profit
                    self.pool_state.update_pool_value(new_pool_value)
            else:
                logger.info(f"Skipping execution due to high risk score: {risk_assessment.get('risk_score')}")
            
            cycle_result = {
                "cycle_id": cycle_id,
                "status": "completed",
                "opportunities_found": len(opportunities),
                "opportunities_filtered": len(filtered_opportunities),
                "strategy": strategy,
                "risk_assessment": risk_assessment,
                "executions": executions,
                "pool_metrics": self.pool_state.get_pool_metrics(),
                "duration": time.time() - cycle_start_time
            }
        else:
            logger.info("No viable arbitrage opportunities found")
            cycle_result = {
                "cycle_id": cycle_id,
                "status": "completed",
                "opportunities_found": len(opportunities),
                "opportunities_filtered": 0,
                "message": "No viable arbitrage opportunities found",
                "pool_metrics": self.pool_state.get_pool_metrics(),
                "duration": time.time() - cycle_start_time
            }
        
        self.last_cycle_time = time.time()
        self.execution_history.append(cycle_result)
        
        # Keep only the last 100 cycle results
        if len(self.execution_history) > 100:
            self.execution_history = self.execution_history[-100:]
        
        return cycle_result
    
    async def run(self) -> None:
        """Run the PoolMind system continuously."""
        self.is_running = True
        logger.info("Starting PoolMind system")
        
        try:
            while self.is_running:
                await self.run_cycle()
                
                # Sleep until next cycle
                await asyncio.sleep(self.cycle_interval)
        except KeyboardInterrupt:
            logger.info("PoolMind system stopped by user")
        except Exception as e:
            logger.error(f"Error in PoolMind system: {e}", exc_info=True)
        finally:
            self.is_running = False
            logger.info("PoolMind system stopped")
    
    def stop(self) -> None:
        """Stop the PoolMind system."""
        self.is_running = False
        logger.info("Stopping PoolMind system")
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the PoolMind system.
        
        Returns:
            Dictionary with system status
        """
        return {
            "is_running": self.is_running,
            "last_cycle_time": self.last_cycle_time,
            "pool_metrics": self.pool_state.get_pool_metrics(),
            "execution_count": len(self.execution_history),
            "recent_executions": self.execution_history[-5:] if self.execution_history else []
        }


def main():
    """Main entry point for the PoolMind system."""
    poolmind = PoolMind()
    
    try:
        asyncio.run(poolmind.run())
    except KeyboardInterrupt:
        logger.info("PoolMind system stopped by user")


if __name__ == "__main__":
    main()
