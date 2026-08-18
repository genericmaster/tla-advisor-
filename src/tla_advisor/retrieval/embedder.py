import logging
from abc import ABC,abstractmethod
from ollama import Client
logger = logging.getLogger(__name__)

"abstract method that defines how any other embedder model provider should be handled"
class Embedder(ABC):
    @abstractmethod
    def embed(self,text:list[str])->list[list[float]]:
        pass
    
class OllamaEmbedder(Embedder):
    def __init__(self,embedder_name: str,client:Client):
        self.model_name = embedder_name
        self.client = client
    
    def embed(self,text:list[str])->list[list[float]]:
        try:
            embed_response= self.client.embed(model=self.model_name,input=text)
            if not embed_response.embeddings:
             logger.warning(f"embed returned empty — {len(text)} inputs, 0 embeddings returned")
            elif len(embed_response.embeddings) != len(text):
             logger.warning(f"embed count mismatch — expected {len(text)}, got {len(embed_response.embeddings)}")
            else:
                logger.info(f"embedded {len(text)} texts successfully")
            return embed_response.embeddings
            
        except Exception as e:
              logger.error(f"failed to reach ollama {e}")
              raise
       
        



