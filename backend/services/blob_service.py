from azure.storage.blob import BlobServiceClient
from config import AZURE_BLOB_CONNECTION_STRING, AZURE_BLOB_CONTAINER_NAME
import uuid

def upload_to_blob(file_bytes: bytes, filename: str) -> str:
    """Azure BlobにPDFをアップロードしてURLを返す"""
    blob_service = BlobServiceClient.from_connection_string(AZURE_BLOB_CONNECTION_STRING)
    container = blob_service.get_container_client(AZURE_BLOB_CONTAINER_NAME)
    
    # コンテナがなければ作成
    try:
        container.create_container()
    except Exception:
        pass
    
    blob_name = f"{uuid.uuid4()}_{filename}"
    blob_client = container.get_blob_client(blob_name)
    blob_client.upload_blob(file_bytes, overwrite=True)
    
    return blob_client.url