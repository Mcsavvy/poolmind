"""Tests for the AI agent module."""

import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, Any, List

from poolmind.ai.agent import LLMAgent, StrategyAgent, RiskAssessmentAgent


class TestLLMAgent:
    """Test cases for the LLMAgent base class."""
    
    def test_init_with_config(self):
        """Test initialization with configuration."""
        # Mock the config object
        with patch('poolmind.ai.agent.config') as mock_config:
            mock_config.llm_config = {
                "api_key": "test-api-key",
                "model": "llama3-70b-8192",
                "temperature": 0.2,
                "max_tokens": 1000,
                "timeout": 60
            }
            
            agent = LLMAgent(model="custom-model")
            
            assert agent.api_key == "test-api-key"
            assert agent.model == "custom-model"  # Should use the provided model
            assert agent.temperature == 0.2
            assert agent.max_tokens == 1000
            assert agent.timeout == 60
    
    def test_generate_response(self):
        """Test generating a response from the LLM."""
        # Mock the config object
        with patch('poolmind.ai.agent.config') as mock_config:
            mock_config.llm_config = {
                "api_key": "test-api-key",
                "model": "llama3-70b-8192",
                "temperature": 0.2,
                "max_tokens": 1000,
                "timeout": 60
            }
            
            # Mock the requests.post method
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [
                    {"message": {"content": "This is a test response"}}
                ]
            }
            mock_response.raise_for_status = MagicMock()
            
            with patch('requests.post', return_value=mock_response) as mock_post:
                agent = LLMAgent()
                response = agent.generate_response("What is the meaning of life?")
                
                # Verify the response
                assert response == "This is a test response"
                
                # Verify the API call
                mock_post.assert_called_once()
                call_args = mock_post.call_args[1]
                assert call_args["json"]["model"] == "llama3-70b-8192"
                assert call_args["json"]["temperature"] == 0.2
                assert call_args["json"]["max_tokens"] == 1000
                assert len(call_args["json"]["messages"]) > 0
    
    def test_function_call(self):
        """Test making a function call using the LLM."""
        # Mock the config object
        with patch('poolmind.ai.agent.config') as mock_config:
            mock_config.llm_config = {
                "api_key": "test-api-key",
                "model": "llama3-70b-8192",
                "temperature": 0.2,
                "max_tokens": 1000,
                "timeout": 60
            }
            
            # Define a test function schema
            tool_schema = {
                "type": "function",
                "function": {
                    "name": "test_function",
                    "description": "A test function",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "param1": {"type": "string"},
                            "param2": {"type": "number"}
                        },
                        "required": ["param1", "param2"]
                    }
                }
            }
            
            # Mock the requests.post method
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": "This is a test response",
                            "tool_calls": [
                                {
                                    "id": "call_1",
                                    "type": "function",
                                    "function": {
                                        "name": "test_function",
                                        "arguments": '{"param1":"test value","param2":42}'
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
            mock_response.raise_for_status = MagicMock()
            
            with patch('requests.post', return_value=mock_response) as mock_post:
                agent = LLMAgent()
                result = agent.function_call(
                    "System instructions",
                    "What is the meaning of life?",
                    [tool_schema]
                )
                
                # Verify the result
                assert "tool_calls" in result
                assert len(result["tool_calls"]) == 1
                assert result["tool_calls"][0]["function"]["name"] == "test_function"
                assert json.loads(result["tool_calls"][0]["function"]["arguments"]) == {"param1": "test value", "param2": 42}
                
                # Verify the API call
                mock_post.assert_called_once()
                call_args = mock_post.call_args[1]
                assert call_args["json"]["model"] == "llama3-70b-8192"
                assert call_args["json"]["temperature"] == 0.2
                assert call_args["json"]["max_tokens"] == 1000
                assert len(call_args["json"]["messages"]) > 0
                assert "tools" in call_args["json"]


class TestStrategyAgent:
    """Test cases for the StrategyAgent class."""
    
    def test_generate_strategy(self):
        """Test generating a trading strategy."""
        # Mock the config object
        with patch('poolmind.ai.agent.config') as mock_config:
            mock_config.llm_config = {
                "api_key": "test-api-key",
                "model": "llama3-70b-8192",
                "temperature": 0.2,
                "max_tokens": 1000,
                "timeout": 60
            }
            
            # Mock pool state and opportunities
            pool_state = {
                "total_value": 100000.0,
                "participant_count": 10,
                "cash_reserves": 50000.0,
                "nav_per_share": 1.05
            }
            
            market_data = {
                "BTC/USDT": {
                    "binance": {"bid": 49000.0, "ask": 49100.0, "volume": 100.0},
                    "coinbase": {"bid": 49900.0, "ask": 50000.0, "volume": 80.0}
                }
            }
            
            opportunities = [
                {
                    "symbol": "BTC/USDT",
                    "buy_exchange": "binance",
                    "sell_exchange": "coinbase",
                    "buy_price": 49100.0,
                    "sell_price": 49900.0,
                    "spread_pct": 1.63,
                    "max_volume_usd": 4000.0
                }
            ]
            
            # Mock strategy response
            strategy_response = {
                "selected_opportunities": [
                    {
                        "symbol": "BTC/USDT",
                        "position_size": 0.5,
                        "risk_assessment": "low"
                    }
                ],
                "allocation_rationale": "Good spread with low risk",
                "risk_mitigation": "Split execution to reduce slippage",
                "confidence_score": 0.85
            }
        
        # Mock the function call response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(strategy_response),
                        "tool_calls": []
                    }
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()
        
        with patch('requests.post', return_value=mock_response) as mock_post:
            agent = StrategyAgent()
            result = agent.generate_strategy(pool_state, market_data, opportunities)
            
            # Verify the result matches the actual return structure
            assert "strategy" in result
            assert "timestamp" in result
            assert "selected_opportunities" in result["strategy"]
            assert "position_sizes" in result["strategy"]
            assert "risk_assessment" in result["strategy"]
            assert "reasoning" in result["strategy"]
            
            # Verify the API call
            mock_post.assert_called_once()
            call_args = mock_post.call_args[1]
            assert "json" in call_args
            assert "messages" in call_args["json"]
            assert len(call_args["json"]["messages"]) >= 2  # At least system and user messages


class TestRiskAssessmentAgent:
    """Test cases for the RiskAssessmentAgent class."""
    
    def test_assess_risk(self):
        """Test assessing risk for a trading strategy."""
        # Mock the config object
        with patch('poolmind.ai.agent.config') as mock_config:
            mock_config.llm_config = {
                "api_key": "test-api-key",
                "model": "llama3-70b-8192",
                "temperature": 0.2,
                "max_tokens": 1000,
                "timeout": 60
            }
            
            # Mock pool state, strategy, and opportunities
            pool_state = {
                "total_value": 100000.0,
                "participant_count": 10,
                "cash_reserves": 50000.0,
                "nav_per_share": 1.05
            }
            
            strategy = {
                "selected_opportunities": [0],
                "position_sizes": [5000.0],
                "risk_assessment": "low",
                "reasoning": "Good spread with low risk"
            }
            
            opportunities = [
                {
                    "symbol": "BTC/USDT",
                    "buy_exchange": "binance",
                    "sell_exchange": "coinbase",
                    "buy_price": 49100.0,
                    "sell_price": 49900.0,
                    "spread_pct": 1.63,
                    "max_volume_usd": 4000.0
                }
            ]
            
            # Mock risk assessment response
            risk_response = {
                "overall_risk_score": 3,
                "risk_factors": [
                    {
                        "factor": "market_volatility",
                        "score": 4,
                        "explanation": "BTC has shown moderate volatility"
                    },
                    {
                        "factor": "liquidity_risk",
                        "score": 2,
                        "explanation": "High liquidity on both exchanges"
                    }
                ],
                "recommendation": "Proceed with caution",
                "confidence_score": 0.9
            }
            
            # Mock the function call response
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(risk_response),
                            "tool_calls": []
                        }
                    }
                ]
            }
            mock_response.raise_for_status = MagicMock()
            
            with patch('requests.post', return_value=mock_response) as mock_post:
                agent = RiskAssessmentAgent()
                result = agent.assess_risk(pool_state, strategy, opportunities)
                
                # Verify the result matches the actual return structure
                assert "assessment" in result
                assert "timestamp" in result
                assert "risk_score" in result["assessment"]
                assert "recommendation" in result["assessment"]
                
                # Verify the API call
                mock_post.assert_called_once()
                call_args = mock_post.call_args[1]
                assert "json" in call_args
                assert "messages" in call_args["json"]
                assert len(call_args["json"]["messages"]) >= 2  # At least system and user messages
