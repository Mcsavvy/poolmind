#!/usr/bin/env python3
"""
PoolMind CLI - Command Line Interface for the PoolMind API

This tool provides a command-line interface to interact with the external PoolMind API.
"""

import os
import sys
import argparse
import asyncio
import logging
import json
from pathlib import Path

from poolmind.api_client import PoolMindAPIClient
from poolmind.utils.logging_setup import setup_logging
from poolmind.core.config import config

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="PoolMind CLI - Command Line Interface for the PoolMind API"
    )
    
    parser.add_argument(
        "--log-level",
        type=str,
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        default="INFO",
        help="Set the logging level"
    )
    
    parser.add_argument(
        "--api-url",
        type=str,
        default="https://poolmind.futurdevs.com/api",
        help="URL of the PoolMind API"
    )
    
    # Command subparsers
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Get system status")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start the system")
    
    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop the system")
    
    # Run cycle command
    run_cycle_parser = subparsers.add_parser("run-cycle", help="Run a single trading cycle")
    
    # Pool metrics command
    pool_parser = subparsers.add_parser("pool", help="Get pool metrics")
    
    # Participants command
    participants_parser = subparsers.add_parser("participants", help="Get participants information")
    participants_parser.add_argument(
        "--id",
        type=str,
        help="Specific participant ID"
    )
    
    # Add participant command
    add_participant_parser = subparsers.add_parser("add-participant", help="Add a new participant")
    add_participant_parser.add_argument(
        "--id",
        type=str,
        required=True,
        help="Participant ID"
    )
    add_participant_parser.add_argument(
        "--investment",
        type=float,
        required=True,
        help="Initial investment amount in USD"
    )
    
    # Request withdrawal command
    withdrawal_parser = subparsers.add_parser("request-withdrawal", help="Request a withdrawal")
    withdrawal_parser.add_argument(
        "--id",
        type=str,
        required=True,
        help="Participant ID"
    )
    withdrawal_parser.add_argument(
        "--amount",
        type=float,
        required=True,
        help="Amount to withdraw in USD"
    )
    
    # Process withdrawals command
    process_withdrawals_parser = subparsers.add_parser("process-withdrawals", help="Process all pending withdrawals")
    
    # Config command
    config_parser = subparsers.add_parser("config", help="Get system configuration")
    
    # Exchanges command
    exchanges_parser = subparsers.add_parser("exchanges", help="Get information about configured exchanges")
    
    # Exchange markets command
    exchange_markets_parser = subparsers.add_parser("exchange-markets", help="Get market data for a specific exchange")
    exchange_markets_parser.add_argument(
        "--exchange",
        type=str,
        required=True,
        help="Exchange identifier (e.g., binance, gate, hotcoin)"
    )
    
    # STX markets command
    stx_markets_parser = subparsers.add_parser("stx-markets", help="Get STX market data across all exchanges")
    
    return parser.parse_args()

async def main():
    """Main entry point for the PoolMind CLI."""
    args = parse_arguments()
    
    # Set up logging
    setup_logging(log_level=args.log_level)
    logger = logging.getLogger(__name__)
    
    # Initialize API client
    api_client = PoolMindAPIClient(base_url=args.api_url)
    
    try:
        # Execute the requested command
        if args.command == "status":
            result = await api_client.get_status()
        elif args.command == "start":
            result = await api_client.start_system()
        elif args.command == "stop":
            result = await api_client.stop_system()
        elif args.command == "run-cycle":
            result = await api_client.run_cycle()
        elif args.command == "pool":
            result = await api_client.get_pool_metrics()
        elif args.command == "participants":
            result = await api_client.get_participants(args.id)
        elif args.command == "add-participant":
            result = await api_client.add_participant(args.id, args.investment)
        elif args.command == "request-withdrawal":
            result = await api_client.request_withdrawal(args.id, args.amount)
        elif args.command == "process-withdrawals":
            result = await api_client.process_withdrawals()
        elif args.command == "config":
            result = await api_client.get_config()
        elif args.command == "exchanges":
            result = await api_client.get_exchanges()
        elif args.command == "exchange-markets":
            result = await api_client.get_exchange_markets(args.exchange)
        elif args.command == "stx-markets":
            result = await api_client.get_stx_markets()
        else:
            print("No command specified. Use --help for usage information.")
            return
        
        # Print the result as formatted JSON
        print(json.dumps(result, indent=2))
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        await api_client.close()

if __name__ == "__main__":
    asyncio.run(main())
