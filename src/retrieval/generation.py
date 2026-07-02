from ollama import Client
from abc import ABC,abstractmethod


class Generator(ABC):
    @abstractmethod
    def generate(self,prompt:str)->str:
        pass


class OllamaGenerator(Generator):
    def __init__(self,model_name:str,client:Client):
        self.client = client
        self.model_name = model_name
    
    def generate(self, prompt:str)->str:
        response =self.client.chat(
            model=self.model_name,
            format= '',
            messages = [
                        {
                            "role": "system",
                            "content": "You are a helpful assistant. Answer the user's question using only the context provided. If the context doesn't contain the answer, say so."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ])
        return response.message.content
        
        
   
    