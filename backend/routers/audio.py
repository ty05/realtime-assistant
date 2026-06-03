from fastapi import APIRouter, UploadFile, File, HTTPException
from config import supabase
from services.stt_service import transcribe_audio
from services.llm_service import generate_answer
from services.rag_service import search_documents
import uuid

router = APIRouter()

SKIP_PHRASES = ["(", "【", "♪", "拍手", "笑い", "沈黙"]

def is_skippable(text: str) -> bool:
    """短すぎる・効果音・聞き取れない音声をスキップ"""
    if len(text.strip()) < 8:
        return True
    for phrase in SKIP_PHRASES:
        if phrase in text:
            return True
    return False

@router.post("/process-audio")
async def process_audio(
    file: UploadFile = File(...),
    session_id: str = None,
    role: str = "interview"
):
    if not session_id:
        session_id = str(uuid.uuid4())

    try:
        # 1. STT
        audio_bytes = await file.read()
        text = await transcribe_audio(audio_bytes)

        if not text.strip():
            return {"session_id": session_id, "text": "", "skip": True}

        # 2. 短い・効果音はスキップ
        if is_skippable(text):
            return {"session_id": session_id, "text": text, "skip": True}

        # 3. RAG検索（常に試みる）
        rag_chunks = await search_documents(text)
        rag_sources = [c["filename"] for c in rag_chunks]
        needs_rag = len(rag_chunks) > 0

        # 4. 回答生成（常に実行）
        ai_response = await generate_answer(text, rag_chunks if rag_chunks else None, role)

        # 5. 回答が空ならスキップ
        if not ai_response or ai_response.strip() == "":
            return {"session_id": session_id, "text": text, "skip": True}

        # 6. 会話ログ保存
        supabase.table("conversations").insert({
            "session_id": session_id,
            "speaker": "customer",
            "text": text,
            "needs_rag": needs_rag,
            "needs_llm": True,
            "ai_response": ai_response
        }).execute()

        return {
            "session_id": session_id,
            "text": text,
            "needs_rag": needs_rag,
            "needs_llm": True,
            "ai_response": ai_response,
            "rag_sources": rag_sources,
            "skip": False
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))