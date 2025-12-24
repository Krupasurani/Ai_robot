# Shared Libraries (`libs/`)

This directory contains reusable, service-agnostic code that can be imported by any of the backend microservices (Query, Indexing, Connector, Docling).

## Directory Structure

```
libs/
├── core/                    # Core utilities and configuration
│   ├── config/              # Configuration management
│   │   ├── configuration_service.py
│   │   └── key_value_store.py
│   ├── resilience/          # Fault tolerance patterns
│   │   ├── retry.py         # Retry with exponential backoff
│   │   └── dlq.py           # Dead Letter Queue
│   ├── utils/               # Common utilities
│   │   ├── redis_utils.py
│   │   └── time_utils.py
│   ├── constants.py         # Shared constants and enums
│   ├── encryption.py        # AES-256-GCM encryption
│   ├── exceptions.py        # Exception hierarchy
│   └── logging.py           # Standardized logging
│
├── data/                    # Database interfaces and implementations
│   ├── graph/               # Graph database (ArangoDB)
│   │   ├── interface.py     # IGraphService interface
│   │   ├── arango_service.py
│   │   └── config.py
│   └── vector/              # Vector database (Qdrant)
│       ├── interface.py     # IVectorDBService interface
│       ├── qdrant_service.py
│       └── config.py
│
├── messaging/               # Message broker abstractions
│   ├── interface/           # Consumer/Producer interfaces
│   ├── kafka/               # Kafka implementation
│   │   ├── consumer.py
│   │   ├── producer.py
│   │   └── rate_limiter.py
│   └── factory.py           # MessagingFactory
│
└── containers/              # Dependency injection base classes
    └── base.py              # BaseServiceContainer
```

## Usage Examples

### Logging

```python
from libs.core import create_logger

logger = create_logger("my_service")
logger.info("Service started")
```

### Configuration

```python
from libs.core import ConfigurationService, ConfigPath

config_service = ConfigurationService(logger, key_value_store)
db_config = await config_service.get_config(ConfigPath.ARANGODB.value)
```

### Database Operations

```python
from libs.data.graph import ArangoService, ArangoConfig

# Using configuration service
service = await ArangoService.create(logger, config_service)
await service.connect()

# Execute queries
results = await service.execute_query("FOR doc IN users RETURN doc")
```

### Messaging

```python
from libs.messaging import MessagingFactory, KafkaConsumerConfig

config = KafkaConsumerConfig(
    topics=["record-events"],
    client_id="indexing-consumer",
    group_id="indexing-group",
    bootstrap_servers=["localhost:9092"]
)
consumer = MessagingFactory.create_consumer(logger, config=config)
await consumer.start(handle_message)
```

### Resilience Patterns

```python
from libs.core.resilience import retry_with_backoff, DeadLetterQueue

# Retry with exponential backoff
@retry_with_backoff(max_attempts=3, base_delay=1.0)
async def fetch_data():
    return await external_api.get()

# Dead Letter Queue
dlq = DeadLetterQueue(
    producer=kafka_producer,
    dlq_topic="indexing-dlq",
    max_retries=3
)

try:
    await process_message(message)
except Exception as e:
    await dlq.send_to_dlq(message, e, original_topic="record-events")
```

## Migration Guide

### Old Import Path → New Import Path

| Old Path | New Path |
|----------|----------|
| `from app.utils.logger import create_logger` | `from libs.core import create_logger` |
| `from app.config.configuration_service import ConfigurationService` | `from libs.core.config import ConfigurationService` |
| `from app.config.constants.service import config_node_constants` | `from libs.core.constants import ConfigPath` |
| `from app.services.graph_db.arango.arango import ArangoService` | `from libs.data.graph import ArangoService` |
| `from app.services.vector_db.qdrant.qdrant import QdrantService` | `from libs.data.vector import QdrantService` |
| `from app.services.messaging.messaging_factory import MessagingFactory` | `from libs.messaging import MessagingFactory` |

### Constants Migration

| Old Constant | New Constant |
|--------------|--------------|
| `config_node_constants.ARANGODB` | `ConfigPath.ARANGODB` |
| `config_node_constants.KAFKA` | `ConfigPath.KAFKA` |
| `config_node_constants.REDIS` | `ConfigPath.REDIS` |
| `config_node_constants.QDRANT` | `ConfigPath.QDRANT` |

## Design Principles

1. **Interface-Driven**: All database and messaging operations go through abstract interfaces (`IGraphService`, `IVectorDBService`, `IMessagingConsumer`).

2. **Configuration Validation**: Use typed dataclasses (`ArangoConfig`, `QdrantConfig`, `KafkaConsumerConfig`) for configuration validation.

3. **Resilience Built-In**: Retry patterns and DLQ support are available out of the box.

4. **Consistent Logging**: All modules use the standardized logger format.

5. **Type Safety**: Full type hints throughout the codebase.

6. **Documentation**: Google-style docstrings on all public classes and methods.

