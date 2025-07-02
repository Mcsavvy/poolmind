#!/usr/bin/env python3
"""
PoolMind - AI-powered Cross-Exchange Arbitrage Trading System

This is the main entry point for the PoolMind application.
"""

import os
import sys
import argparse
import asyncio
import logging
from pathlib import Path

from poolmind.main import PoolMind
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
        "--cycle-interval",
        type=int,
        help="Trading cycle interval in seconds"
    )
    
    parser.add_argument(
        "--sandbox",
        action="store_true",
        help="Run in sandbox mode (no real trades)"
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
    logger.info("Starting PoolMind application")
    
    # Initialize and run PoolMind
    poolmind = PoolMind()
    
    try:
        await poolmind.run()
    except KeyboardInterrupt:
        logger.info("PoolMind application stopped by user")
    except Exception as e:
        logger.error(f"Error in PoolMind application: {e}", exc_info=True)
    finally:
        logger.info("PoolMind application stopped")


if __name__ == "__main__":
    asyncio.run(main())
