import os
import io
from typing import Optional
from PyPDF2 import PdfReader
from docx import Document
import tempfile

async def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """
    Extract text from uploaded files (PDF, DOCX, TXT)
    
    Args:
        file_content: Binary content of the uploaded file
        filename: Name of the uploaded file
    
    Returns:
        Extracted text content
    """
    file_extension = os.path.splitext(filename.lower())[1]
    
    try:
        if file_extension == '.pdf':
            return extract_text_from_pdf(file_content)
        elif file_extension in ['.docx', '.doc']:
            return extract_text_from_docx(file_content)
        elif file_extension == '.txt':
            return file_content.decode('utf-8')
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
    except Exception as e:
        raise ValueError(f"Error processing {filename}: {str(e)}")

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        # Create a BytesIO object from the file content
        pdf_file = io.BytesIO(file_content)
        
        # Create PDF reader
        pdf_reader = PdfReader(pdf_file)
        
        # Extract text from all pages
        text_content = []
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text_content.append(page.extract_text())
        
        # Join all pages with double newlines
        extracted_text = '\n\n'.join(text_content)
        
        # Clean up text (remove extra whitespace, normalize line breaks)
        extracted_text = ' '.join(extracted_text.split())
        
        if not extracted_text.strip():
            raise ValueError("No text content found in PDF file")
            
        return extracted_text
        
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        # Create a temporary file to work with python-docx
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_file.write(file_content)
            temp_file.flush()
            
            # Open document
            doc = Document(temp_file.name)
            
            # Extract text from all paragraphs
            text_content = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_content.append(paragraph.text.strip())
            
            # Join paragraphs with single newlines
            extracted_text = '\n'.join(text_content)
            
            # Clean up text
            extracted_text = ' '.join(extracted_text.split())
            
            if not extracted_text.strip():
                raise ValueError("No text content found in DOCX file")
                
            return extracted_text
            
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")

def validate_file_size(file_size: int, max_size_mb: int = 10) -> None:
    """
    Validate file size
    
    Args:
        file_size: Size of file in bytes
        max_size_mb: Maximum allowed size in MB
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    if file_size > max_size_bytes:
        raise ValueError(f"File size ({file_size / 1024 / 1024:.1f}MB) exceeds maximum allowed size ({max_size_mb}MB)")

def validate_file_type(filename: str) -> None:
    """
    Validate file type
    
    Args:
        filename: Name of the uploaded file
    """
    allowed_extensions = {'.pdf', '.docx', '.doc', '.txt'}
    file_extension = os.path.splitext(filename.lower())[1]
    
    if file_extension not in allowed_extensions:
        raise ValueError(f"File type '{file_extension}' not supported. Allowed types: {', '.join(allowed_extensions)}")