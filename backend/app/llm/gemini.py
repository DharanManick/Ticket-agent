from typing import Type, TypeVar, List
from google import genai
from google.genai import types
from pydantic import BaseModel
from loguru import logger
from app.config import settings
from app.llm.base import BaseLLMProvider

T = TypeVar("T", bound=BaseModel)

class GeminiLLMProvider(BaseLLMProvider):
    """Gemini LLM Provider using the new google-genai SDK."""

    def __init__(self, api_key: str = None, model_name: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set in settings!")
        self.client = genai.Client(api_key=self.api_key)

    async def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction if system_instruction else None
            )
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
            return response.text or ""
        except Exception as e:
            logger.error(f"Gemini generate_text failed: {e}")
            raise e

    async def generate_structured(
        self, prompt: str, schema: Type[T], system_instruction: str = ""
    ) -> T:
        try:
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
                system_instruction=system_instruction if system_instruction else None,
            )
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
            # Response is pre-parsed or validated against Pydantic schema
            if response.parsed:
                return response.parsed
            # Fallback parsing via Pydantic model_validate_json
            return schema.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Gemini generate_structured failed for schema {schema.__name__}: {e}")
            raise e

    async def get_embedding(self, text: str, model_name: str = "gemini-embedding-2-preview") -> List[float]:
        """
        Generate embedding for the input text using Gemini API.
        Correctly accesses the 'embedding' vector from the EmbedContentResponse object
        by reading the 'values' property.
        """
        try:
            response = self.client.models.embed_content(
                model=model_name,
                contents=text,
            )
            # Accessing the 'embedding' vector from the Gemini 'EmbedContentResponse' object
            # by accessing the 'values' property in accordance with the google-genai SDK structure.
            if hasattr(response, "embedding") and response.embedding is not None:
                embedding_obj = response.embedding
                if hasattr(embedding_obj, "values") and embedding_obj.values is not None:
                    return list(embedding_obj.values)
                elif isinstance(embedding_obj, dict) and "values" in embedding_obj:
                    return list(embedding_obj["values"])
                elif isinstance(embedding_obj, (list, tuple)):
                    return list(embedding_obj)

            if isinstance(response, dict) and "embedding" in response:
                emb = response["embedding"]
                if isinstance(emb, dict) and "values" in emb:
                    return list(emb["values"])
                elif isinstance(emb, (list, tuple)):
                    return list(emb)

            return []
        except Exception as e:
            logger.error(f"Gemini get_embedding failed: {e}")
            return []

