from pypdf import PdfReader
from abc import ABC,abstractmethod


class DocumentLoader(ABC):
    @abstractmethod
    def load(self,source:str)->str:
        pass
    
class PDFLoader(DocumentLoader):
    def load(self,source:str)->str:
        document = PdfReader(source)
        text = ""
        for page in document.pages:
            page_extract=page.extract_text(extraction_mode="layout")
            text+= page_extract +"\n"
            
        return text
        

class TxtLoader(DocumentLoader):
    def load(self,source:str)->str:
        with open(source, encoding="utf-8") as f:
         return f.read()
      
class StringLoader(DocumentLoader):
    def load(self,source:str)->str:
        
        return source




