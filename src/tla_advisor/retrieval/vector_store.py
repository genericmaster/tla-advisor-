import logging
from chromadb import PersistentClient
from abc import ABC,abstractmethod

logger = logging.getLogger(__name__)

"abstract method that defines how  any other vector database class must be handled"
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
            
        try:
            self.collection.add(ids = ids,
                                embeddings=embeddings,
                                documents = documents   
                )
            logger.info("document added to database successfully")
        except Exception as e :
            logger.error(f"document database addition could not be perfomed: {e}")
            raise
            
    def query(self, query_embedding:list[list[float]], n_results=5)->dict:
        if self.collection.count()==0:
            logger.warning("query attempted on empty collection")
            raise RuntimeError("Cannot perform search on an empty collection.") 
        try:
            vector_query =self.collection.query(query_embeddings = query_embedding,
                                    n_results = n_results   
                )
            logger.info("query and retrieval done successfully")
            return vector_query
        
        except Exception as e:
           logger.error(f"query could not be perfomed : {e}")
           raise
    
       
        
        
        
        
    
    
    

