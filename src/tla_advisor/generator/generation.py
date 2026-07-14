import logging
from ollama import Client
from abc import ABC,abstractmethod
from typing import Iterator
import time

logger = logging.getLogger(__name__)

class Generator(ABC):
    @abstractmethod
    def generate(self,prompt:str)->Iterator[str]:
        pass


class OllamaGenerator(Generator):
    def __init__(self,model_name:str,client:Client,system_prompt:str):
        self.client = client
        self.model_name = model_name
        self.system_prompt = system_prompt

    def generate(self, prompt:str)->Iterator[str]:
        try:
            response =self.client.chat(
                model=self.model_name,
                stream=True,
                think=False,
                messages = [
                            {
                                "role": "system",
                                "content": self.system_prompt
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ])
         
            for chunk in response:
                content = chunk.message.content
                yield content
                time.sleep(0.05)
            logger.info("responses generated successfuly")
        except Exception as e:
            logger.error(f"response cut off : {e}")
            raise
    
        
            
      

    