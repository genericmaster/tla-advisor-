from pathlib import Path

from tla_advisor.document_preprocessing.loader import(
     DocumentLoader,
    PDFLoader,
    TxtLoader,
)


def get_loader(source:str)->DocumentLoader:
     extension = Path(source).suffix.lower()
     
     if extension == '.pdf':
         return PDFLoader()
     
     elif extension == ".txt":
         return TxtLoader()
     else:
        raise ValueError(f"No loader for extension: {extension}")