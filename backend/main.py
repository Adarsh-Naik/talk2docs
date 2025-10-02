#main.py
import base64
from ollama_multimodel import OllamaMultimodal
from ollama_embeddings import OllamaEmbeddings
from fastapi import FastAPI, File, UploadFile, Form, Body, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from typing import List
import logging
import asyncio
import urllib3
from langchain.prompts import PromptTemplate
from langchain_community.llms import Ollama
from langchain_ollama import ChatOllama
from store import get_doc_vector_store, get_chat_history_vector_store, text_splitter
from ingest_file import ingest_file_bytes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Suppress InsecureRequestWarning for localhost (development only)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Embedding Model
embedding_model = OllamaEmbeddings(model="all-minilm:22m")

# LLM Setup
llm = ChatOllama(model="deepseek-r1:1.5b", temperature=0.7)
"""
gpt-oss:latest
deepseek-r1:14b
qwen3:8b
"""

# Multimodal LLM (if used elsewhere)
multimodal_llm = OllamaMultimodal(model="gemma3:4b")

RAG_TEMPLATE = """
<|SYSTEM|>
You are a precise RAG assistant. Your sole task is to answer the user's `<QUESTION>` using ONLY the provided `<CONTEXT>`.

## Your Rules:
1.  **Strictly Grounded:** Base every single statement in your answer on the provided text. NEVER use external knowledge or make assumptions.
2.  **Cite Everything:** You MUST add a citation `[1]` or `[3][5]` after every piece of information. The citation goes *before* the punctuation.
3.  **List Your Sources:** After the answer, you MUST provide a `Sources:` list, citing the full title of each source you used.
4.  **Be Direct:** Do not add any conversational preamble. Start directly with the answer.
5.  **Handle No Information Politely:** If the context does not contain the answer, you MUST respond with the exact phrase: "I'm sorry, but I couldn't find the information needed to answer your question in the provided documents."

<|USER|>
<CONTEXT>
{context}
</CONTEXT>

<SOURCES_BLOCK>
{sources_block}
</SOURCES_BLOCK>

<CHAT_HISTORY>
{chat_history}
</CHAT_HISTORY>

<QUESTION>
{question}
</QUESTION>

<|SYSTEM|>
"""

prompt = PromptTemplate(input_variables=["context","sources_block", "chat_history", "question"], template=RAG_TEMPLATE)

# Create or get indexes
async def ensure_indexes_exist(tenant_id: str):
    # print(f"[DEBUG] Ensuring indexes exist for tenant: {tenant_id}")
    doc_vector_store = get_doc_vector_store(tenant_id)
    chat_history_vector_store = get_chat_history_vector_store(tenant_id)
    # print(f"[DEBUG] Got doc_vector_store and chat_history_vector_store for tenant: {tenant_id}")
    return doc_vector_store, chat_history_vector_store

# Get relevant chat history
async def get_relevant_history(query: str, tenant_id: str, k: int = 3) -> str:
    # print(f"[DEBUG] Fetching relevant chat history for tenant={tenant_id}, query='{query}'")
    try:
        chat_history_vector_store = get_chat_history_vector_store(tenant_id)
        docs = await asyncio.to_thread(
            chat_history_vector_store.similarity_search, 
            query, 
            k=k
        )
        # print(f"[DEBUG] Retrieved {len(docs) if docs else 0} history docs")
        if docs:
            history_context = "\n".join([doc.page_content for doc in docs])
            return f"Relevant previous conversations:\n{history_context}"
    except Exception as e:
        print(f"[ERROR] Error retrieving chat history for {tenant_id}: {str(e)}")
    return "No relevant previous conversation history available."

async def get_relevant_documents(query: str, tenant_id: str, k: int = 10):
    doc_vector_store = get_doc_vector_store(tenant_id)
    docs = await asyncio.to_thread(doc_vector_store.similarity_search, query, k=k)
    
    if not docs:
        return "\{empty\}", {}

    # Build numbered context and sources
    context = "\n".join([f"[{i+1}] {doc.page_content}" for i, doc in enumerate(docs)])
    sources = {}
    for i, doc in enumerate(docs):
        title = doc.metadata.get("title") or doc.metadata.get("source_file", "Unknown Source")
        page = doc.metadata.get("page")

        if page is not None:
            sources[f"[{i+1}]"] = f"{title} (page {page +1})"
        else:
            sources[f"[{i+1}]"] = f"{title}"

    return context, sources


# Store chat interaction in history
async def store_chat_history(query: str, response: str, tenant_id: str):
    # print(f"[DEBUG] Storing chat history for tenant={tenant_id}, query='{query[:50]}...'")
    try:
        chat_history_vector_store = get_chat_history_vector_store(tenant_id)
        chat_doc_content = f"Q: {query}\nA: {response}"
        
        from langchain.schema import Document
        chat_doc = Document(
            page_content=chat_doc_content,
            metadata={
                "type": "chat_history",
                "tenant_id": tenant_id,
                "query": query,
                "response": response
            }
        )
        
        await asyncio.to_thread(chat_history_vector_store.add_documents, [chat_doc])
        # print(f"[DEBUG] Chat history stored for tenant={tenant_id}")
    except Exception as e:
        print(f"[ERROR] Error storing chat history for {tenant_id}: {str(e)}")

# Stream response
async def stream_rag_response(query: str, tenant_id: str):
    # print(f"[DEBUG] stream_rag_response START tenant={tenant_id}, query='{query}'")
    await ensure_indexes_exist(tenant_id)
    
    # Step 1: Get relevant chat history
    chat_history = await get_relevant_history(query, tenant_id)
    # print(f"[DEBUG] Chat history context: {chat_history[:100]}...")
    
    # # Step 2: Combine history + query
    # combined_query = f"{chat_history}\n{query}" if chat_history != "No relevant previous conversation history available." else query
    # # print(f"[DEBUG] Combined query: {combined_query[:100]}...")
    
    # Step 3: Get relevant documents
    context, sources = await get_relevant_documents(query, tenant_id)
    # print(f"[DEBUG] Retrieved context length: {len(context)}")
    
    # Step 4: Format prompt
    formatted_prompt = prompt.format(
        context=context, 
        sources_block="\n".join(f"{k} {v}" for k, v in sources.items()),
        chat_history=chat_history, 
        question=query
    )
    # print(f"[DEBUG] Formatted prompt ready, length={len(formatted_prompt)}")
    print(f"[DEBUG] Formatted prompt:",formatted_prompt)
    
    # Step 5: Generate response
    response_chunks = []
    try:
        async for chunk in llm.astream(formatted_prompt):
            content = getattr(chunk, "content", str(chunk))
            # # print(f"[DEBUG] Streaming chunk: {content[:50]}...")
            yield content
            response_chunks.append(content)
    except Exception as e:
        print(f"[ERROR] Error during LLM streaming: {str(e)}")
    

    # # Step 6: Store chat history
    # response = "".join(response_chunks)
    # Append sources at the end
    sources_block = "\n".join(f"{k} {v}" for k, v in sources.items())
    # print("Source Block: ",sources_block)
    response = "".join(response_chunks) + f"\n\nSources:\n{sources_block}"
    # print("FINAL RESPONSE:",response)
    await store_chat_history(query, response, tenant_id)
    # print(f"[DEBUG] stream_rag_response END tenant={tenant_id}")

# Request Schema 
class Query(BaseModel):
    query: str
    tenantId: str

@app.post("/ask-stream")
async def stream_response(request: Query = Body(...)):
    if not request.tenantId:
        raise HTTPException(status_code=400, detail="Tenant ID is required.")
    # print(f"[DEBUG] /ask-stream endpoint called with tenantId={request.tenantId}, query='{request.query}'")
    
    return StreamingResponse(
        stream_rag_response(request.query, request.tenantId),
        media_type="text/event-stream",
        headers={'Cache-Control': 'no-cache'}
    )

@app.get("/", response_class=HTMLResponse)
async def serve_homepage():
    html_path = Path("static/index.html")
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    else:
        return HTMLResponse(content="<h1>RAG API Server</h1><p>Upload files via /ingest-multiple-files and ask questions via /ask-stream</p>", status_code=200)

@app.post("/ingest-multiple-files")
async def ingest_multiple_files_api(
    tenantId: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if not tenantId:
        raise HTTPException(status_code=400, detail="Tenant ID is required.")
    
    # Ensure indexes exist
    await ensure_indexes_exist(tenantId)
    
    total_chunks = 0
    errors = []

    for file in files:
        if not file.filename.endswith((".pdf", ".txt", ".docx", ".doc")):
            errors.append(f"Unsupported file type: {file.filename}")
            continue

        try:
            file_bytes = await file.read()
            chunk_count = await asyncio.to_thread(
                ingest_file_bytes, 
                file_bytes, 
                file.filename, 
                tenantId
            )
            total_chunks += chunk_count
        except Exception as e:
            logger.error(f"Error ingesting {file.filename}: {str(e)}")
            errors.append(f"Failed to ingest {file.filename}: {str(e)}")

    return {
        "message": "Ingestion completed",
        "total_chunks": total_chunks,
        "errors": errors
    }

@app.post('/ask-image')
async def ask_image(
    query: str = Form(...),
    images: List[UploadFile] = File(...)
):
    try:
        if not query.strip():
            raise HTTPException(status_code=400, detail="Query is required")
        
        if not images:
            raise HTTPException(status_code=400, detail="At least one image is required")
        
        images_data = []
        for file in images:
            if not file.filename:
                continue
            image_bytes = await file.read()
            image_b64 = base64.b64encode(image_bytes).decode('utf-8')
            images_data.append(image_b64)
        
        if not images_data:
            raise HTTPException(status_code=400, detail="No valid images found")
        
        async def generate_response():
            try:
                async for chunk in multimodal_llm.stream(images_data, query):
                    if isinstance(chunk, bytes):
                        chunk = chunk.decode('utf-8', errors='ignore')
                    yield chunk
            except Exception as e:
                yield f"Error: {str(e)}"
        
        return StreamingResponse(
            generate_response(), 
            media_type='text/event-stream',
            headers={'Cache-Control': 'no-cache'}
        )
                       
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Server error: {str(e)}')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)