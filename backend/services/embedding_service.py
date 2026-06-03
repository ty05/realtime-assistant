from config import openai_client

async def get_embedding(text: str) -> list[float]:
    response = await openai_client.embeddings.create(
        model="text-embedding-ada-002",
        input=text
    )
    return response.data[0].embedding