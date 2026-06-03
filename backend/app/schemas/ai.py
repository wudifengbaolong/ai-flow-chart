from pydantic import BaseModel


class AIConvertRequest(BaseModel):
    code: str
    language: str = "python"
    provider: str = "deepseek"
    api_key: str


class AIConvertResponse(BaseModel):
    puml: str
    graph: dict
    errors: list[str]
