"""AI Agent implementation for the PoolMind system using Groq API."""

import os
import time
import json
import logging
from typing import Dict, List, Any, Optional, Union, Callable
import requests
from ..core.config import config

logger = logging.getLogger(__name__)


class LLMAgent:
    """Base class for LLM-powered agents using Groq API."""
    
    def __init__(self, model: Optional[str] = None):
        """Initialize the LLM agent.
        
        Args:
            model: The model name to use. If None, uses the default from config.
        """
        self.api_key = config.llm_config["api_key"]
        self.model = model or config.llm_config["model"]
        self.temperature = config.llm_config["temperature"]
        self.max_tokens = config.llm_config["max_tokens"]
        self.timeout = config.llm_config["timeout"]
        
        if not self.api_key:
            logger.warning("No Groq API key provided. Agent will not function properly.")
    
    def _call_groq_api(
        self, 
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """Call the Groq API with the given messages.
        
        Args:
            messages: List of message dictionaries with role and content
            tools: Optional list of tools for function calling
            temperature: Optional temperature override
            
        Returns:
            API response as a dictionary
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": self.max_tokens
        }
        
        if tools:
            payload["tools"] = tools
        
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling Groq API: {e}")
            return {"error": str(e)}
    
    def generate_response(self, prompt: str) -> str:
        """Generate a response to a prompt.
        
        Args:
            prompt: The prompt to send to the LLM
            
        Returns:
            Generated response text
        """
        messages = [{"role": "user", "content": prompt}]
        response = self._call_groq_api(messages)
        
        if "error" in response:
            logger.error(f"Error generating response: {response['error']}")
            return f"Error: {response['error']}"
        
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            logger.error(f"Error parsing response: {e}")
            return "Error parsing response from LLM"
    
    def generate_with_context(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a response with system and user prompts.
        
        Args:
            system_prompt: The system prompt providing context and instructions
            user_prompt: The user prompt with the specific query
            
        Returns:
            Generated response text
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        response = self._call_groq_api(messages)
        
        if "error" in response:
            logger.error(f"Error generating response: {response['error']}")
            return f"Error: {response['error']}"
        
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            logger.error(f"Error parsing response: {e}")
            return "Error parsing response from LLM"
    
    def function_call(
        self, 
        system_prompt: str, 
        user_prompt: str,
        tools: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Make a function call using the LLM.
        
        Args:
            system_prompt: The system prompt providing context and instructions
            user_prompt: The user prompt with the specific query
            tools: List of tool definitions
            
        Returns:
            Dictionary with function call details
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        response = self._call_groq_api(messages, tools=tools)
        
        if "error" in response:
            logger.error(f"Error in function call: {response['error']}")
            return {"error": response["error"]}
        
        try:
            message = response["choices"][0]["message"]
            if "tool_calls" in message:
                return {
                    "tool_calls": message["tool_calls"],
                    "content": message.get("content", "")
                }
            else:
                return {"content": message["content"], "tool_calls": []}
        except (KeyError, IndexError) as e:
            logger.error(f"Error parsing function call response: {e}")
            return {"error": f"Error parsing response: {e}"}


class StrategyAgent(LLMAgent):
    """Agent for generating trading strategies."""
    
    def generate_strategy(
        self, 
        pool_state: Dict[str, Any],
        market_data: Dict[str, Any],
        opportunities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate a trading strategy based on pool state and market data.
        
        Args:
            pool_state: Current state of the pool
            market_data: Current market data
            opportunities: List of arbitrage opportunities
            
        Returns:
            Dictionary with strategy recommendations
        """
        system_prompt = """
        You are a crypto arbitrage trading strategy expert. Your task is to analyze the current pool state,
        market data, and arbitrage opportunities to recommend the best trading strategy.
        
        Consider the following factors:
        1. Pool liquidity and cash reserves
        2. Risk exposure and position sizing
        3. Opportunity profitability and reliability
        4. Market conditions and volatility
        
        Provide a clear recommendation on which opportunities to pursue and how to allocate capital.
        """
        
        user_prompt = f"""
        Current Pool State:
        {json.dumps(pool_state, indent=2)}
        
        Market Data Summary:
        {json.dumps(self._summarize_market_data(market_data), indent=2)}
        
        Arbitrage Opportunities:
        {json.dumps(opportunities, indent=2)}
        
        Based on this information, what trading strategy should we implement?
        Provide recommendations for:
        1. Which opportunities to pursue (if any)
        2. Position sizing for each opportunity
        3. Risk management considerations
        """
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "recommend_strategy",
                    "description": "Recommend a trading strategy based on the provided data",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "selected_opportunities": {
                                "type": "array",
                                "description": "List of opportunity IDs to pursue",
                                "items": {"type": "integer"}
                            },
                            "position_sizes": {
                                "type": "array",
                                "description": "Recommended position size for each opportunity in USD",
                                "items": {"type": "number"}
                            },
                            "risk_assessment": {
                                "type": "string",
                                "description": "Risk assessment of the strategy"
                            },
                            "reasoning": {
                                "type": "string",
                                "description": "Reasoning behind the strategy"
                            }
                        },
                        "required": ["selected_opportunities", "position_sizes", "risk_assessment", "reasoning"]
                    }
                }
            }
        ]
        
        result = self.function_call(system_prompt, user_prompt, tools)
        
        if "error" in result:
            return {"error": result["error"]}
        
        if result.get("tool_calls"):
            try:
                tool_call = result["tool_calls"][0]
                if tool_call["function"]["name"] == "recommend_strategy":
                    strategy = json.loads(tool_call["function"]["arguments"])
                    return {
                        "strategy": strategy,
                        "timestamp": time.time()
                    }
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                logger.error(f"Error parsing strategy: {e}")
        
        # Fallback if function calling fails
        return {
            "strategy": {
                "selected_opportunities": [],
                "position_sizes": [],
                "risk_assessment": "Unable to assess risk due to error",
                "reasoning": "Error generating strategy with function calling"
            },
            "raw_response": result.get("content", ""),
            "timestamp": time.time()
        }
    
    def _summarize_market_data(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Summarize market data for more concise prompts.
        
        Args:
            market_data: Full market data
            
        Returns:
            Summarized market data
        """
        summary = {}
        
        for symbol, exchanges in market_data.items():
            symbol_summary = {}
            for exchange, data in exchanges.items():
                if "bid" in data and "ask" in data:
                    symbol_summary[exchange] = {
                        "bid": data["bid"],
                        "ask": data["ask"],
                        "spread": (data["ask"] - data["bid"]) / data["bid"] * 100 if data["bid"] > 0 else 0
                    }
            summary[symbol] = symbol_summary
        
        return summary


class RiskAssessmentAgent(LLMAgent):
    """Agent for assessing risk in trading strategies."""
    
    def assess_risk(
        self, 
        pool_state: Dict[str, Any],
        strategy: Dict[str, Any],
        opportunities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess the risk of a trading strategy.
        
        Args:
            pool_state: Current state of the pool
            strategy: Proposed trading strategy
            opportunities: List of arbitrage opportunities
            
        Returns:
            Dictionary with risk assessment
        """
        system_prompt = """
        You are a risk assessment expert for crypto arbitrage trading. Your task is to analyze 
        the proposed trading strategy and assess its risk level.
        
        Consider the following risk factors:
        1. Liquidity risk - Can the trades be executed without significant slippage?
        2. Exchange risk - Are there concerns about the reliability of the exchanges?
        3. Market risk - How volatile are the assets being traded?
        4. Pool impact - How does this strategy affect the overall pool health?
        
        Provide a numerical risk score (1-10) and detailed assessment.
        """
        
        # Filter opportunities to only those in the strategy
        selected_opps = [
            opportunities[i] for i in strategy.get("selected_opportunities", [])
            if i < len(opportunities)
        ]
        
        user_prompt = f"""
        Current Pool State:
        {json.dumps(pool_state, indent=2)}
        
        Proposed Strategy:
        {json.dumps(strategy, indent=2)}
        
        Selected Opportunities:
        {json.dumps(selected_opps, indent=2)}
        
        Please assess the risk of this trading strategy.
        """
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "risk_assessment",
                    "description": "Provide a risk assessment for the trading strategy",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "risk_score": {
                                "type": "integer",
                                "description": "Risk score from 1 (lowest risk) to 10 (highest risk)"
                            },
                            "liquidity_risk": {
                                "type": "string",
                                "description": "Assessment of liquidity risk"
                            },
                            "exchange_risk": {
                                "type": "string",
                                "description": "Assessment of exchange risk"
                            },
                            "market_risk": {
                                "type": "string",
                                "description": "Assessment of market risk"
                            },
                            "pool_impact": {
                                "type": "string",
                                "description": "Assessment of impact on the pool"
                            },
                            "recommendation": {
                                "type": "string",
                                "description": "Recommendation based on risk assessment"
                            }
                        },
                        "required": ["risk_score", "recommendation"]
                    }
                }
            }
        ]
        
        result = self.function_call(system_prompt, user_prompt, tools)
        
        if "error" in result:
            return {"error": result["error"]}
        
        if result.get("tool_calls"):
            try:
                tool_call = result["tool_calls"][0]
                if tool_call["function"]["name"] == "risk_assessment":
                    assessment = json.loads(tool_call["function"]["arguments"])
                    return {
                        "assessment": assessment,
                        "timestamp": time.time()
                    }
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                logger.error(f"Error parsing risk assessment: {e}")
        
        # Fallback if function calling fails
        return {
            "assessment": {
                "risk_score": 5,
                "recommendation": "Unable to properly assess risk due to error"
            },
            "raw_response": result.get("content", ""),
            "timestamp": time.time()
        }
