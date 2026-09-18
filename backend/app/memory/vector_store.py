import os
import math
from typing import List, Dict, Any, Optional
from loguru import logger
from google import genai
from app.config import settings

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)

class IncidentVectorMemory:
    """
    RAG VectorDB for incident retrieval and knowledge matching using Gemini embeddings.
    Extracts embedding vectors from the Gemini EmbedContentResponse object via response.embedding.values.
    """

    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.vectors: List[List[float]] = []
        self.client: Optional[genai.Client] = None
        self.model_name = "gemini-embedding-2-preview"

    def _get_client(self) -> Optional[genai.Client]:
        if self.client is None and settings.GEMINI_API_KEY:
            try:
                self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to create Gemini client for VectorDB: {e}")
        return self.client

    def generate_embedding(self, text: str) -> List[float]:
        """
        Calls Gemini EmbedContent API and extracts the embedding vector from the
        EmbedContentResponse object by accessing the 'values' property on response.embedding.
        """
        client = self._get_client()
        if not client:
            return []

        try:
            response = client.models.embed_content(
                model=self.model_name,
                contents=text,
            )
            # Correctly access 'embedding' vector from EmbedContentResponse object via 'values' property
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
            logger.error(f"Gemini EmbedContent API failed: {e}")
            return []

    def initialize_rag_vectordb(self, documents: List[Dict[str, Any]]) -> int:
        """
        Initialize RAG VectorDB with documents by embedding each document's text
        using Gemini EmbedContentResponse (accessing response.embedding.values).
        """
        self.documents = []
        self.vectors = []
        count = 0

        logger.info(f"Initializing RAG VectorDB with {len(documents)} documents using Gemini embeddings...")

        for doc in documents:
            text = doc.get("text") or doc.get("description") or doc.get("shortDescription") or ""
            doc_id = doc.get("id") or doc.get("number") or f"doc_{count}"
            metadata = doc.get("metadata") or {}

            emb_vector = self.generate_embedding(text) if text else []

            self.documents.append({
                "id": doc_id,
                "text": text,
                "metadata": metadata
            })
            self.vectors.append(emb_vector)
            count += 1

        logger.info(f"RAG VectorDB initialization complete. Indexed {count} entries.")
        return count

    def add_incident(self, incident_id: str, text: str, metadata: Dict[str, Any] = None):
        emb_vector = self.generate_embedding(text) if text else []
        self.documents.append({
            "id": incident_id,
            "text": text,
            "metadata": metadata or {}
        })
        self.vectors.append(emb_vector)

    def search_similar(self, query_text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if not self.documents:
            return []

        q_vector = self.generate_embedding(query_text)

        if q_vector:
            scored_docs = []
            for doc, doc_vec in zip(self.documents, self.vectors):
                sim = cosine_similarity(q_vector, doc_vec) if doc_vec else 0.0
                scored_docs.append((sim, doc))

            scored_docs.sort(key=lambda x: x[0], reverse=True)
            return [doc for _, doc in scored_docs[:top_k]]

        # Fallback keyword matching
        words = [w.lower() for w in query_text.split() if len(w) > 3]
        matches = [d for d in self.documents if any(w in d["text"].lower() for w in words)]
        return matches[:top_k]

vector_memory = IncidentVectorMemory()

