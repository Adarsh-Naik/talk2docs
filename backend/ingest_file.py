""" This module provides functions for ingesting file data into a document vector store.
It handles loading various file types (PDF, TXT, DOCX, DOC), splitting them into
manageable chunks, cleaning the text content, and indexing these chunks in a
vector store for efficient retrieval. The module also includes error handling
and logging to ensure robustness """
import io
from pathlib import Path
from langchain_community.document_loaders import TextLoader, PyMuPDFLoader, DedocFileLoader
from langchain.schema import Document
from store import get_doc_vector_store, text_splitter, clean_text
from tempfile import NamedTemporaryFile
import logging

logger = logging.getLogger(__name__)

def load_and_split(file_bytes: bytes, filename: str):
    """Load file from bytes and split into documents"""
    suffix = Path(filename).suffix.lower()
    
    with NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        
        try:
            if suffix == ".pdf":
                loader = PyMuPDFLoader(tmp.name)
                docs = loader.load()
            elif suffix == ".txt":
                loader = TextLoader(tmp.name, encoding='utf-8')
                docs = loader.load()
            elif suffix in [".docx", ".doc"]:
                # Use Docx2txtLoader for Word documents
                loader = DedocFileLoader(tmp.name)
                docs = loader.load()
            else:
                raise ValueError(f"Unsupported file type: {filename}")
        
        except Exception as e:
            logger.error(f"Error loading {filename}: {str(e)}")
            # Create a fallback document if loading fails
            docs = [Document(
                page_content=f"Error loading file: {filename}. Error: {str(e)}",
                metadata={"source": filename, "error": True}
            )]
    
    # Clean and process each document's text before splitting
    processed_docs = []
    for doc in docs:
        if hasattr(doc, 'page_content') and doc.page_content:
            cleaned_content = clean_text(doc.page_content)
            if cleaned_content.strip():  # Only keep non-empty documents
                doc.page_content = cleaned_content
                processed_docs.append(doc)
    
    # Split documents into chunks
    if processed_docs:
        return text_splitter.split_documents(processed_docs)
    else:
        return []

def ingest_file_bytes(file_bytes: bytes, filename: str, tenant_id: str) -> int:
    """
    Ingest file bytes into the tenant's document vector store
    
    Args:
        file_bytes: Raw file bytes
        filename: Name of the file
        tenant_id: Tenant identifier
        
    Returns:
        int: Number of chunks processed
    """
    
    try:
        # Load and split the document
        chunks = load_and_split(file_bytes, filename)
        
        if not chunks:
            logger.warning(f"No content extracted from {filename}")
            return 0
        
        # Get the document vector store for this tenant
        doc_vector_store = get_doc_vector_store(tenant_id)


        # Add metadata to each chunk
        for doc in chunks:
            if not hasattr(doc, 'metadata'):
                doc.metadata = {}
            
            # Clean metadata: drop None or empty values
            cleaned_metadata = {}
            for k, v in doc.metadata.items():
                if v is None:
                    continue
                if isinstance(v, str) and v.strip() == "":
                    continue
                cleaned_metadata[k] = v
            doc.metadata = cleaned_metadata
        
            doc.metadata.update({
                "source_file": filename,
                "type": "document"
            })
            
            # Clean up content whitespace
            if hasattr(doc, 'page_content'):
                doc.page_content = ' '.join(doc.page_content.split())
        
        # Split into batches for efficient indexing
        BATCH_SIZE = 100
        total_chunks = len(chunks)
        
        for i in range(0, total_chunks, BATCH_SIZE):
            batch = chunks[i:i + BATCH_SIZE]
            try:
                doc_vector_store.add_documents(batch)
                logger.info(f"Indexed batch {i//BATCH_SIZE + 1} ({len(batch)} chunks) for {filename}")
            except Exception as e:
                logger.error(f"Error indexing batch {i//BATCH_SIZE + 1} for {filename}: {str(e)}")
                raise
        
        logger.info(f"Successfully ingested {total_chunks} chunks from {filename} for tenant {tenant_id}")
        return total_chunks
        
    except Exception as e:
        logger.error(f"Error ingesting {filename} for tenant {tenant_id}: {str(e)}")
        raise