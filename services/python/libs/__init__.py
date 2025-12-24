"""
Shared Libraries for Python Backend Services.

This package contains reusable, service-agnostic code that can be imported
by any of the backend microservices (Query, Indexing, Connector, Docling).

Modules:
    - core: Logging, configuration, exceptions, and base utilities.
    - data: Database clients and interfaces (ArangoDB, Redis, VectorDB).
    - messaging: Kafka producer/consumer abstractions.
"""

