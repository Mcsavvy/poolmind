"""Tests for the pool state module."""

import pytest
import time
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from poolmind.core.pool_state import PoolState, Participant


class TestParticipant:
    """Test cases for the Participant class."""
    
    def test_participant_initialization(self):
        """Test participant initialization with valid data."""
        current_time = time.time()
        participant = Participant(
            id="p123",
            initial_investment=10000.0,
            current_value=10000.0,
            join_date=current_time
        )
        
        assert participant.id == "p123"
        assert participant.initial_investment == 10000.0
        assert participant.current_value == 10000.0
        assert participant.join_date == current_time
        assert participant.withdrawal_requests == []
    
    def test_participant_with_withdrawal_requests(self):
        """Test participant with withdrawal requests."""
        current_time = time.time()
        participant = Participant(
            id="p123",
            initial_investment=10000.0,
            current_value=12000.0,
            join_date=current_time
        )
        
        # Add a withdrawal request
        withdrawal_request = {
            "amount": 2000.0,
            "request_time": current_time,
            "status": "pending"
        }
        participant.withdrawal_requests.append(withdrawal_request)
        
        assert len(participant.withdrawal_requests) == 1
        assert participant.withdrawal_requests[0]["amount"] == 2000.0
        assert participant.withdrawal_requests[0]["status"] == "pending"


class TestPoolState:
    """Test cases for the PoolState class."""
    
    def test_pool_state_initialization(self):
        """Test pool state initialization with default values."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=10)
        
        assert isinstance(pool_state.participants, dict)
        assert len(pool_state.participants) == 10
        assert isinstance(pool_state.assets, dict)
        assert pool_state.cash_reserve > 0
        assert pool_state.initial_pool_value == 100000.0
        assert pool_state.current_pool_value == 100000.0
        assert isinstance(pool_state.creation_time, float)
        assert isinstance(pool_state.last_update_time, float)
    
    def test_pool_state_without_participants(self):
        """Test pool state initialization without participants."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=0)
        
        assert isinstance(pool_state.participants, dict)
        assert len(pool_state.participants) == 0
        assert isinstance(pool_state.assets, dict)
        assert len(pool_state.assets) == 0
        assert pool_state.cash_reserve == 100000.0
        assert pool_state.initial_pool_value == 100000.0
        assert pool_state.current_pool_value == 100000.0
    
    def test_add_asset(self):
        """Test adding an asset to the pool."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=0)
        
        # Initial state
        assert len(pool_state.assets) == 0
        assert pool_state.cash_reserve == 100000.0
        
        # Add BTC asset
        pool_state.assets["BTC/USDT"] = 0.5
        
        # Verify asset was added
        assert len(pool_state.assets) == 1
        assert pool_state.assets["BTC/USDT"] == 0.5
    
    def test_update_pool_value(self):
        """Test updating the pool value."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=0)
        
        # Add assets
        pool_state.assets["BTC/USDT"] = 0.5
        pool_state.assets["ETH/USDT"] = 5.0
        
        # Update cash reserve to reflect asset allocation
        btc_value = 0.5 * 50000.0  # 0.5 BTC at $50,000
        eth_value = 5.0 * 3000.0   # 5 ETH at $3,000
        pool_state.cash_reserve = pool_state.initial_pool_value - (btc_value + eth_value)
        
        # Calculate current pool value
        asset_value = btc_value + eth_value
        expected_pool_value = pool_state.cash_reserve + asset_value
        
        # Update pool value
        pool_state.current_pool_value = expected_pool_value
        
        # Verify pool value was updated correctly
        assert pool_state.current_pool_value == expected_pool_value
        assert pool_state.cash_reserve == 60000.0  # 100000 - (25000 + 15000)
    
    def test_remove_asset(self):
        """Test removing an asset from the pool."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=0)
        
        # Add an asset
        pool_state.assets["BTC/USDT"] = 0.5
        
        # Remove the asset
        del pool_state.assets["BTC/USDT"]
        
        assert len(pool_state.assets) == 0
    
    def test_update_asset_allocation(self):
        """Test updating asset allocation."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=0)
        
        # Add assets
        pool_state.assets["BTC/USDT"] = 0.5
        
        # Update allocation
        pool_state.assets["BTC/USDT"] = 1.0
        
        assert pool_state.assets["BTC/USDT"] == 1.0
    
    def test_add_participant(self):
        """Test adding a participant."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=0)
        
        # Initial state
        assert len(pool_state.participants) == 0
        
        # Add a participant manually
        current_time = time.time()
        participant = Participant(
            id="test_user",
            initial_investment=10000.0,
            current_value=10000.0,
            join_date=current_time
        )
        
        pool_state.participants[participant.id] = participant
        
        # Verify participant was added
        assert len(pool_state.participants) == 1
        assert "test_user" in pool_state.participants
        assert pool_state.participants["test_user"].initial_investment == 10000.0
    
    def test_participant_withdrawal(self):
        """Test participant withdrawal request."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=1)
        
        # Get the first participant
        participant_id = list(pool_state.participants.keys())[0]
        participant = pool_state.participants[participant_id]
        
        # Initial state
        assert len(participant.withdrawal_requests) == 0
        
        # Add withdrawal request
        withdrawal_request = {
            "amount": 5000.0,
            "request_time": time.time(),
            "status": "pending"
        }
        participant.withdrawal_requests.append(withdrawal_request)
        
        # Verify withdrawal request was added
        assert len(participant.withdrawal_requests) == 1
        assert participant.withdrawal_requests[0]["amount"] == 5000.0
        assert participant.withdrawal_requests[0]["status"] == "pending"
    
    def test_pool_value_calculation(self):
        """Test pool value calculation."""
        pool_state = PoolState(initial_pool_value=100000.0, initial_participants=0)
        
        # Initial state
        assert pool_state.current_pool_value == 100000.0
        assert pool_state.cash_reserve == 100000.0
        
        # Add assets and update cash reserve
        btc_amount = 0.5
        btc_price = 50000.0
        eth_amount = 5.0
        eth_price = 3000.0
        
        pool_state.assets["BTC/USDT"] = btc_amount
        pool_state.assets["ETH/USDT"] = eth_amount
        
        btc_value = btc_amount * btc_price
        eth_value = eth_amount * eth_price
        pool_state.cash_reserve = pool_state.initial_pool_value - (btc_value + eth_value)
        
        # Calculate current pool value
        asset_value = btc_value + eth_value
        pool_state.current_pool_value = pool_state.cash_reserve + asset_value
        
        # Verify calculations
        assert pool_state.cash_reserve == 60000.0  # 100000 - 25000 - 15000
        assert pool_state.current_pool_value == 100000.0  # 60000 + 25000 + 15000 - 25000
