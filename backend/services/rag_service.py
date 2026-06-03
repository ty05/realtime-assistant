from config import supabase
from services.embedding_service import get_embedding

async def search_documents(query: str) -> list[dict]:
    """Supabaseでベクトル検索して関連チャンクを返す"""
    embedding = await get_embedding(query)
    
    result = supabase.rpc("match_documents", {
        "query_embedding": embedding,
        "match_threshold": 0.7,
        "match_count": 3
    }).execute()
    
    return result.data or []