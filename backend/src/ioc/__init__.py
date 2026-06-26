"""Dependency injection container configuration using Dishka."""

from src.ioc.database_provider import DatabaseProvider
from src.ioc.infra_provider import InfraProvider
from src.ioc.repository_provider import RepositoryProvider
from src.ioc.service_provider import ServiceProvider

class AppProvider(
    DatabaseProvider,
    InfraProvider,
    RepositoryProvider,
    ServiceProvider,
):
    """Main dependency injection provider for the application."""
    pass

__all__ = ["AppProvider"]
