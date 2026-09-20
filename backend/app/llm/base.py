from abc import ABC, abstractmethod
from typing import Type, TypeVar, List
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class BaseLLMProvider(ABC):
    """Abstract interface for LLM providers allowing vendor interchangeability."""

    @abstractmethod
    async def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        """Generate raw text response."""
        pass

    @abstractmethod
    async def generate_structured(
        self, prompt: str, schema: Type[T], system_instruction: str = ""
    ) -> T:
        """Generate structured response matching a Pydantic schema."""
        pass

    @abstractmethod
    async def get_embedding(self, text: str, model_name: str = None) -> List[float]:
        """Generate text embedding vector."""
        pass
