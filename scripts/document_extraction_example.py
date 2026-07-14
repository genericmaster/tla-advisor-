from pypdf import PdfReader

#extracts a text from pages on your pdf 
document = PdfReader(stream =r"C:\Users\'your username\TLA STAFF SUPPORT HANDBOOK.pdf")
page = document.pages[5]
print(page.extract_text())

