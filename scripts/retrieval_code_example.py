import ollama
import chromadb

batch = ollama.embed(
    model="nomic-embed-text",
    input=["does it take files or strings?","i really like strings more than files"]
)

embedding = batch.embeddings
client =chromadb.PersistentClient(path='data/chroma_test')
collection =client.get_or_create_collection(name="work_documents") #refers to vector database

collection.add(
    ids=["id1","id2"],
    embeddings=embedding,
    documents=["does it take files or strings?", "i really like strings more than files"] 
)
query = ollama.embed(
    model="nomic-embed-text",
    input = ["find a question on whether the collection takes in a document or text"] 
      
)

query_embed = query.embeddings
results=collection.query(query_embeddings=query_embed,
                 n_results=2 
                
)

