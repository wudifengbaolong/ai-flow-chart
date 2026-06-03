from pydantic import BaseModel


class ParseRequest(BaseModel):
    puml: str


class ParseResponse(BaseModel):
    graph: dict
    errors: list[str]
