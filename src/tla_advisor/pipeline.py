import logging
from typing import Iterator
import time
from tla_advisor.retrieval.vector_store import VectorStore
from tla_advisor.retrieval.embedder import Embedder
from tla_advisor.generator.generation import Generator
from tla_advisor.prompt_processing.build_prompt import ollama_prompt_builder
logger = logging.getLogger(__name__)

class RAGPipeline:
    def __init__(self, embedder: Embedder, vector_store: VectorStore, generator: Generator):
        self.embedder = embedder
        self.vector_store = vector_store
        self.generator = generator
    
    def answer(self, query: str) -> Iterator[str]:
        logger.info(f"query received: {query}")
        
        t0=time.time()
        
        query_embedding = self.embedder.embed([query])
        logger.info(f"embed: {time.time() - t0:.2f}s")
        
        t1 = time.time()
        
        results = self.vector_store.query(query_embedding, n_results=5)
        logger.info(f"retrieve: {time.time() - t1:.2f}s")
        
        t2 =time.time()   
        prompt = ollama_prompt_builder(query, results)
        logger.info(f"build_prompt: {time.time() - t2:.2f}s")

        return self.generator.generate(prompt)
    
