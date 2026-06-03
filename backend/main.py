from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを後でここに追加していく
from routers import documents, audio
app.include_router(documents.router, prefix="/api")
app.include_router(audio.router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "ok"}