#!/usr/bin/env python3
"""
PoolMind API - FastAPI REST API for the PoolMind Arbitrage Trading System

This module provides a REST API interface to the PoolMind system.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import uvicorn
from pathlib import Path

from poolmind.main import PoolMind
from poolmind.core.config import config
from poolmind.utils.logging_setup import setup_logging

# Set up logging
setup_logging(log_level=config.debug and "DEBUG" or "INFO")
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PoolMind API",
    description="AI-powered Cross-Exchange Arbitrage Trading System API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
static_dir = Path(__file__).parent / "static"
if not static_dir.exists():
    static_dir.mkdir(parents=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Initialize PoolMind instance
poolmind = PoolMind()
background_task = None

# Pydantic models for request/response validation
class ParticipantModel(BaseModel):
    id: str
    investment: float = Field(..., gt=0, description="Initial investment amount in USD")

class WithdrawalRequestModel(BaseModel):
    participant_id: str
    amount: float = Field(..., gt=0, description="Amount to withdraw in USD")

class ArbitrageOpportunityResponse(BaseModel):
    symbol: str
    buy_exchange: str
    sell_exchange: str
    buy_price: float
    sell_price: float
    spread_pct: float
    profit_pct: float
    max_volume_usd: float
    timestamp: float

class PoolMetricsResponse(BaseModel):
    total_pool_value: float
    initial_pool_value: float
    cash_reserve: float
    cash_ratio: float
    roi: float
    participant_count: int
    asset_count: int
    assets: Dict[str, float]
    age_days: float
    last_update: float

class StatusResponse(BaseModel):
    is_running: bool
    last_cycle_time: float
    pool_metrics: Dict[str, Any]
    execution_count: int
    recent_executions: List[Dict[str, Any]]

# Background task to run PoolMind
async def run_poolmind():
    try:
        await poolmind.run()
    except Exception as e:
        logger.error(f"Error in PoolMind background task: {e}", exc_info=True)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting PoolMind API")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down PoolMind API")
    if poolmind.is_running:
        poolmind.stop()

# API endpoints
@app.get("/", tags=["General"])
async def root():
    """Serve the frontend dashboard."""
    return FileResponse(str(static_dir / "index.html"))

@app.get("/api", tags=["General"])
async def api_info():
    """API information endpoint."""
    return {
        "name": "PoolMind API",
        "version": "1.0.0",
        "description": "AI-powered Cross-Exchange Arbitrage Trading System"
    }

@app.get("/status", response_model=StatusResponse, tags=["System"])
async def get_status():
    """Get the current status of the PoolMind system."""
    return poolmind.get_status()

@app.post("/start", tags=["System"])
async def start_system(background_tasks: BackgroundTasks):
    """Start the PoolMind system."""
    if poolmind.is_running:
        return {"message": "PoolMind system is already running"}
    
    background_tasks.add_task(run_poolmind)
    return {"message": "PoolMind system started"}

@app.post("/stop", tags=["System"])
async def stop_system():
    """Stop the PoolMind system."""
    if not poolmind.is_running:
        return {"message": "PoolMind system is not running"}
    
    poolmind.stop()
    return {"message": "PoolMind system stopped"}

@app.post("/run-cycle", tags=["Trading"])
async def run_single_cycle():
    """Run a single trading cycle."""
    if poolmind.is_running:
        raise HTTPException(
            status_code=400,
            detail="Cannot run a single cycle while system is running continuously"
        )
    
    try:
        result = await poolmind.run_cycle()
        return result
    except Exception as e:
        logger.error(f"Error running cycle: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error running cycle: {str(e)}"
        )

@app.get("/pool", response_model=PoolMetricsResponse, tags=["Pool"])
async def get_pool_metrics():
    """Get the current pool metrics."""
    return poolmind.pool_state.get_pool_metrics()

@app.get("/participants", tags=["Participants"])
async def get_participants(participant_id: Optional[str] = None):
    """Get information about participants."""
    return poolmind.pool_state.get_participant_metrics(participant_id)

@app.post("/participants", status_code=status.HTTP_201_CREATED, tags=["Participants"])
async def add_participant(participant: ParticipantModel):
    """Add a new participant to the pool."""
    success = poolmind.pool_state.add_participant(
        participant_id=participant.id,
        investment=participant.investment
    )
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail=f"Participant with ID {participant.id} already exists"
        )
    
    return {"message": f"Participant {participant.id} added successfully"}

@app.post("/withdrawals", tags=["Participants"])
async def request_withdrawal(withdrawal: WithdrawalRequestModel):
    """Request a withdrawal from the pool."""
    success = poolmind.pool_state.request_withdrawal(
        participant_id=withdrawal.participant_id,
        amount=withdrawal.amount
    )
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Withdrawal request failed - check participant ID and amount"
        )
    
    return {"message": "Withdrawal request submitted successfully"}

@app.post("/process-withdrawals", tags=["System"])
async def process_withdrawals():
    """Process all pending withdrawal requests."""
    processed = poolmind.pool_state.process_withdrawals()
    return {
        "processed_count": len(processed),
        "withdrawals": processed
    }

@app.get("/config", tags=["System"])
async def get_config():
    """Get the current system configuration."""
    return {
        "environment": config.environment,
        "debug": config.debug,
        "sandbox_mode": config.sandbox_mode,
        "trading_config": config.trading_config,
        "feature_flags": config.feature_flags
    }

def main():
    """Run the FastAPI application with Uvicorn."""
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=config.debug
    )

if __name__ == "__main__":
    main()
