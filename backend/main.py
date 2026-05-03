from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import jd_candidates, files
from db import init_db
import os

@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield

app = FastAPI(title="AI Interview Agent", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jd_candidates.router, prefix="/api", tags=["JDs & Candidates"])
app.include_router(files.router, prefix="/api", tags=["Files"])

@app.get("/")
async def root():
    return {"message": "AI Interview Agent API", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "groq_configured": bool(os.getenv("GROQ_API_KEY"))}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
