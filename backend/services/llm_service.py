from config import openai_client
import json


async def route_utterance(text: str) -> dict:
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""以下の発言を分類してください。JSONのみ返答してください。

発言: {text}

{{
  "needs_rag": true or false,
  "needs_llm": true or false,
  "skip": true or false,
  "search_query": "検索用クエリ（needs_ragがtrueの場合）or null"
}}

分類ルール:
- skip: 相槌・短い返答・聞き取れない音・音楽・効果音・質問を含まない単純な相槌
- needs_rag: 製品・価格・仕様・手順・サービスに関する具体的な質問
- needs_llm: 質問文を含む発言（面接の質問・顧客の質問・技術的な質問など）

重要: 相手が質問しているかどうかを最優先で判断する"""
        }],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)



async def generate_answer(utterance: str, rag_chunks: list[dict] = None, role: str = "cs") -> str:
    
    role_context = {
        "sales": "あなたは営業担当者です。顧客からの質問に対して、あなたが答えるべき回答内容を提示してください。",
        "cs": "あなたはCSサポート担当者です。顧客からの質問に対して、あなたが答えるべき回答内容を提示してください。",
        "tam": "あなたはTechnical Account Managerです。顧客からの技術的な質問に対して、あなたが答えるべき回答内容を提示してください。",
        "interview": "あなたは就職面接の候補者です。面接官からの質問に対して、あなたが答えるべき回答内容を提示してください。"
    }.get(role, "")

    if rag_chunks:
        context = "\n\n".join([c["content"] for c in rag_chunks])
        system_prompt = f"""{role_context}

【重要ルール】
- 相手の質問に対して「自分がこう答えればいい」という回答内容を日本語で簡潔に書く
- 「〇〇と答えましょう」という指示形式は禁止
- 「〇〇です」「〇〇しました」という一人称の回答文として書く
- 長い箇条書きは避け、2〜3文以内にまとめる
- 以下のドキュメントに関連情報があれば活用する

【参考ドキュメント】
{context}"""
    else:
        system_prompt = f"""{role_context}

【重要ルール】
- 相手の質問に対して「自分がこう答えればいい」という回答内容を日本語で簡潔に書く
- 「〇〇と答えましょう」という指示形式は禁止
- 「〇〇です」「〇〇しました」という一人称の回答文として書く
- 長い箇条書きは避け、2〜3文以内にまとめる
- 質問でない発言（説明・雑談）の場合は何も返さず空文字を返す"""

    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"相手の発言: {utterance}"}
        ],
        stream=True
    )

    full_text = ""
    async for chunk in response:
        delta = chunk.choices[0].delta.content
        if delta:
            full_text += delta
    return full_text