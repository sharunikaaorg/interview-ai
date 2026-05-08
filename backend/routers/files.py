from fastapi import APIRouter, UploadFile, File, HTTPException
from services.file_service import extract_text_from_file, validate_file_size, validate_file_type
from pydantic import BaseModel

router = APIRouter()

class FileProcessResponse(BaseModel):
    text: str
    filename: str
    file_type: str
    char_count: int

@router.post("/process-file", response_model=FileProcessResponse)
async def process_uploaded_file(file: UploadFile = File(...)):
    """
    Process uploaded file (PDF, DOCX, TXT) and extract text content
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (10MB limit)
        validate_file_size(len(file_content), max_size_mb=10)
        
        # Validate file type
        validate_file_type(file.filename)
        
        # Extract text
        extracted_text = await extract_text_from_file(file_content, file.filename)
        
        # Get file extension
        file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'unknown'
        
        return FileProcessResponse(
            text=extracted_text,
            filename=file.filename,
            file_type=file_extension,
            char_count=len(extracted_text)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "supported_formats": [
            {
                "extension": ".pdf",
                "description": "Portable Document Format",
                "mime_types": ["application/pdf"]
            },
            {
                "extension": ".docx",
                "description": "Microsoft Word Document",
                "mime_types": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
            },
            {
                "extension": ".doc", 
                "description": "Microsoft Word Document (Legacy)",
                "mime_types": ["application/msword"]
            },
            {
                "extension": ".txt",
                "description": "Plain Text File",
                "mime_types": ["text/plain"]
            }
        ],
        "max_file_size_mb": 10
    }