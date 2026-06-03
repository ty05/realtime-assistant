from fastapi import APIRouter, UploadFile, File, HTTPException
from config import supabase
from services.pdf_service import extract_text_from_pdf, split_into_chunks
from services.embedding_service import get_embedding
from services.blob_service import upload_to_blob
import traceback

router = APIRouter()

@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDFファイルのみ対応しています")
    
    try:
        # Supabase接続テスト
        test = supabase.table("documents").select("id").limit(1).execute()
        print(f"Supabase接続OK: {test}")
        
        file_bytes = await file.read()
        blob_url = upload_to_blob(file_bytes, file.filename)
        text = extract_text_from_pdf(file_bytes)
        chunks = split_into_chunks(text)
        print(f"チャンク数: {len(chunks)}")
        
        for i, chunk in enumerate(chunks):
            embedding = await get_embedding(chunk)
            print(f"チャンク{i} embedding長: {len(embedding)}")
            
            result = supabase.table("documents").insert({
                "filename": file.filename,
                "blob_url": blob_url,
                "chunk_index": i,
                "content": chunk,
                "embedding": embedding
            }).execute()
            print(f"insert結果: {result}")
            
        return {
            "message": "アップロード完了",
            "filename": file.filename,
            "chunks": len(chunks),
            "blob_url": blob_url
        }
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))