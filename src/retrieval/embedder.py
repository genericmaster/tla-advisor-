from abc import ABC,abstractmethod
from ollama import Client

class Embedder(ABC):
    @abstractmethod
    def embed(self,text:list[str])->list[list[float]]:
        pass
    
class OllamaEmbedder(Embedder):
    def __init__(self,embedder_name: str,client:Client):
        self.model_name = embedder_name
        self.client = client
 
    def embed(self,text:list[str])->list[list[float]]:
        embed_response= self.client.embed(model=self.model_name,input=text)
        return embed_response.embeddings
        
   
        



