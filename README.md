## TLA Advisor

TLA Advisor is a custom retrieval-augmented generation system initially built for the Technical Lab Assistants at Wits University's MSS department. It gives staff a conversational interface for resolving building-specific software issues — retrieving relevant solutions from an institutional knowledge base and generating context-aware responses. When the system gives a wrong answer, staff can submit a correction, which goes through a human review pipeline before being added back into the knowledge base, improving future retrievals over time.

---
## stack
- Built with: FastAPI, ChromaDB, Ollama, SQLite, Docker, Samba
- uses langchain_text_splitters for recursive chunking    only
 - Demonstrates: RAG pipeline design, local LLM serving, human-in-the-loop feedback, production-shaped Python architecture

## Architecture

TLA Advisor uses a standard RAG pipeline — queries are embedded, semantically similar chunks are retrieved from a vector store, and a local LLM generates a response grounded in the retrieved context. All components are defined against abstract interfaces, making the embedding model, vector store, and generator independently swappable.

**Components:**
- **OllamaEmbedder** — embeds queries using `nomic-embed-text` via Ollama
- **ChromaVectorStore** — stores and retrieves document chunks using ChromaDB
- **OllamaGenerator** — generates streaming responses using `qwen3:9b` via Ollama
- **RAGPipeline** — orchestrates the full query → embed → retrieve → generate flow
- **Feedback loop** — corrections submitted by users are validated by a second LLM call, reviewed by an admin, and re-ingested into the vector store
- **Samba integration** — approved corrections are written to a file on a remote Linux system via SMB, providing persistent shared storage independent of the application container

---

## How to run it

**Prerequisites:**
- Python 3.12+
- [Ollama](https://ollama.com) running locally with `nomic-embed-text` and `qwen3:9b` pulled
- I would advice to use qwen models as they are really good with instrction following 
- Docker (for the Samba share, optional)

**Setup:**
```bash
git clone <repo>
cd tla-advisor
uv sync
cp .env.example .env  # fill in OLLAMA_HOST and SAMBA credentials
```

**Run:**
```bash
uvicorn src.main:app --reload
```

The app will be available at `http://localhost:8000`. On first run, ingest your documents before querying.

---

## Key decisions

**Chunk size of 3000 characters** — TLA support documents contain a problem description followed by step-by-step fix instructions. Smaller chunks split these apart, causing the retriever to return a problem without the fix. 3000 characters keeps problem and solution in one chunk.
Note this is done for documents relating to my workplace experiment with what chunk size fits best for your system

**`think=False` on the generator** — Qwen3's thinking mode added 40+ seconds of latency per query with no meaningful quality improvement for retrieval-grounded responses. Disabled.

**9B over 3B model** — the 3B model hallucinated across chunks, inventing fixes not present in the retrieved context. The 9B model respects the context boundary more reliably.

**Abstract interfaces for all components** — `Embedder`, `VectorStore`, and `Generator` are all abstract base classes. The concrete implementations (Ollama, ChromaDB) are wired at startup. This means the embedding model or vector store can be swapped without touching the pipeline.

**Regulariser before admin review** — user corrections go through a second LLM call that validates and formats them before reaching the admin queue. This filters out vague, off-topic, or injection-attempt corrections before a human sees them.

**prompt reinforcement** - a lot of experimentation had to be done to ensure the model doesnt leak information or behave unrelated to core business function the main goal was to get the model to comply to instructions for as small a model  size as we could use  since improvement s in instrcution following grows with model size for the same model family

---

## What's next

- Admin document ingestion UI — currently documents are ingested via script; an admin upload interface is in progress
- Source metadata on vector store entries — provenance tracking so retrieved chunks can be attributed to their source document
- Embedding cache — the embedder is called fresh on every query with no caching, contributing to latency
- chunk  reranker in future
- RAGAS evaluation — deferred until real usage data exists