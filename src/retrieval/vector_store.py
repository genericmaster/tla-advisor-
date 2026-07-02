from chromadb import PersistentClient
from abc import ABC,abstractmethod

#abstract method that defines how  any other vector database class must be handles
class VectorStore(ABC):
    @abstractmethod
    def add(self,ids:list[str],embeddings:list[list[float]],documents:list[str])->None:
        pass
    @abstractmethod
    def query(self,query_embedding:list[list[float]] ,n_results=5)->dict:
        pass
    
class ChromaVectorStore(VectorStore):
    def __init__(self,collection_name:str,client:PersistentClient):
        self.collection = client.get_or_create_collection(name =collection_name)
        
    def add(self,ids:list[str],embeddings:list[list[float]],documents:list[str])->None:
        if len(embeddings) != len(documents):
             raise ValueError('documents and embeddings dont align')
        if  not documents:
            raise ValueError("Cannot add collection with empty or missing document content") 
            
       
        self.collection.add(ids = ids,
                            embeddings=embeddings,
                            documents = documents   
                )
    def query(self, query_embedding:list[list[float]], n_results=5)->dict:
        if self.collection.count()==0:
            raise RuntimeError("Cannot perform search on an empty collection.") 
        
        vector_query =self.collection.query(query_embeddings = query_embedding,
                                 n_results = n_results   
            )
        return vector_query
    
       
        
        
        
        
    
    
    

