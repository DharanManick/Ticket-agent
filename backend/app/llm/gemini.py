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
        self.fallback_model = settings.GEMINI_FALLBACK_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        self.fallback_embedding_models = settings.GEMINI_FALLBACK_EMBEDDING_MODELS
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set in settings!")
        self.client = genai.Client(api_key=self.api_key)

    async def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        models_to_try = [self.model_name]
        if self.fallback_model and self.fallback_model != self.model_name:
            models_to_try.append(self.fallback_model)

        last_err = None
        for m in models_to_try:
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction if system_instruction else None,
                    temperature=settings.GEMINI_TEMPERATURE
                )
                response = self.client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=config,
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                last_err = e
                logger.warning(f"Gemini generate_text attempt failed on {m}: {e}")

        logger.error(f"Gemini generate_text exhausted all models: {last_err}")
        raise last_err

    async def generate_structured(
        self, prompt: str, schema: Type[T], system_instruction: str = ""
    ) -> T:
        models_to_try = [self.model_name]
        if self.fallback_model and self.fallback_model != self.model_name:
            models_to_try.append(self.fallback_model)

        last_err = None
        for m in models_to_try:
            try:
                config = types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                    system_instruction=system_instruction if system_instruction else None,
                    temperature=settings.GEMINI_TEMPERATURE
                )
                response = self.client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=config,
                )
                if response.parsed:
                    return response.parsed
                if response.text:
                    return schema.model_validate_json(response.text)
            except Exception as e:
                last_err = e
                logger.warning(f"Gemini generate_structured attempt failed on {m}: {e}")

        logger.error(f"Gemini generate_structured failed for schema {schema.__name__}: {last_err}")
        raise last_err

    async def get_embedding(self, text: str, model_name: str = None) -> List[float]:
        """
        Generate embedding for the input text using centralized Gemini embedding model.
        Falls back to fallback embedding models if primary model is throttled or fails.
        """
        primary = model_name or self.embedding_model
        models_to_try = [primary] + [fb for fb in self.fallback_embedding_models if fb != primary]

        for m in models_to_try:
            try:
                response = self.client.models.embed_content(
                    model=m,
                    contents=text,
                )
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
            except Exception as e:
                logger.warning(f"Gemini get_embedding failed on {m}: {e}")

        logger.error("Gemini get_embedding exhausted all embedding candidate models.")
        return []

