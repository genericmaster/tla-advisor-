# Build log

## 2026-06-26

- Set up project skeleton: uv, src/ layout, .gitignore, README stub.
- Created package tla_advisor, installed editable with `uv pip install -e .`.
- Initialised git, first commit, pushed to GitHub.
- Set up Substack publication for future writeups.
- Decided: develop natively on Windows, defer Docker until end of project.


## 2026-06-27

- What I did: explored Ollama embeddings and Chroma. Got end-to-end retrieval working on a toy example.
- Key things learned: 
  - Pooling — embedding models output one vector per input, not one per token.
  - Chroma stores SQLite + HNSW index files together.
  - Idempotency: create vs get vs get_or_create, add vs upsert.
- Surprises:
  - Semantic search picked up the right document even when query wording was totally different.
  - Default Chroma embedder was silently overriding my model choice until I passed embeddings explicitly.
- Decisions made: stick with nomic-embed-text via Ollama; always pass embeddings explicitly to Chroma.
- Next: review the original retrieval design (Embedder / VectorStore / Retriever) now that I've seen the tools.