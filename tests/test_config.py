"""Tests for the configuration module."""

import os
import pytest
from unittest.mock import patch, MagicMock
from poolmind.core.config import Config


class TestConfig:
    """Test cases for the Config class."""
    
    def test_init_with_default_env_file(self):
        """Test initialization with default .env file path."""
        with patch('os.path.exists', return_value=True), \
             patch('poolmind.core.config.load_dotenv') as mock_load_dotenv:
            config = Config()
            mock_load_dotenv.assert_called_once_with(config.env_file)
            assert config.env_file.endswith('.env')
    
    def test_init_with_custom_env_file(self):
        """Test initialization with custom .env file path."""
        custom_path = '/custom/path/.env'
        with patch('os.path.exists', return_value=True), \
             patch('poolmind.core.config.load_dotenv') as mock_load_dotenv:
            config = Config(env_file=custom_path)
            mock_load_dotenv.assert_called_once_with(custom_path)
            assert config.env_file == custom_path
    
    def test_missing_env_file_warning(self, caplog):
        """Test warning when .env file is missing."""
        with patch('os.path.exists', return_value=False), \
             patch('poolmind.core.config.load_dotenv'), \
             patch('builtins.print') as mock_print:
            Config()
            mock_print.assert_called_once()
            assert "Warning: Environment file" in mock_print.call_args[0][0]
    
    def test_validate_required_config_warning(self, caplog):
        """Test warning when required config variables are missing."""
        with patch('os.path.exists', return_value=True), \
             patch('poolmind.core.config.load_dotenv'), \
             patch('os.getenv', return_value=None), \
             patch('builtins.print') as mock_print:
            Config()
            mock_print.assert_called_once()
            assert "Warning: Missing required environment variables" in mock_print.call_args[0][0]
    
    def test_environment_property(self):
        """Test environment property."""
        with patch('os.path.exists', return_value=True), \
             patch('poolmind.core.config.load_dotenv'), \
             patch('os.getenv', return_value='production'):
            config = Config()
            assert config.environment == 'production'
    
    def test_debug_property_true(self):
        """Test debug property when set to true."""
        with patch('os.path.exists', return_value=True), \
             patch('dotenv.load_dotenv'), \
             patch('os.getenv', return_value='true'):
            config = Config()
            assert config.debug is True
    
    def test_debug_property_false(self):
        """Test debug property when set to false."""
        with patch('os.path.exists', return_value=True), \
             patch('dotenv.load_dotenv'), \
             patch('os.getenv', return_value='false'):
            config = Config()
            assert config.debug is False
    
    def test_llm_config_property(self):
        """Test llm_config property."""
        env_values = {
            'LLM_PROVIDER': 'groq',
            'GROQ_API_KEY': 'test-api-key',
            'GROQ_MODEL': 'llama3-70b-8192',
            'GROQ_TEMPERATURE': '0.2',
            'GROQ_MAX_TOKENS': '1000',
            'GROQ_TIMEOUT': '60'
        }
        
        def getenv_side_effect(key, default=None):
            return env_values.get(key, default)
        
        with patch('os.path.exists', return_value=True), \
             patch('dotenv.load_dotenv'), \
             patch('os.getenv', side_effect=getenv_side_effect):
            config = Config()
            llm_config = config.llm_config
            
            assert llm_config['provider'] == 'groq'
            assert llm_config['api_key'] == 'test-api-key'
            assert llm_config['model'] == 'llama3-70b-8192'
            assert llm_config['temperature'] == 0.2
            assert llm_config['max_tokens'] == 1000
            assert llm_config['timeout'] == 60
    
    def test_trading_config_property(self):
        """Test trading_config property."""
        env_values = {
            'INITIAL_POOL_VALUE': '200000.0',
            'INITIAL_PARTICIPANTS': '20',
            'CYCLE_INTERVAL': '60',
            'TRADING_SYMBOLS': 'BTC/USDT,ETH/USDT,SOL/USDT',
            'MAX_POSITION_SIZE_PCT': '0.05',
            'MIN_SPREAD_THRESHOLD': '0.8'
        }
        
        def getenv_side_effect(key, default=None):
            return env_values.get(key, default)
        
        with patch('os.path.exists', return_value=True), \
             patch('dotenv.load_dotenv'), \
             patch('os.getenv', side_effect=getenv_side_effect):
            config = Config()
            trading_config = config.trading_config
            
            assert trading_config['initial_pool_value'] == 200000.0
            assert trading_config['initial_participants'] == 20
            assert trading_config['cycle_interval'] == 60
            assert trading_config['trading_symbols'] == ['BTC/USDT', 'ETH/USDT', 'SOL/USDT']
            assert trading_config['max_position_size_pct'] == 0.05
            assert trading_config['min_spread_threshold'] == 0.8
