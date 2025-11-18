from pydantic_settings import BaseSettings, SettingsConfigDict
from openai import OpenAI
import voyageai


class LLMSettings(BaseSettings):
    deepseek_api_key: str
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    voyage_api_key: str
    voyage_model: str = "voyage-3.5"
    voyage_input_type: str = "document"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


auth = LLMSettings()
client = OpenAI(api_key=auth.deepseek_api_key, base_url=auth.deepseek_base_url)
voyage_client = voyageai.Client(api_key=auth.voyage_api_key)


def get_embedding(text: str) -> list[float]:
    """Generate embedding vector using Voyage embeddings API."""
    response = voyage_client.embed([text], model=auth.voyage_model, input_type=auth.voyage_input_type)
    return response.embeddings[0]
