"""Pool State Manager for the PoolMind system."""

from typing import Dict, List, Any, Optional
import time
from dataclasses import dataclass, field


@dataclass
class Participant:
    """Represents a participant in the trading pool."""
    
    id: str
    initial_investment: float
    current_value: float
    join_date: float = field(default_factory=time.time)
    withdrawal_requests: List[Dict[str, Any]] = field(default_factory=list)


class PoolState:
    """Manages the state of the trading pool including participants and assets."""
    
    def __init__(self, initial_pool_value: float, initial_participants: int = 10):
        """Initialize the pool state.
        
        Args:
            initial_pool_value: Initial value of the pool in USD
            initial_participants: Initial number of participants
        """
        self.initial_pool_value = initial_pool_value
        self.current_pool_value = initial_pool_value
        self.participants: Dict[str, Participant] = {}
        self.assets: Dict[str, float] = {}
        self.cash_reserve: float = initial_pool_value
        self.creation_time = time.time()
        self.last_update_time = self.creation_time
        
        # Initialize with simulated participants if specified
        if initial_participants > 0:
            self._initialize_participants(initial_participants)
    
    def _initialize_participants(self, count: int) -> None:
        """Initialize the pool with simulated participants.
        
        Args:
            count: Number of participants to create
        """
        avg_investment = self.initial_pool_value / count
        # Create participants with slight variations in investment
        for i in range(count):
            # Vary investment by ±20%
            variation = 0.8 + (0.4 * (i / count))
            investment = avg_investment * variation
            participant_id = f"participant_{i+1}"
            self.participants[participant_id] = Participant(
                id=participant_id,
                initial_investment=investment,
                current_value=investment
            )
    
    def add_participant(self, participant_id: str, investment: float) -> bool:
        """Add a new participant to the pool.
        
        Args:
            participant_id: Unique identifier for the participant
            investment: Initial investment amount in USD
            
        Returns:
            bool: True if participant was added successfully
        """
        if participant_id in self.participants:
            return False
        
        self.participants[participant_id] = Participant(
            id=participant_id,
            initial_investment=investment,
            current_value=investment
        )
        self.current_pool_value += investment
        self.cash_reserve += investment
        self.last_update_time = time.time()
        return True
    
    def request_withdrawal(self, participant_id: str, amount: float) -> bool:
        """Request a withdrawal from the pool.
        
        Args:
            participant_id: Unique identifier for the participant
            amount: Amount to withdraw in USD
            
        Returns:
            bool: True if withdrawal request was added successfully
        """
        if participant_id not in self.participants:
            return False
        
        participant = self.participants[participant_id]
        if amount > participant.current_value:
            return False
        
        withdrawal_request = {
            "amount": amount,
            "request_time": time.time(),
            "status": "pending"
        }
        participant.withdrawal_requests.append(withdrawal_request)
        self.last_update_time = time.time()
        return True
    
    def process_withdrawals(self) -> List[Dict[str, Any]]:
        """Process all pending withdrawal requests.
        
        Returns:
            List of processed withdrawal requests
        """
        processed_withdrawals = []
        
        for participant_id, participant in self.participants.items():
            pending_withdrawals = [
                w for w in participant.withdrawal_requests 
                if w["status"] == "pending"
            ]
            
            for withdrawal in pending_withdrawals:
                if withdrawal["amount"] <= self.cash_reserve:
                    withdrawal["status"] = "completed"
                    withdrawal["process_time"] = time.time()
                    
                    # Update pool state
                    self.cash_reserve -= withdrawal["amount"]
                    self.current_pool_value -= withdrawal["amount"]
                    participant.current_value -= withdrawal["amount"]
                    
                    processed_withdrawals.append({
                        "participant_id": participant_id,
                        "amount": withdrawal["amount"],
                        "status": "completed"
                    })
                else:
                    withdrawal["status"] = "delayed"
                    processed_withdrawals.append({
                        "participant_id": participant_id,
                        "amount": withdrawal["amount"],
                        "status": "delayed"
                    })
        
        self.last_update_time = time.time()
        return processed_withdrawals
    
    def update_asset_allocation(self, assets: Dict[str, float]) -> None:
        """Update the asset allocation in the pool.
        
        Args:
            assets: Dictionary mapping asset symbols to their USD values
        """
        self.assets = assets
        
        # Calculate total assets value
        total_assets_value = sum(assets.values())
        
        # Update cash reserve (pool value minus assets)
        self.cash_reserve = self.current_pool_value - total_assets_value
        self.last_update_time = time.time()
    
    def update_pool_value(self, new_value: float) -> None:
        """Update the total pool value.
        
        Args:
            new_value: New total pool value in USD
        """
        old_value = self.current_pool_value
        self.current_pool_value = new_value
        
        # Proportionally update each participant's value
        if old_value > 0:
            ratio = new_value / old_value
            for participant in self.participants.values():
                participant.current_value *= ratio
        
        self.last_update_time = time.time()
    
    def get_pool_metrics(self) -> Dict[str, Any]:
        """Get key metrics about the pool state.
        
        Returns:
            Dictionary with pool metrics
        """
        total_initial_investment = sum(p.initial_investment for p in self.participants.values())
        total_current_value = sum(p.current_value for p in self.participants.values())
        
        # Calculate ROI
        if total_initial_investment > 0:
            roi = (total_current_value - total_initial_investment) / total_initial_investment
        else:
            roi = 0.0
        
        # Calculate cash ratio
        cash_ratio = self.cash_reserve / self.current_pool_value if self.current_pool_value > 0 else 0
        
        return {
            "total_pool_value": self.current_pool_value,
            "initial_pool_value": self.initial_pool_value,
            "cash_reserve": self.cash_reserve,
            "cash_ratio": cash_ratio,
            "roi": roi,
            "participant_count": len(self.participants),
            "asset_count": len(self.assets),
            "assets": self.assets,
            "age_days": (time.time() - self.creation_time) / (60 * 60 * 24),
            "last_update": self.last_update_time
        }
    
    def get_participant_metrics(self, participant_id: Optional[str] = None) -> Dict[str, Any]:
        """Get metrics for a specific participant or all participants.
        
        Args:
            participant_id: ID of participant to get metrics for, or None for all
            
        Returns:
            Dictionary with participant metrics
        """
        if participant_id and participant_id in self.participants:
            participant = self.participants[participant_id]
            return {
                "id": participant.id,
                "initial_investment": participant.initial_investment,
                "current_value": participant.current_value,
                "roi": (participant.current_value - participant.initial_investment) / 
                       participant.initial_investment if participant.initial_investment > 0 else 0,
                "join_date": participant.join_date,
                "pending_withdrawals": [
                    w for w in participant.withdrawal_requests if w["status"] == "pending"
                ]
            }
        else:
            # Return metrics for all participants
            return {
                p_id: {
                    "initial_investment": p.initial_investment,
                    "current_value": p.current_value,
                    "roi": (p.current_value - p.initial_investment) / 
                           p.initial_investment if p.initial_investment > 0 else 0,
                    "pending_withdrawals_count": len([
                        w for w in p.withdrawal_requests if w["status"] == "pending"
                    ])
                }
                for p_id, p in self.participants.items()
            }
