"""
Modular FastAPI Application Entry Point and RAG VectorDB interface.
"""
from app.main import app
from app.memory.vector_store import IncidentVectorMemory, vector_memory

def initialize_rag_vectordb(documents):
    """
    Helper function to initialize RAG VectorDB with documents by generating
    Gemini embeddings and reading the 'values' property of EmbedContentResponse.embedding.
    """
    return vector_memory.initialize_rag_vectordb(documents)

__all__ = ["app", "IncidentVectorMemory", "vector_memory", "initialize_rag_vectordb"]

