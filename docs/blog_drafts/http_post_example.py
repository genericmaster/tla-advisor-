import requests

response = requests.post(
    "http://localhost:8000/chat",
    json={"query": "the printer isn't working"},
    stream=True
)

for chunk in response.iter_content(chunk_size=None):
    print(chunk.decode("utf-8"), end="", flush=True)