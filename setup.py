#!/usr/bin/env python3
"""
PoolMind - AI-powered Cross-Exchange Arbitrage Trading System
Setup script for the PoolMind package
"""

from setuptools import setup, find_packages

# Read version from poolmind/__init__.py
with open('poolmind/__init__.py', 'r') as f:
    for line in f:
        if line.startswith('__version__'):
            version = line.strip().split('=')[1].strip(' \'"')
            break
    else:
        version = '0.1.0'

# Read long description from README.md
with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name="poolmind",
    version=version,
    description="AI-powered Cross-Exchange Arbitrage Trading System",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="PoolMind Team",
    author_email="info@poolmind.ai",
    url="https://github.com/poolmind/poolmind",
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.9",
    install_requires=[
        # Core dependencies
        "python-dotenv>=1.0.0",
        "pydantic>=2.0.0",
        "asyncio>=3.4.3",
        
        # AI/ML dependencies
        "groq>=0.4.0",
        "langchain>=0.1.0",
        "langgraph>=0.0.20",
        "chromadb>=0.4.18",
        
        # Trading dependencies
        "ccxt>=4.0.0",
        "pandas>=2.0.0",
        "numpy>=1.24.0",
        
        # Database dependencies
        "redis>=4.6.0",
        "psycopg2-binary>=2.9.6",
        
        # Utilities
        "loguru>=0.7.0",
        "tenacity>=8.2.3",
        "httpx>=0.24.1",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.1",
            "pytest-cov>=4.1.0",
            "black>=23.7.0",
            "isort>=5.12.0",
            "mypy>=1.5.1",
            "flake8>=6.1.0",
        ],
        "docs": [
            "sphinx>=7.1.2",
            "sphinx-rtd-theme>=1.3.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "poolmind=poolmind.app:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Financial and Insurance Industry",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Office/Business :: Financial :: Investment",
    ],
    keywords="crypto, trading, arbitrage, ai, llm, multi-agent",
    project_urls={
        "Bug Reports": "https://github.com/poolmind/poolmind/issues",
        "Source": "https://github.com/poolmind/poolmind",
        "Documentation": "https://poolmind.readthedocs.io/",
    },
)
