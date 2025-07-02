#!/usr/bin/env python3
"""
PoolMind - AI-powered Cross-Exchange Arbitrage Trading System

This is the main entry point for the PoolMind application.
"""

import os
import sys
import argparse
import asyncio
import logging
from pathlib import Path

# Add the parent directory to sys.path to allow importing the poolmind package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from poolmind.main import PoolMind
from poolmind.utils.logging_setup import setup_logging


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="PoolMind - AI-powered Cross-Exchange Arbitrage Trading System"
    )
    
    parser.add_argument(
        "--config", 
        type=str, 
        help="Path to configuration file (.env)"
    )
    
    parser.add_argument(
        "--log-level",
        type=str,
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        default="INFO",
        help="Set the logging level"
    )
    
    parser.add_argument(
        "--log-file",
        type=str,
        help="Path to log file (if not specified, logs to console only)"
    )
    
    parser.add_argument(
        "--cycle-interval",
        type=int,
        help="Trading cycle interval in seconds"
    )
    
    parser.add_argument(
        "--sandbox",
        action="store_true",
        help="Run in sandbox mode (no real trades)"
    )
    
    return parser.parse_args()


async def main():
    """Main entry point for the PoolMind application."""
    args = parse_arguments()
    
    # Set up logging
    setup_logging(
        log_level=args.log_level,
        log_file=args.log_file
    )
    
    logger = logging.getLogger(__name__)
    logger.info("Starting PoolMind application")
    
    # Initialize and run PoolMind
    poolmind = PoolMind()
    
    try:
        await poolmind.run()
    except KeyboardInterrupt:
        logger.info("PoolMind application stopped by user")
    except Exception as e:
        logger.error(f"Error in PoolMind application: {e}", exc_info=True)
    finally:
        logger.info("PoolMind application stopped")


if __name__ == "__main__":
    asyncio.run(main())
"""
Pooled Cross-Exchange Arbitrage Trading System
Main execution script implementing the multi-agent AI system
"""

import asyncio
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, TypedDict
from dataclasses import dataclass, field
from enum import Enum
import json
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
import chromadb
from chromadb.config import Settings
import numpy as np
import pandas as pd
from pydantic import BaseModel
import aiohttp
import websockets
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OpenAIEmbeddings
from langchain.tools import tool
from langchain.schema import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from crewai import Agent, Task, Crew, Process
from crewai.tools import BaseTool
import ccxt
from web3 import Web3
from decimal import Decimal, ROUND_DOWN
import asyncio
from concurrent.futures import ThreadPoolExecutor
import signal
import sys
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('poolmind.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Risk levels
class RiskLevel(Enum):
    LOW = 1
    MEDIUM = 5
    HIGH = 8
    CRITICAL = 10

# State management
class AgentState(TypedDict):
    pool_state: Dict[str, Any]
    market_data: Dict[str, Any]
    opportunities: List[Dict[str, Any]]
    decisions: List[Dict[str, Any]]
    execution_results: List[Dict[str, Any]]
    timestamp: float
    confidence_score: float

@dataclass
class PoolState:
    """Pool state management"""
    total_value: float
    participant_count: int
    liquidity_ratio: float
    withdrawal_queue: List[Dict[str, Any]] = field(default_factory=list)
    nav_per_share: float = 1.0
    last_updated: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'total_value': self.total_value,
            'participant_count': self.participant_count,
            'liquidity_ratio': self.liquidity_ratio,
            'withdrawal_queue_size': len(self.withdrawal_queue),
            'nav_per_share': self.nav_per_share,
            'last_updated': self.last_updated.isoformat()
        }

@dataclass
class ArbitrageOpportunity:
    """Arbitrage opportunity data structure"""
    symbol: str
    buy_exchange: str
    sell_exchange: str
    buy_price: float
    sell_price: float
    spread_percent: float
    volume_available: float
    gas_cost_estimate: float
    profit_estimate: float
    risk_score: int
    confidence: float
    detected_at: datetime = field(default_factory=datetime.now)

class DatabaseManager:
    """Handle PostgreSQL operations"""
    
    def __init__(self):
        self.connection_string = (
            f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
            f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
        )
        self.conn = None
    
    async def connect(self):
        try:
            self.conn = psycopg2.connect(self.connection_string)
            await self._create_tables()
            logger.info("Database connected successfully")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    async def _create_tables(self):
        """Create necessary tables"""
        tables_sql = """
        CREATE TABLE IF NOT EXISTS trade_history (
            id SERIAL PRIMARY KEY,
            opportunity_id VARCHAR(100),
            symbol VARCHAR(20),
            profit DECIMAL(15,8),
            execution_time DECIMAL(10,3),
            slippage DECIMAL(10,6),
            pool_size DECIMAL(20,8),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS pool_states (
            id SERIAL PRIMARY KEY,
            total_value DECIMAL(20,8),
            participant_count INTEGER,
            liquidity_ratio DECIMAL(10,6),
            nav_per_share DECIMAL(15,8),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        with self.conn.cursor() as cursor:
            cursor.execute(tables_sql)
            self.conn.commit()

class RedisManager:
    """Handle Redis operations for real-time data"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            password=os.getenv('REDIS_PASSWORD'),
            decode_responses=True
        )
    
    async def set_pool_state(self, pool_state: PoolState):
        """Store current pool state"""
        await asyncio.to_thread(
            self.redis_client.hset,
            'pool_state',
            mapping=pool_state.to_dict()
        )
    
    async def get_pool_state(self) -> Optional[Dict[str, Any]]:
        """Retrieve current pool state"""
        return await asyncio.to_thread(
            self.redis_client.hgetall,
            'pool_state'
        )

class VectorDBManager:
    """Handle ChromaDB operations for RAG"""
    
    def __init__(self):
        self.client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory="./chroma_db"
        ))
        self.collection = self.client.get_or_create_collection(
            name="trade_history",
            metadata={"hnsw:space": "cosine"}
        )
        self.embeddings = OpenAIEmbeddings()
    
    async def store_trade_outcome(self, context: Dict[str, Any], outcome: Dict[str, Any]):
        """Store trade context and outcome for future reference"""
        try:
            # Create embedding from context
            context_str = json.dumps(context, sort_keys=True)
            embedding = await asyncio.to_thread(
                self.embeddings.embed_query,
                context_str
            )
            
            # Store in ChromaDB
            self.collection.add(
                embeddings=[embedding],
                documents=[context_str],
                metadatas=[{
                    "profit": outcome.get("profit", 0),
                    "execution_time": outcome.get("execution_time", 0),
                    "slippage": outcome.get("slippage", 0),
                    "timestamp": datetime.now().isoformat()
                }],
                ids=[f"trade_{int(time.time())}_{hash(context_str)}"]
            )
            logger.info("Trade outcome stored in vector DB")
        except Exception as e:
            logger.error(f"Failed to store trade outcome: {e}")
    
    async def retrieve_similar_contexts(self, current_context: Dict[str, Any], n_results: int = 5) -> List[Dict[str, Any]]:
        """Retrieve similar trading contexts"""
        try:
            context_str = json.dumps(current_context, sort_keys=True)
            embedding = await asyncio.to_thread(
                self.embeddings.embed_query,
                context_str
            )
            
            results = self.collection.query(
                query_embeddings=[embedding],
                n_results=n_results
            )
            
            return [
                {
                    "context": json.loads(doc),
                    "metadata": meta,
                    "distance": dist
                }
                for doc, meta, dist in zip(
                    results["documents"][0],
                    results["metadatas"][0],
                    results["distances"][0]
                )
            ]
        except Exception as e:
            logger.error(f"Failed to retrieve similar contexts: {e}")
            return []

# Trading Tools
@tool
def calculate_position_size(pool_value: float, risk_tolerance: float, opportunity_profit: float) -> float:
    """Calculate optimal position size based on pool value and risk"""
    max_position = pool_value * 0.1  # Max 10% of pool
    risk_adjusted = max_position * risk_tolerance
    profit_based = min(opportunity_profit * 100, max_position)
    return min(risk_adjusted, profit_based)

@tool
def assess_liquidity_impact(pool_size: float, withdrawal_queue_size: int) -> float:
    """Assess liquidity strain impact score"""
    if pool_size == 0:
        return 10.0  # Maximum strain
    
    queue_ratio = withdrawal_queue_size / pool_size
    if queue_ratio > 0.2:
        return 9.0
    elif queue_ratio > 0.1:
        return 6.0
    elif queue_ratio > 0.05:
        return 3.0
    else:
        return 1.0

@tool
def predict_participant_risk(participant_count: int, pool_volatility: float) -> float:
    """Predict participant risk behavior"""
    base_risk = 1.0
    
    # More participants = lower individual risk
    participant_factor = max(0.1, 1.0 - (participant_count / 1000))
    
    # Higher volatility = higher risk
    volatility_factor = min(10.0, pool_volatility * 5)
    
    return base_risk * participant_factor * volatility_factor

class ExchangeManager:
    """Manage multiple exchange connections"""
    
    def __init__(self):
        self.exchanges = {}
        self._initialize_exchanges()
    
    def _initialize_exchanges(self):
        """Initialize exchange connections"""
        exchange_configs = {
            'binance': {
                'apiKey': os.getenv('BINANCE_API_KEY'),
                'secret': os.getenv('BINANCE_SECRET'),
                'sandbox': os.getenv('SANDBOX_MODE', 'true').lower() == 'true'
            },
            'coinbase': {
                'apiKey': os.getenv('COINBASE_API_KEY'),
                'secret': os.getenv('COINBASE_SECRET'),
                'password': os.getenv('COINBASE_PASSPHRASE'),
                'sandbox': os.getenv('SANDBOX_MODE', 'true').lower() == 'true'
            },
            'kraken': {
                'apiKey': os.getenv('KRAKEN_API_KEY'),
                'secret': os.getenv('KRAKEN_SECRET'),
                'sandbox': os.getenv('SANDBOX_MODE', 'true').lower() == 'true'
            }
        }
        
        for exchange_id, config in exchange_configs.items():
            try:
                exchange_class = getattr(ccxt, exchange_id)
                self.exchanges[exchange_id] = exchange_class(config)
                logger.info(f"Initialized {exchange_id} exchange")
            except Exception as e:
                logger.error(f"Failed to initialize {exchange_id}: {e}")
    
    async def get_ticker(self, exchange_id: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Get ticker data from specific exchange"""
        try:
            exchange = self.exchanges.get(exchange_id)
            if not exchange:
                return None
            
            ticker = await asyncio.to_thread(exchange.fetch_ticker, symbol)
            return ticker
        except Exception as e:
            logger.error(f"Failed to get ticker for {symbol} on {exchange_id}: {e}")
            return None
    
    async def detect_arbitrage_opportunities(self, symbols: List[str]) -> List[ArbitrageOpportunity]:
        """Detect arbitrage opportunities across exchanges"""
        opportunities = []
        
        for symbol in symbols:
            tickers = {}
            
            # Fetch tickers from all exchanges
            for exchange_id in self.exchanges.keys():
                ticker = await self.get_ticker(exchange_id, symbol)
                if ticker:
                    tickers[exchange_id] = ticker
            
            # Find arbitrage opportunities
            for buy_exchange, buy_ticker in tickers.items():
                for sell_exchange, sell_ticker in tickers.items():
                    if buy_exchange != sell_exchange:
                        buy_price = buy_ticker['ask']
                        sell_price = sell_ticker['bid']
                        
                        if sell_price > buy_price:
                            spread_percent = ((sell_price - buy_price) / buy_price) * 100
                            
                            if spread_percent > 0.5:  # Minimum 0.5% spread
                                opportunity = ArbitrageOpportunity(
                                    symbol=symbol,
                                    buy_exchange=buy_exchange,
                                    sell_exchange=sell_exchange,
                                    buy_price=buy_price,
                                    sell_price=sell_price,
                                    spread_percent=spread_percent,
                                    volume_available=min(buy_ticker['quoteVolume'], sell_ticker['quoteVolume']),
                                    gas_cost_estimate=self._estimate_gas_cost(),
                                    profit_estimate=0.0,  # Will be calculated later
                                    risk_score=self._calculate_risk_score(spread_percent),
                                    confidence=0.8
                                )
                                opportunities.append(opportunity)
        
        return opportunities
    
    def _estimate_gas_cost(self) -> float:
        """Estimate gas cost for transactions"""
        # Simplified gas estimation
        return 50.0  # USD
    
    def _calculate_risk_score(self, spread_percent: float) -> int:
        """Calculate risk score based on spread"""
        if spread_percent > 5.0:
            return RiskLevel.CRITICAL.value
        elif spread_percent > 2.0:
            return RiskLevel.HIGH.value
        elif spread_percent > 1.0:
            return RiskLevel.MEDIUM.value
        else:
            return RiskLevel.LOW.value

class MultiLLMManager:
    """Manage multiple LLM providers with fallback"""
    
    def __init__(self):
        self.models = {
            'primary': ChatOpenAI(
                model="gpt-4-turbo-preview",
                temperature=0.1,
                api_key=os.getenv('OPENAI_API_KEY')
            ),
            'secondary': ChatAnthropic(
                model="claude-3-5-sonnet-20241022",
                temperature=0.1,
                api_key=os.getenv('ANTHROPIC_API_KEY')
            )
        }
        self.current_model = 'primary'
    
    async def generate_response(self, messages: List[Any], timeout: float = 2.0) -> Optional[str]:
        """Generate response with fallback mechanism"""
        for model_name, model in self.models.items():
            try:
                start_time = time.time()
                response = await asyncio.wait_for(
                    asyncio.to_thread(model.invoke, messages),
                    timeout=timeout
                )
                
                execution_time = time.time() - start_time
                logger.info(f"LLM response from {model_name} in {execution_time:.2f}s")
                
                return response.content
            except asyncio.TimeoutError:
                logger.warning(f"Timeout for {model_name}, trying fallback")
                continue
            except Exception as e:
                logger.error(f"Error with {model_name}: {e}")
                continue
        
        logger.error("All LLM models failed")
        return None

class PoolAwareStrategyGenerator:
    """Generate trading strategies based on pool state and market conditions"""
    
    def __init__(self, llm_manager: MultiLLMManager, vector_db: VectorDBManager):
        self.llm_manager = llm_manager
        self.vector_db = vector_db
        self.tools = [calculate_position_size, assess_liquidity_impact, predict_participant_risk]
    
    async def generate_strategy(self, pool_state: Dict[str, Any], opportunities: List[ArbitrageOpportunity]) -> Dict[str, Any]:
        """Generate strategy based on current conditions"""
        try:
            # Retrieve similar historical contexts
            context = {
                'pool_size': pool_state.get('total_value', 0),
                'participant_count': pool_state.get('participant_count', 0),
                'liquidity_ratio': pool_state.get('liquidity_ratio', 1.0),
                'opportunity_count': len(opportunities),
                'max_spread': max([op.spread_percent for op in opportunities]) if opportunities else 0
            }
            
            similar_contexts = await self.vector_db.retrieve_similar_contexts(context)
            
            # Prepare prompt
            system_prompt = self._create_strategy_prompt(pool_state, opportunities, similar_contexts)
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Generate optimal strategy for current conditions: {json.dumps(context)}")
            ]
            
            # Generate strategy
            response = await self.llm_manager.generate_response(messages)
            
            if response:
                try:
                    strategy = json.loads(response)
                    strategy['generated_at'] = datetime.now().isoformat()
                    strategy['confidence'] = self._calculate_confidence(strategy, similar_contexts)
                    return strategy
                except json.JSONDecodeError:
                    logger.error("Failed to parse LLM response as JSON")
                    return self._fallback_strategy(pool_state, opportunities)
            else:
                return self._fallback_strategy(pool_state, opportunities)
                
        except Exception as e:
            logger.error(f"Strategy generation failed: {e}")
            return self._fallback_strategy(pool_state, opportunities)
    
    def _create_strategy_prompt(self, pool_state: Dict[str, Any], opportunities: List[ArbitrageOpportunity], similar_contexts: List[Dict[str, Any]]) -> str:
        """Create comprehensive strategy generation prompt"""
        return f"""
        You are an expert arbitrage trading strategist for a pooled investment fund.
        
        Current Pool State:
        - Total Value: ${pool_state.get('total_value', 0):,.2f}
        - Participants: {pool_state.get('participant_count', 0)}
        - Liquidity Ratio: {pool_state.get('liquidity_ratio', 1.0):.2f}
        - Withdrawal Queue: {pool_state.get('withdrawal_queue_size', 0)}
        
        Available Opportunities: {len(opportunities)}
        {[f"- {op.symbol}: {op.spread_percent:.2f}% spread, Risk: {op.risk_score}" for op in opportunities[:5]]}
        
        Historical Context (similar conditions):
        {json.dumps(similar_contexts[:3], indent=2)}
        
        Generate a JSON strategy with:
        {{
            "selected_opportunities": [list of opportunity indices to execute],
            "position_sizes": [corresponding position sizes in USD],
            "risk_assessment": "LOW|MEDIUM|HIGH|CRITICAL",
            "execution_order": [order of execution],
            "stop_loss_triggers": [conditions to halt execution],
            "reasoning": "explanation of strategy decisions"
        }}
        
        Consider:
        1. Pool liquidity constraints
        2. Participant risk tolerance
        3. Historical performance in similar conditions
        4. Gas costs and slippage
        5. Maximum drawdown protection
        """
    
    def _calculate_confidence(self, strategy: Dict[str, Any], similar_contexts: List[Dict[str, Any]]) -> float:
        """Calculate confidence score for generated strategy"""
        base_confidence = 0.7
        
        # Boost confidence if similar contexts had good outcomes
        if similar_contexts:
            avg_profit = np.mean([ctx['metadata'].get('profit', 0) for ctx in similar_contexts])
            if avg_profit > 0:
                base_confidence += 0.2
        
        # Reduce confidence for high-risk strategies
        if strategy.get('risk_assessment') in ['HIGH', 'CRITICAL']:
            base_confidence -= 0.3
        
        return max(0.1, min(1.0, base_confidence))
    
    def _fallback_strategy(self, pool_state: Dict[str, Any], opportunities: List[ArbitrageOpportunity]) -> Dict[str, Any]:
        """Generate fallback strategy using rule-based approach"""
        pool_size = pool_state.get('total_value', 0)
        
        if pool_size < 10000:
            strategy_type = "CONSERVATIVE"
            max_opportunities = 1
            max_position_pct = 0.02
        elif pool_size < 100000:
            strategy_type = "MODERATE" 
            max_opportunities = 3
            max_position_pct = 0.05
        else:
            strategy_type = "AGGRESSIVE"
            max_opportunities = 5
            max_position_pct = 0.10
        
        # Select best opportunities
        sorted_ops = sorted(opportunities, key=lambda x: x.spread_percent, reverse=True)
        selected_ops = sorted_ops[:max_opportunities]
        
        return {
            "selected_opportunities": [opportunities.index(op) for op in selected_ops],
            "position_sizes": [pool_size * max_position_pct / len(selected_ops)] * len(selected_ops),
            "risk_assessment": "MEDIUM",
            "execution_order": list(range(len(selected_ops))),
            "stop_loss_triggers": ["pool_drawdown > 0.15", "liquidity_ratio < 0.5"],
            "reasoning": f"Fallback {strategy_type} strategy due to LLM failure",
            "fallback": True,
            "generated_at": datetime.now().isoformat(),
            "confidence": 0.6
        }

class TradingEngine:
    """Main trading engine orchestrating all components"""
    
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.redis_manager = RedisManager()
        self.vector_db = VectorDBManager()
        self.exchange_manager = ExchangeManager()
        self.llm_manager = MultiLLMManager()
        self.strategy_generator = PoolAwareStrategyGenerator(self.llm_manager, self.vector_db)
        
        self.pool_state = PoolState(
            total_value=float(os.getenv('INITIAL_POOL_VALUE', 100000)),
            participant_count=int(os.getenv('INITIAL_PARTICIPANTS', 10)),
            liquidity_ratio=1.0
        )
        
        self.symbols = os.getenv('TRADING_SYMBOLS', 'BTC/USDT,ETH/USDT,ADA/USDT').split(',')
        self.running = False
        
        # Performance metrics
        self.metrics = {
            'opportunities_detected': 0,
            'opportunities_executed': 0,
            'total_profit': 0.0,
            'fallback_activations': 0,
            'error_count': 0
        }
    
    async def initialize(self):
        """Initialize all components"""
        try:
            await self.db_manager.connect()
            await self.redis_manager.set_pool_state(self.pool_state)
            logger.info("Trading engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize trading engine: {e}")
            raise
    
    async def observe_node(self, state: AgentState) -> AgentState:
        """Observe market conditions and pool state"""
        try:
            # Update pool state
            current_pool = await self.redis_manager.get_pool_state()
            if current_pool:
                state['pool_state'] = current_pool
            else:
                state['pool_state'] = self.pool_state.to_dict()
            
            # Detect arbitrage opportunities
            opportunities = await self.exchange_manager.detect_arbitrage_opportunities(self.symbols)
            state['opportunities'] = [
                {
                    'symbol': op.symbol,
                    'buy_exchange': op.buy_exchange,
                    'sell_exchange': op.sell_exchange,
                    'spread_percent': op.spread_percent,
                    'profit_estimate': op.profit_estimate,
                    'risk_score': op.risk_score
                }
                for op in opportunities
            ]
            
            self.metrics['opportunities_detected'] += len(opportunities)
            state['timestamp'] = time.time()
            
            logger.info(f"Observed {len(opportunities)} opportunities")
            return state
            
        except Exception as e:
            logger.error(f"Observe node failed: {e}")
            self.metrics['error_count'] += 1
            return state
    
    async def reason_node(self, state: AgentState) -> AgentState:
        """Generate trading strategy based on observations"""
        try:
            opportunities = [
                ArbitrageOpportunity(
                    symbol=op['symbol'],
                    buy_exchange=op['buy_exchange'],
                    sell_exchange=op['sell_exchange'],
                    buy_price=0,
                    sell_price=0,
                    spread_percent=op['spread_percent'],
                    volume_available=10000,
                    gas_cost_estimate=50,
                    profit_estimate=op['profit_estimate'],
                    risk_score=op['risk_score'],
                    confidence=0.8
                )
                for op in state['opportunities']
            ]
            
            strategy = await self.strategy_generator.generate_strategy(
                state['pool_state'],
                opportunities
            )
            
            state['decisions'] = [strategy]
            state['confidence_score'] = strategy.get('confidence', 0.5)
            
            if strategy.get('fallback'):
                self.metrics['fallback_activations'] += 1
            
            logger.info(f"Generated strategy with confidence: {state['confidence_score']:.2f}")
            return state
            
        except Exception as e:
            logger.error(f"Reason node failed: {e}")
            self.metrics['error_count'] += 1
            return state
    
    async def act_node(self, state: AgentState) -> AgentState:
        """Execute trading decisions"""
        try:
            if not state.get('decisions'):
                return state
            
            strategy = state['decisions'][0]
            
            # Simulate trade execution (replace with actual trading logic)
            execution_results = []
            selected_indices = strategy.get('selected_opportunities', [])
            position_sizes = strategy.get('position_sizes', [])
            
            for i, pos_size in zip(selected_indices, position_sizes):
                if i < len(state['opportunities']):
                    opportunity = state['opportunities'][i]
                    
                    # Simulate execution
                    simulated_profit = pos_size * (opportunity['spread_percent'] / 100) * 0.8  # 80% of theoretical
                    simulated_slippage = 0.1  # 0.1% slippage
                    
                    result = {
                        'opportunity_index': i,
                        'symbol': opportunity['symbol'],
                        'position_size': pos_size,
                        'profit': simulated_profit,
                        'slippage': simulated_slippage,
                        'execution_time': 1.5,
                        'success': True
                    }
                    
                    execution_results.append(result)
                    self.metrics['opportunities_executed'] += 1
                    self.metrics['total_profit'] += simulated_profit
            
            state['execution_results'] = execution_results
            
            logger.info(f"Executed {len(execution_results)} trades")
            return state
            
        except Exception as e:
            logger.error(f"Act node failed: {e}")
            self.metrics['error_count'] += 1
            return state
    
    async def reflect_node(self, state: AgentState) -> AgentState:
        """Analyze performance and update learning"""
        try:
            if not state.get('execution_results'):
                return state
            
            # Store outcomes in vector DB
            for result in state['execution_results']:
                context = {
                    'pool_size': state['pool_state']['total_value'],
                    'participant_count': state['pool_state']['participant_count'],
                    'spread_size': state['opportunities'][result['opportunity_index']]['spread_percent'],
                    'position_size': result['position_size']
                }
                
                outcome = {
                    'profit': result['profit'],
                    'execution_time': result['execution_time'],
                    'slippage': result['slippage']
                }
                
                await self.vector_db.store_trade_outcome(context, outcome)
            
            # Update pool state
            total_profit = sum(r['profit'] for r in state['execution_results'])
            self.pool_state.total_value += total_profit
            self.pool_state.nav_per_share = self.pool_state.total_value / (self.pool_state.participant_count * 1000)  # Assuming 1000 shares per participant
            self.pool_state.last_updated = datetime.now()
            
            await self.redis_manager.set_pool_state(self.pool_state)
            
            logger.info(f"Reflection complete. Total profit: ${total_profit:.2f}")
            return state
            
        except Exception as e:
            logger.error(f"Reflect node failed: {e}")
            self.metrics['error_count'] += 1
            return state
    
    def create_state_graph(self) -> StateGraph:
        """Create LangGraph state machine"""
        builder = StateGraph(AgentState)
        
        builder.add_node("observe", self.observe_node)
        builder.add_node("reason", self.reason_node)
        builder.add_node("act", self.act_node)
        builder.add_node("reflect", self.reflect_node)
        
        builder.set_entry_point("observe")
        builder.add_edge("observe", "reason")
        builder.add_edge("reason", "act")
        builder.add_edge("act", "reflect")
        builder.add_edge("reflect", "observe")  # Continuous loop
        
        return builder.compile()
    
    async def run_trading_cycle(self):
        """Run single trading cycle"""
        try:
            graph = self.create_state_graph()
            
            initial_state = AgentState(
                pool_state={},
                market_data={},
                opportunities=[],
                decisions=[],
                execution_results=[],
                timestamp=time.time(),
                confidence_score=0.0
            )
            
            # Run one complete cycle
            result = await asyncio.to_thread(
                graph.invoke,
                initial_state,
                {"recursion_limit": 4}  # One full cycle: observe -> reason -> act -> reflect
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Trading cycle failed: {e}")
            self.metrics['error_count'] += 1
            return None
    
    async def start_trading(self):
        """Start the main trading loop"""
        self.running = True
        logger.info("Starting trading engine...")
        
        try:
            while self.running:
                cycle_start = time.time()
                
                # Run trading cycle
                result = await self.run_trading_cycle()
                
                cycle_time = time.time() - cycle_start
                
                # Log performance metrics
                self._log_metrics(cycle_time)
                
                # Check circuit breaker conditions
                if self._should_trigger_circuit_breaker():
                    logger.warning("Circuit breaker triggered - pausing trading")
                    await asyncio.sleep(300)  # 5 minute pause
                    continue
                
                # Wait before next cycle (configurable interval)
                cycle_interval = float(os.getenv('CYCLE_INTERVAL', 30))  # 30 seconds default
                await asyncio.sleep(max(0, cycle_interval - cycle_time))
                
        except Exception as e:
            logger.error(f"Trading engine crashed: {e}")
            self.running = False
        finally:
            logger.info("Trading engine stopped")
    
    def _log_metrics(self, cycle_time: float):
        """Log performance metrics"""
        logger.info(f"Cycle completed in {cycle_time:.2f}s")
        logger.info(f"Metrics: {json.dumps(self.metrics, indent=2)}")
        
        # Calculate success rates
        if self.metrics['opportunities_detected'] > 0:
            execution_rate = (self.metrics['opportunities_executed'] / self.metrics['opportunities_detected']) * 100
            logger.info(f"Execution rate: {execution_rate:.1f}%")
        
        if self.metrics['opportunities_executed'] > 0:
            avg_profit = self.metrics['total_profit'] / self.metrics['opportunities_executed']
            logger.info(f"Average profit per trade: ${avg_profit:.2f}")
    
    def _should_trigger_circuit_breaker(self) -> bool:
        """Check if circuit breaker should be triggered"""
        # Error rate too high
        total_operations = self.metrics['opportunities_detected'] + self.metrics['opportunities_executed']
        if total_operations > 10:
            error_rate = self.metrics['error_count'] / total_operations
            if error_rate > 0.15:  # 15% error rate
                return True
        
        # Too many fallback activations
        if self.metrics['opportunities_executed'] > 0:
            fallback_rate = self.metrics['fallback_activations'] / self.metrics['opportunities_executed']
            if fallback_rate > 0.3:  # 30% fallback rate
                return True
        
        # Pool drawdown too high
        initial_value = float(os.getenv('INITIAL_POOL_VALUE', 100000))
        current_drawdown = (initial_value - self.pool_state.total_value) / initial_value
        if current_drawdown > 0.15:  # 15% drawdown
            return True
        
        return False
    
    def stop_trading(self):
        """Stop the trading engine"""
        self.running = False
        logger.info("Trading engine stop requested")

class HealthMonitor:
    """Monitor system health and performance"""
    
    def __init__(self, trading_engine: TradingEngine):
        self.trading_engine = trading_engine
        self.health_checks = {
            'database': self._check_database,
            'redis': self._check_redis,
            'exchanges': self._check_exchanges,
            'llm_services': self._check_llm_services
        }
    
    async def run_health_checks(self) -> Dict[str, bool]:
        """Run all health checks"""
        results = {}
        
        for check_name, check_func in self.health_checks.items():
            try:
                results[check_name] = await check_func()
            except Exception as e:
                logger.error(f"Health check {check_name} failed: {e}")
                results[check_name] = False
        
        return results
    
    async def _check_database(self) -> bool:
        """Check database connectivity"""
        try:
            if self.trading_engine.db_manager.conn:
                with self.trading_engine.db_manager.conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    return True
            return False
        except:
            return False
    
    async def _check_redis(self) -> bool:
        """Check Redis connectivity"""
        try:
            await asyncio.to_thread(self.trading_engine.redis_manager.redis_client.ping)
            return True
        except:
            return False
    
    async def _check_exchanges(self) -> bool:
        """Check exchange connectivity"""
        try:
            for exchange_id, exchange in self.trading_engine.exchange_manager.exchanges.items():
                await asyncio.to_thread(exchange.fetch_status)
            return True
        except:
            return False
    
    async def _check_llm_services(self) -> bool:
        """Check LLM service availability"""
        try:
            test_response = await self.trading_engine.llm_manager.generate_response([
                HumanMessage(content="Health check")
            ], timeout=5.0)
            return test_response is not None
        except:
            return False

async def graceful_shutdown(trading_engine: TradingEngine):
    """Handle graceful shutdown"""
    logger.info("Initiating graceful shutdown...")
    
    # Stop trading
    trading_engine.stop_trading()
    
    # Wait for current operations to complete
    await asyncio.sleep(5)
    
    # Close database connections
    if trading_engine.db_manager.conn:
        trading_engine.db_manager.conn.close()
    
    logger.info("Shutdown complete")

def signal_handler(signum, frame, trading_engine):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}")
    asyncio.create_task(graceful_shutdown(trading_engine))

async def main():
    """Main entry point"""
    try:
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()
        
        # Initialize trading engine
        trading_engine = TradingEngine()
        await trading_engine.initialize()
        
        # Setup signal handlers
        import functools
        signal.signal(signal.SIGINT, functools.partial(signal_handler, trading_engine=trading_engine))
        signal.signal(signal.SIGTERM, functools.partial(signal_handler, trading_engine=trading_engine))
        
        # Initialize health monitor
        health_monitor = HealthMonitor(trading_engine)
        
        # Run initial health checks
        health_status = await health_monitor.run_health_checks()
        logger.info(f"Initial health status: {health_status}")
        
        if not all(health_status.values()):
            logger.warning("Some health checks failed - proceeding with caution")
        
        # Start health monitoring task
        health_task = asyncio.create_task(periodic_health_checks(health_monitor))
        
        # Start main trading loop
        await trading_engine.start_trading()
        
        # Cancel health monitoring
        health_task.cancel()
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Main execution failed: {e}")
        raise
    finally:
        if 'trading_engine' in locals():
            await graceful_shutdown(trading_engine)

async def periodic_health_checks(health_monitor: HealthMonitor):
    """Run periodic health checks"""
    while True:
        try:
            await asyncio.sleep(300)  # Every 5 minutes
            health_status = await health_monitor.run_health_checks()
            
            failed_checks = [name for name, status in health_status.items() if not status]
            if failed_checks:
                logger.warning(f"Failed health checks: {failed_checks}")
            else:
                logger.info("All health checks passed")
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Health check task failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())