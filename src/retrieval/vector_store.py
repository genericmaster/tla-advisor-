from chromadb import PersistentClient
from abc import ABC,abstractmethod

#abstract method that defines how  any other vector database class must be handles
class VectorStore(ABC):
    @abstractmethod
    def add(self,ids:list[str],embeddings:list[float],documents:list[str])->None:
        pass
    def query(self,query_embeddings:list[float] ,n_results=5)->dict:
        pass
    
class ChromaVectorStore(VectorStore):
    def __init__(self,collection_name:str,client:PersistentClient):
        self.collection = client.get_or_create_collection(name =collection_name)
        
    def add(self,ids:list[str],embeddings:list[float],documents:list[str])->None:
        if  not documents:
           raise ValueError("Cannot add collection with empty or missing document content.") 
            
        else:
            self.collection.add(ids = ids,
                            embeddings=embeddings,
                            documents = documents   
                )
    def query(self, query_embeddings:list[float], n_results=5)->dict:
        if self.collection.count()==0:
            raise RuntimeError("Cannot perform search on an empty collection.") 
        else:
            vector_query =self.collection.query(query_embeddings = query_embeddings,
                                 n_results = n_results   
            )
            return vector_query
    
       
        
        
        
        
    
    
    

