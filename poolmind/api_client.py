"""
PoolMind API Client - Client for interacting with the external PoolMind API

This module provides a client interface to the external PoolMind API at
https://poolmind.futurdevs.com/api
"""

import logging
import json
import time
from typing import Dict, List, Any, Optional
import aiohttp
import asyncio
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

class PoolMindAPIClient:
    """Client for interacting with the external PoolMind API."""
    
    def __init__(self, base_url: str = "https://poolmind.futurdevs.com/api"):
        """Initialize the API client.
        
        Args:
            base_url: Base URL of the PoolMind API
        """
        self.base_url = base_url
        self.session = None
        self._initialize_session()
    
    def _initialize_session(self):
        """Initialize the aiohttp session."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={"Content-Type": "application/json"}
            )
    
    async def close(self):
        """Close the aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def _request(self, method: str, endpoint: str, data: Any = None) -> Dict[str, Any]:
        """Make a request to the API.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            data: Request data
            
        Returns:
            API response as a dictionary
        """
        self._initialize_session()
        url = urljoin(self.base_url, endpoint)
        
        try:
            async with self.session.request(method, url, json=data) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientResponseError as e:
            logger.error(f"API request error: {e.status} - {e.message}")
            return {"error": f"API request failed: {e.status} - {e.message}"}
        except aiohttp.ClientError as e:
            logger.error(f"Connection error: {str(e)}")
            return {"error": f"Connection error: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return {"error": f"Unexpected error: {str(e)}"}
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the PoolMind system."""
        return await self._request("GET", "/status")
    
    async def start_system(self) -> Dict[str, Any]:
        """Start the PoolMind system."""
        return await self._request("POST", "/start")
    
    async def stop_system(self) -> Dict[str, Any]:
        """Stop the PoolMind system."""
        return await self._request("POST", "/stop")
    
    async def run_cycle(self) -> Dict[str, Any]:
        """Run a single trading cycle."""
        return await self._request("POST", "/run-cycle")
    
    async def get_pool_metrics(self) -> Dict[str, Any]:
        """Get the current pool metrics."""
        return await self._request("GET", "/pool")
    
    async def get_participants(self, participant_id: Optional[str] = None) -> Dict[str, Any]:
        """Get information about participants.
        
        Args:
            participant_id: Optional ID of a specific participant
            
        Returns:
            Participant information
        """
        endpoint = "/participants"
        if participant_id:
            endpoint += f"?participant_id={participant_id}"
        return await self._request("GET", endpoint)
    
    async def add_participant(self, participant_id: str, investment: float) -> Dict[str, Any]:
        """Add a new participant to the pool.
        
        Args:
            participant_id: Participant ID
            investment: Initial investment amount in USD
            
        Returns:
            API response
        """
        data = {
            "id": participant_id,
            "investment": investment
        }
        return await self._request("POST", "/participants", data)
    
    async def request_withdrawal(self, participant_id: str, amount: float) -> Dict[str, Any]:
        """Request a withdrawal from the pool.
        
        Args:
            participant_id: Participant ID
            amount: Amount to withdraw in USD
            
        Returns:
            API response
        """
        data = {
            "participant_id": participant_id,
            "amount": amount
        }
        return await self._request("POST", "/withdrawals", data)
    
    async def process_withdrawals(self) -> Dict[str, Any]:
        """Process all pending withdrawal requests."""
        return await self._request("POST", "/process-withdrawals")
    
    async def get_config(self) -> Dict[str, Any]:
        """Get the current system configuration."""
        return await self._request("GET", "/config")
    
    async def get_exchanges(self) -> Dict[str, Any]:
        """Get information about configured exchanges."""
        return await self._request("GET", "/exchanges")
    
    async def get_exchange_markets(self, exchange_id: str) -> Dict[str, Any]:
        """Get market data for a specific exchange.
        
        Args:
            exchange_id: Exchange identifier (e.g., 'binance', 'gate', 'hotcoin')
            
        Returns:
            Market data for the specified exchange
        """
        return await self._request("GET", f"/exchanges/{exchange_id}/markets")
    
    async def get_stx_markets(self) -> Dict[str, Any]:
        """Get STX market data across all configured exchanges.
        
        Returns:
            STX market data across exchanges
        """
        return await self._request("GET", "/markets/stx")
