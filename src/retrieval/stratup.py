import dotenv
from retrieval.config import EMBEDDER_NAME
import os
from ollama import Client
from retrieval.embedder import OllamaEmbedder
from chromadb import PersistentClient
from retrieval.vector_store import ChromaVectorStore
dotenv.load_dotenv()

embedder_host_name = os.environ.get("OLLAMA_HOST")

provider= Client(host=embedder_host_name)

embedding_model = OllamaEmbedder(EMBEDDER_NAME,provider)

client = PersistentClient(path='data\persistent_data')

vector_store=ChromaVectorStore('first_collection',client)


