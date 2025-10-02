from langchain.embeddings.base import Embeddings
import requests
from typing import List
import logging

logger = logging.getLogger(__name__)

class OllamaEmbeddings(Embeddings):
    def __init__(self, model: str = "all-minilm:22m", base_url: str = "http://localhost:11434"):
        """
        Initialize Ollama embeddings client
        
        Args:
            model: The embedding model name (default: all-minilm:latest)
            base_url: Ollama server base URL (default: http://localhost:11434)
        """
        self.model = model
        self.base_url = base_url
        self.endpoint = f"{base_url}/api/embeddings"

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of documents
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        embeddings = []
        for text in texts:
            try:
                embedding = self._embed(text)
                embeddings.append(embedding)
            except Exception as e:
                logger.error(f"Error embedding document: {str(e)}")
                # Return zero vector as fallback
                embeddings.append([0.0] * 384)  # Assuming 384 dimensions for all-minilm
        
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single query text
        
        Args:
            text: Text string to embed
            
        Returns:
            Embedding vector
        """
        try:
            return self._embed(text)
        except Exception as e:
            logger.error(f"Error embedding query: {str(e)}")
            # Return zero vector as fallback
            return [0.0] * 384

    def _embed(self, text: str) -> List[float]:
        """
        Internal method to get embeddings from Ollama
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as list of floats
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            return [0.0] * 384
        
        payload = {
            "model": self.model,
            "prompt": text.strip()
        }
        
        try:
            response = requests.post(
                self.endpoint,
                json=payload,
                timeout=30  # Add timeout to prevent hanging
            )
            
            if response.status_code != 200:
                error_msg = f"Ollama embedding request failed with status {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            result = response.json()
            
            if "embedding" not in result:
                error_msg = f"No embedding found in response: {result}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            embedding = result["embedding"]
            
            if not isinstance(embedding, list) or not embedding:
                error_msg = f"Invalid embedding format: {type(embedding)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            return embedding
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Network error while getting embeddings: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        except ValueError as e:
            raise e
        except Exception as e:
            error_msg = f"Unexpected error during embedding: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

    def is_available(self) -> bool:
        """
        Check if Ollama server is available and has the model
        
        Returns:
            bool: True if available, False otherwise
        """
        try:
            # Test with a simple embedding
            test_embedding = self._embed("test")
            return len(test_embedding) > 0
        except Exception as e:
            logger.warning(f"Ollama embeddings not available: {str(e)}")
            return False