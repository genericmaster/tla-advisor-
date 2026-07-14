# TLA RAG System

this is a early development iteration of my feedback based rag system that uses user feedback to get better at giving helpful responses for technical lab assistants 

## Basic setup


## Design decisions


## Components built so far

- Embedder (`src/tla_advisor/retrieval/embedder.py`)
  - Abstract `Embedder` base class
  - `OllamaEmbedder` concrete implementation using `nomic-embed-text` via Ollama
  - design decision was to  let `nomic-embed-text` also be chosen embedder for query  
- Application startup (`src/tla_advisor/startup.py`)
  - Loads env vars, constructs the Ollama client, instantiates the embedder
- VectorStore (`src/tla_advisor/retrieval/vector_store.py`)
 - abstract `VectorStore` base class
 - `ChromaVectorStore` concrete class using  a persistent client instance from chromadb
 - handles adding chunks/documents to vector database and handles routing embedded query and retireval  
- abstract `GENERATOR` base class 
- '`OLLAMAGENERATOR` is the concrete implementation  that uses same ollama client as

`OLLAMAEMBedder` 
- it handles the response generation using local models which are easily interchangeable future implemetation maybe to let the user choose which model   they want a response from

- `ollama_build_prompt` is  a standalone  function  that deals with the formatting of the query and context then concatinating them 
- assists in maintaining single responsibility for generator classes


## Usage