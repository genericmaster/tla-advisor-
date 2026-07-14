import logging# we have it on top cause other import may intefere with it
import dotenv
import os
from ollama import Client
from tla_advisor.retrieval.embedder import OllamaEmbedder
from chromadb import PersistentClient
from tla_advisor.retrieval.vector_store import ChromaVectorStore
from tla_advisor.generator.generation import OllamaGenerator
from config import EMBEDDER_NAME,GENERATOR_NAME,ASSISTANT,COLLECTION_NAME,DATA_PATH
from tla_advisor.pipeline import RAGPipeline

logging.basicConfig(level="INFO",format="%(asctime)s %(levelname)s %(name)s — %(message)s" ,handlers=[logging.FileHandler("logs/start_up.log")],force=True)
logger = logging.getLogger(__name__)
logging.getLogger("watchfiles").setLevel(logging.WARNING)

dotenv.load_dotenv()
logger.info("env loaded successfully")

ollama_api= os.environ.get("OLLAMA_HOST")

ollama_client_instance= Client(host=ollama_api)
logger.info("ollama client created")

embedding_model = OllamaEmbedder(embedder_name=EMBEDDER_NAME, client=ollama_client_instance)
logger.info("embedding called successfully")

vector_store_client = PersistentClient(path=DATA_PATH)
logger.info("chroma client created")

vector_store=ChromaVectorStore(collection_name=COLLECTION_NAME,client=vector_store_client)
logger.info("vector database called successflly ")

generator = OllamaGenerator(model_name=GENERATOR_NAME,system_prompt=ASSISTANT,client=ollama_client_instance)
logger.info("text generation called successfully")

pipeline = RAGPipeline(
    embedder=embedding_model,
    vector_store=vector_store,
    generator=generator,
)
logger.info("pipeline called successfully")
