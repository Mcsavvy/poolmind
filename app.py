#!/usr/bin/env python3
"""
PoolMind - AI-powered Cross-Exchange Arbitrage Trading System

This is the main entry point for the PoolMind application.
It now uses the external API client to interact with the PoolMind API.
"""

import os
import sys
import argparse
import asyncio
import logging
from pathlib import Path

from poolmind.api_client import PoolMindAPIClient
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
        "--api-url",
        type=str,
        default="https://poolmind.futurdevs.com/api",
        help="URL of the PoolMind API"
    )
    
    parser.add_argument(
        "--run-cycle",
        action="store_true",
        help="Run a single trading cycle and exit"
    )
    
    parser.add_argument(
        "--monitor",
        action="store_true",
        help="Monitor the system status without starting it"
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
    logger.info("Starting PoolMind client application")
    
    # Initialize API client
    api_client = PoolMindAPIClient(base_url=args.api_url)
    
    try:
        if args.run_cycle:
            # Run a single trading cycle
            logger.info("Running a single trading cycle")
            result = await api_client.run_cycle()
            logger.info(f"Cycle result: {result}")
        elif args.monitor:
            # Monitor the system status
            logger.info("Monitoring system status")
            while True:
                status = await api_client.get_status()
                logger.info(f"System status: {status}")
                await asyncio.sleep(10)  # Check every 10 seconds
        else:
            # Start the system if not already running
            status = await api_client.get_status()
            if not status.get("is_running", False):
                logger.info("Starting PoolMind system")
                result = await api_client.start_system()
                logger.info(f"Start result: {result}")
            
            # Monitor the system status
            logger.info("Monitoring system status")
            while True:
                status = await api_client.get_status()
                logger.info(f"System status: {status}")
                await asyncio.sleep(10)  # Check every 10 seconds
    except KeyboardInterrupt:
        logger.info("PoolMind client application stopped by user")
    except Exception as e:
        logger.error(f"Error in PoolMind client application: {e}", exc_info=True)
    finally:
        logger.info("Closing API client")
        await api_client.close()
        logger.info("PoolMind client application stopped")


if __name__ == "__main__":
    asyncio.run(main())
