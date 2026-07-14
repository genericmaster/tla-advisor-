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

## 2026-06-28 — Embedder component

What I did:
- Designed and built the Embedder abstract base + OllamaEmbedder concrete implementation.
- Used dependency injection (constructor-style) for the Ollama client and model name.
- Split files: embedder.py contains only the classes; startup.py loads env, creates the client, constructs the embedder.

Key decisions:
- Abstract base class with ABC enforcement, even though only one implementation today.
- Constructor injection (Option B) over creating the client inside __init__ (Option A).
- Model name in config file (committed), Ollama host URL in .env (gitignored).
- No module-level side effects in embedder.py — startup.py owns the wiring.

What was confusing:
- The difference between "where the dependency lives" and "where it's fetched from."
  Pattern 1 (component pulls from globals) vs Pattern 2 (caller pushes via constructor).
- Multiple imports of the same class across files isn't duplication — same class, two references.


## 2026-07-01 -vector store

what i did:
  built out the vector database using chromadb 
  had to use abstract class to stay consistent with the embedding logic
  decided to also add a bit of error hanfling for empty queries and  documents 
  the dependency injection is identical to the one used for embedding logic
  included type hints as well so that its easier to understand the code for a reader

key decisions
  - deciding to keep the structure the same as embedding model
  - realising that i should not try to add extra funcionality before i get the base of the system done
  - keeping query inside vector store 
  -that meant i had to expose what query returned 
  - deciding not to prune return from query until i know what will be useful when testing the system out
  
## 2026-07-03 -generator component 

what i did
- created a generator class that has the responsibilty of taking a 2 types of prompts and giving back a response a user can use

- it mainly needs a system prompt and a user prompt
- user prompt must include both query and context
- both prompts are constructed outsidet the component

key decisions
 - deciding that query and context formatting and concatination happen outside the component

 - using the same  client as embedder for model responses reason was mainly to reduce amount of api calls
 - kepping the same  base class concrete class implementation as the other components for consistency

 ## small writeup on build prompt

 - build prompt is a function that i made so that query context processing  is decoupled from the generator class it takes in the response from chroma vectore store query abd extracts the chunks needed a bit of preprocessing is done then it is concatinated with query  before being fed to the ollamgenrator class
 

## 2026-07-04  DOCUMENT LOADER AND CHUNKING COMPONENT

## ISSUES WITH CHUNKING STRATEGY 