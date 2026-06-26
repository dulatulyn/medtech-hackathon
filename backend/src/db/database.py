"""Database configuration and utility functions."""

from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

async def check_db_connection(engine: AsyncEngine) -> bool:
    """Check if database connection is working."""
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
