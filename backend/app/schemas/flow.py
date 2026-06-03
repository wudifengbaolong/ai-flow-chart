from pydantic import BaseModel
from typing import Optional


class FlowCreateRequest(BaseModel):
    title: str
    graph_json: dict
    puml_source: Optional[str] = None
    source_code: Optional[str] = None
    source_language: Optional[str] = None


class FlowUpdateRequest(BaseModel):
    title: Optional[str] = None
    graph_json: Optional[dict] = None
    puml_source: Optional[str] = None


class FlowResponse(BaseModel):
    id: str
    title: str
    graph_json: dict
    puml_source: Optional[str]
    source_code: Optional[str]
    source_language: Optional[str]
    created_at: str
    updated_at: str


class FlowListItem(BaseModel):
    id: str
    title: str
    source_language: Optional[str]
    created_at: str
    updated_at: str


class FlowListResponse(BaseModel):
    items: list[FlowListItem]
    total: int
    page: int
    size: int
