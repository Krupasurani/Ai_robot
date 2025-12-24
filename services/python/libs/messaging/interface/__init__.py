"""
Messaging Interfaces - Abstract base classes for messaging operations.
"""

from libs.messaging.interface.consumer import IMessagingConsumer
from libs.messaging.interface.producer import IMessagingProducer

__all__ = [
    "IMessagingConsumer",
    "IMessagingProducer",
]

