"""Tests for the FastAPI implementation."""

import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from api import app
from poolmind.main import PoolMind
from poolmind.core.pool_state import PoolState


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_poolmind():
    """Mock PoolMind instance."""
    with patch("api.poolmind") as mock:
        # Mock the get_status method
        mock.get_status.return_value = {
            "is_running": False,
            "last_cycle_time": 0,
            "pool_metrics": {
                "total_pool_value": 100000.0,
                "initial_pool_value": 100000.0,
                "cash_reserve": 100000.0,
                "cash_ratio": 1.0,
                "roi": 0.0,
                "participant_count": 10,
                "asset_count": 0,
                "assets": {},
                "age_days": 0.0,
                "last_update": 0
            },
            "execution_count": 0,
            "recent_executions": []
        }
        
        # Mock the run_cycle method
        mock.run_cycle = AsyncMock(return_value={
            "cycle_id": 1234567890,
            "status": "completed",
            "opportunities_found": 5,
            "opportunities_filtered": 2,
            "message": "Cycle completed successfully",
            "pool_metrics": {
                "total_pool_value": 100050.0,
                "initial_pool_value": 100000.0,
                "cash_reserve": 100050.0,
                "cash_ratio": 1.0,
                "roi": 0.0005,
                "participant_count": 10,
                "asset_count": 0,
                "assets": {},
                "age_days": 0.0,
                "last_update": 0
            },
            "duration": 1.5
        })
        
        # Mock the pool_state
        mock.pool_state = MagicMock(spec=PoolState)
        mock.pool_state.get_pool_metrics.return_value = {
            "total_pool_value": 100000.0,
            "initial_pool_value": 100000.0,
            "cash_reserve": 100000.0,
            "cash_ratio": 1.0,
            "roi": 0.0,
            "participant_count": 10,
            "asset_count": 0,
            "assets": {},
            "age_days": 0.0,
            "last_update": 0
        }
        
        mock.pool_state.get_participant_metrics.return_value = {
            "participant_1": {
                "initial_investment": 10000.0,
                "current_value": 10000.0,
                "roi": 0.0,
                "pending_withdrawals_count": 0
            },
            "participant_2": {
                "initial_investment": 10000.0,
                "current_value": 10000.0,
                "roi": 0.0,
                "pending_withdrawals_count": 0
            }
        }
        
        mock.pool_state.add_participant.return_value = True
        mock.pool_state.request_withdrawal.return_value = True
        mock.pool_state.process_withdrawals.return_value = []
        
        yield mock


class TestAPIEndpoints:
    """Test cases for the API endpoints."""
    
    def test_root_endpoint(self, test_client):
        """Test the root endpoint returns the frontend."""
        response = test_client.get("/api")
        assert response.status_code == 200
        assert "PoolMind API" in response.json()["name"]
    
    def test_get_status(self, test_client, mock_poolmind):
        """Test getting system status."""
        response = test_client.get("/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_running" in data
        assert "pool_metrics" in data
        assert "execution_count" in data
        assert "recent_executions" in data
    
    def test_start_system(self, test_client, mock_poolmind):
        """Test starting the system."""
        mock_poolmind.is_running = False
        
        response = test_client.post("/start")
        assert response.status_code == 200
        assert "message" in response.json()
        assert "started" in response.json()["message"].lower()
    
    def test_start_system_already_running(self, test_client, mock_poolmind):
        """Test starting the system when it's already running."""
        mock_poolmind.is_running = True
        
        response = test_client.post("/start")
        assert response.status_code == 200
        assert "already running" in response.json()["message"].lower()
    
    def test_stop_system(self, test_client, mock_poolmind):
        """Test stopping the system."""
        mock_poolmind.is_running = True
        
        response = test_client.post("/stop")
        assert response.status_code == 200
        assert "message" in response.json()
        assert "stopped" in response.json()["message"].lower()
        
        # Verify the stop method was called
        mock_poolmind.stop.assert_called_once()
    
    def test_stop_system_not_running(self, test_client, mock_poolmind):
        """Test stopping the system when it's not running."""
        mock_poolmind.is_running = False
        
        response = test_client.post("/stop")
        assert response.status_code == 200
        assert "not running" in response.json()["message"].lower()
    
    @pytest.mark.asyncio
    async def test_run_single_cycle(self, test_client, mock_poolmind):
        """Test running a single trading cycle."""
        mock_poolmind.is_running = False
        
        response = test_client.post("/run-cycle")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"
        assert "cycle_id" in data
        assert "pool_metrics" in data
        
        # Verify the run_cycle method was called
        mock_poolmind.run_cycle.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_run_single_cycle_while_running(self, test_client, mock_poolmind):
        """Test running a single cycle while system is running."""
        mock_poolmind.is_running = True
        
        response = test_client.post("/run-cycle")
        assert response.status_code == 400
        assert "cannot run" in response.json()["detail"].lower()
    
    def test_get_pool_metrics(self, test_client, mock_poolmind):
        """Test getting pool metrics."""
        response = test_client.get("/pool")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_pool_value" in data
        assert "roi" in data
        assert "participant_count" in data
        assert "assets" in data
    
    def test_get_participants(self, test_client, mock_poolmind):
        """Test getting participants information."""
        response = test_client.get("/participants")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        
        # Check the first participant
        first_participant = list(data.values())[0]
        assert "initial_investment" in first_participant
        assert "current_value" in first_participant
        assert "roi" in first_participant
    
    def test_get_specific_participant(self, test_client, mock_poolmind):
        """Test getting a specific participant."""
        mock_poolmind.pool_state.get_participant_metrics.return_value = {
            "initial_investment": 10000.0,
            "current_value": 10000.0,
            "roi": 0.0,
            "pending_withdrawals_count": 0
        }
        
        response = test_client.get("/participants?participant_id=participant_1")
        assert response.status_code == 200
        
        data = response.json()
        assert "initial_investment" in data
        assert "current_value" in data
        assert "roi" in data
    
    def test_add_participant(self, test_client, mock_poolmind):
        """Test adding a new participant."""
        participant_data = {
            "id": "new_participant",
            "investment": 5000.0
        }
        
        response = test_client.post(
            "/participants",
            json=participant_data
        )
        assert response.status_code == 201
        assert "added successfully" in response.json()["message"].lower()
        
        # Verify the add_participant method was called with correct args
        mock_poolmind.pool_state.add_participant.assert_called_once_with(
            participant_id="new_participant",
            investment=5000.0
        )
    
    def test_add_participant_failure(self, test_client, mock_poolmind):
        """Test adding a participant that already exists."""
        mock_poolmind.pool_state.add_participant.return_value = False
        
        participant_data = {
            "id": "existing_participant",
            "investment": 5000.0
        }
        
        response = test_client.post(
            "/participants",
            json=participant_data
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_request_withdrawal(self, test_client, mock_poolmind):
        """Test requesting a withdrawal."""
        withdrawal_data = {
            "participant_id": "participant_1",
            "amount": 1000.0
        }
        
        response = test_client.post(
            "/withdrawals",
            json=withdrawal_data
        )
        assert response.status_code == 200
        assert "submitted successfully" in response.json()["message"].lower()
        
        # Verify the request_withdrawal method was called with correct args
        mock_poolmind.pool_state.request_withdrawal.assert_called_once_with(
            participant_id="participant_1",
            amount=1000.0
        )
    
    def test_request_withdrawal_failure(self, test_client, mock_poolmind):
        """Test requesting a withdrawal that fails."""
        mock_poolmind.pool_state.request_withdrawal.return_value = False
        
        withdrawal_data = {
            "participant_id": "invalid_participant",
            "amount": 1000.0
        }
        
        response = test_client.post(
            "/withdrawals",
            json=withdrawal_data
        )
        assert response.status_code == 400
        assert "failed" in response.json()["detail"].lower()
    
    def test_process_withdrawals(self, test_client, mock_poolmind):
        """Test processing withdrawals."""
        mock_poolmind.pool_state.process_withdrawals.return_value = [
            {
                "participant_id": "participant_1",
                "amount": 1000.0,
                "status": "completed"
            }
        ]
        
        response = test_client.post("/process-withdrawals")
        assert response.status_code == 200
        
        data = response.json()
        assert "processed_count" in data
        assert "withdrawals" in data
        assert len(data["withdrawals"]) == 1
        assert data["processed_count"] == 1
    
    def test_get_config(self, test_client):
        """Test getting system configuration."""
        response = test_client.get("/config")
        assert response.status_code == 200
        
        data = response.json()
        assert "environment" in data
        assert "trading_config" in data
        assert "feature_flags" in data
