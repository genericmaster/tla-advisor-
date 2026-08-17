import logging
from ollama import Client
from abc import ABC,abstractmethod
from typing import Iterator
import time

logger = logging.getLogger(__name__)

class Generator(ABC):
    @abstractmethod
    def generate(self,prompt:str,history:list[dict])->Iterator[str]:
        pass


class OllamaGenerator(Generator):
    def __init__(self, model_name:str, client:Client, system_prompt:str, vision_prompt:str=None, vision_model_name:str=None):
        self.client = client
        self.model_name = model_name
        self.system_prompt = system_prompt
        self.vision_system_prompt = vision_prompt
        self.vision_model_name = vision_model_name

    def generate(self, prompt:str,history:list[dict])->Iterator[str]:
        try:
            response =self.client.chat(
                model=self.model_name,
                stream=True,
                think=False,
                messages = (
                        [{"role": "system", "content": self.system_prompt}]
                        + history[-6:]
                        + [{"role": "user", "content": prompt}]
                        )
                )
         
            for chunk in response:
                content = chunk.message.content
                yield content
                time.sleep(0.05)
            logger.info("responses generated successfuly")
        except Exception as e:
            logger.error(f"response cut off : {e}")
            raise
    def vision_generation(self,prompt:str,image:str,history:list[dict])->str:
        messages = [{'role': 'system', 'content': self.vision_system_prompt}]
        messages.extend(history[-6:])
        messages.append({"role": "user","content": prompt,"images": [image]})
        try:
            response = self.client.chat(
                keep_alive=0,
                model= self.vision_model_name,
                messages=(messages
                ))
            logger.info("vision query generated successfully")
            print( response.message.content ) 
            return response.message.content              
        except   Exception as e:
                logger.error(f"vision query not generated: {e}")
                raise
    
        
            
      

    