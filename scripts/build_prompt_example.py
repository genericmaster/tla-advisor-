from ollama import Client
from chromadb import PersistentClient as database

#creating database and embedding clients
query ="the vpn is not working and is not installed from microsoft store"+'\n'+'? :'
client = Client(host='http://localhost:11434')
embedder = Client.embed(client,
    model= 'nomic-embed-text',
    input = query
)
vector_db_client = database(path='data/chroma_generate')
doc1='''1. Trouble connecting to the VPN. 
As we know Wits uses the Cisco AnyConnect VPN, and staff members rely on it 
as most of the internal sites will not connect or work unless you’re using the 
Wits Wi-Fi or you’re connected on Wits ethernet.  
Steps to Fix: '''
doc2='''Check the installed version. Cisco AnyConnect is also available on the 
Microsoft Store, but that version commonly causes problems. 
o If it was installed from the Microsoft Store→ uninstall it '''

doc3='''complete then download the official version from the Wits IT 
access page: https://www.loser.ac.za/access/. The download 
includes a setup document with full instructions. 
 '''
doc4='''If it was not from the Store test the user’s credentials and 
confirm that Multi-Factor Authentication (MFA) is enabled on their 
Microsoft account, as the VPN will not work without it.'''
doc5= '''If 
necessary, repair or reinstall the existing installation. '''
doc6='''Follow the setup instructions. Make sure all configuration steps from the 
Wits IT document are completed correctly. '''
doc7='''Test the connection. To confirm it’s working, connect to the VPN using a 
different Wi-Fi network (e.g., a mobile hotspot), since it won’t work if 
you’re already on Wits Wi-Fi. "'''

vb_client=vector_db_client.get_or_create_collection(name="prompt_testing_collection")
context_embedding = Client.embed(client,
    model='nomic-embed-text',
    input=[doc1,doc2,doc3,doc4,doc5,doc6,doc7]
)
doc_embeddings= context_embedding.embeddings
embedder = embedder.embeddings

vb_client.add(
    ids=["id1","id2","id3","id4","id5","id6","id7"],
    embeddings=doc_embeddings,
    documents=[doc1,doc2,doc3,doc4,doc5,doc6,doc7]
)
#query 
query_response=vb_client.query(
    query_embeddings=embedder,
    n_results=3
)


#response works now how do we stich this 2 concepts togwether
#well we need origina query and then the returned chnuks  concatinated and seprated befpre we pass to llm

print(query_response)
chunks=query_response['documents']
#we can acces the chunks via indexing


flattened = [item for sublist in chunks for item in sublist] 
relevant_chunks = "\t".join(flattened)


prompt = query + "\n"+ relevant_chunks


#use same client for response
model_response =client.chat(
    model='qwen3.5:9b',
    format= '',
    messages = [
                        {
                            "role": "system",
                            "content":"You are a helpful assistant. Answer the user's question using only the context provided. If the context doesn't contain the answer, say so."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                   ],
    
    think=False
    )


print(model_response.message.content)

