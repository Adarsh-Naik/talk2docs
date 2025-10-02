from ollama_embeddings import OllamaEmbeddings
from langchain_community.vectorstores import OpenSearchVectorSearch
from langchain.text_splitter import RecursiveCharacterTextSplitter
import re
import requests
import logging

logger = logging.getLogger(__name__)

# Embedding Model
embedding_model = OllamaEmbeddings(model="all-minilm:22m")

# OpenSearch configuration
OPENSEARCH_URL = "http://localhost:9200"
HTTP_AUTH = ("admin", "Opensearch@3")

# Text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1200,
    chunk_overlap=120,
    separators=["\n\n", "\n", " ", ""]
)

def create_index_if_not_exists(index_name: str):
    """Create OpenSearch index with proper mappings if it doesn't exist"""
    
    # Check if index exists
    check_url = f"{OPENSEARCH_URL}/{index_name}"
    
    try:
        response = requests.head(
            check_url,
            auth=HTTP_AUTH,
            verify=False
        )
        
        if response.status_code == 200:
            logger.info(f"Index {index_name} already exists")
            return
            
    except Exception as e:
        logger.warning(f"Error checking index existence: {e}")
    
    # Create index with mapping
    mapping = {
        "settings": {
            "index": {
                "knn": True
            }
        },
        "mappings": {
            "properties": {
                "text": {
                    "type": "text"
                },
                "vector_field": {
                    "type": "knn_vector",
                    "dimension": 384
                },
                "metadata": {
                    "type": "object"
                }
            }
        }
    }
    
    try:
        response = requests.put(
            check_url,
            json=mapping,
            auth=HTTP_AUTH,
            verify=False,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code in [200, 201]:
            logger.info(f"Successfully created index: {index_name}")
        else:
            logger.error(f"Failed to create index {index_name}: {response.text}")
            
    except Exception as e:
        logger.error(f"Error creating index {index_name}: {e}")

def get_doc_vector_store(tenant_id: str):
    """Get vector store for documents of a specific tenant"""
    index_name = f"doc_{tenant_id}"
    
    # Create index if it doesn't exist
    create_index_if_not_exists(index_name)
    
    return OpenSearchVectorSearch(
        opensearch_url=OPENSEARCH_URL,
        embedding_function=embedding_model,
        index_name=index_name,
        text_field="text",
        vector_field="vector_field",
        http_auth=HTTP_AUTH,
        verify_certs=False,
    )

def get_chat_history_vector_store(tenant_id: str):
    """Get vector store for chat history of a specific tenant"""
    index_name = f"chat_history_{tenant_id}"
    
    # Create index if it doesn't exist
    create_index_if_not_exists(index_name)
    
    return OpenSearchVectorSearch(
        opensearch_url=OPENSEARCH_URL,
        embedding_function=embedding_model,
        index_name=index_name,
        text_field="text",
        vector_field="vector_field",
        http_auth=HTTP_AUTH,
        verify_certs=False,
    )


def clean_text(text: str, preserve_special_chars: bool = False) -> str:
    """
    Clean text before chunking and storage
    
    Args:
        text: Input text to clean
        preserve_special_chars: If True, preserve $, %, @, #, etc. for technical content
    """
    if not text:
        return ""
    
    # Remove extra whitespace and fix hyphenated words
    text = ' '.join(text.split())
    text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
    
    if preserve_special_chars:
        # Preserve common technical symbols
        text = re.sub(r'[^\w\s.,;:!?\-$%@#&+*=<>/]', ' ', text)
    else:
        # Remove special characters except basic punctuation
        text = re.sub(r'[^\w\s.,;:!?\-]', ' ', text)
    
    # Normalize whitespace around punctuation
    text = re.sub(r'\s+([.,;:!?])', r'\1', text)
    text = re.sub(r'([.,;:!?])(?!\s)', r'\1 ', text)
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()