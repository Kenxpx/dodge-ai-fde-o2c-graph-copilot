from typing import Any, Literal

from pydantic import BaseModel, Field


class GraphElement(BaseModel):
    data: dict[str, Any]
    classes: str | None = None


class GraphPayload(BaseModel):
    nodes: list[GraphElement]
    edges: list[GraphElement]
    focus_node_ids: list[str] = Field(default_factory=list)


class SearchResult(BaseModel):
    node_id: str
    node_type: str
    label: str
    subtitle: str | None = None
    score: float


class NeighborSummary(BaseModel):
    edge_type: str
    direction: Literal["incoming", "outgoing"]
    count: int


class NodeDetail(BaseModel):
    node_id: str
    node_type: str
    label: str
    subtitle: str | None = None
    metadata: dict[str, Any]
    neighbors: list[NeighborSummary]


class GraphExpandRequest(BaseModel):
    node_id: str
    depth: int = 1
    limit: int = 120


class SubgraphRequest(BaseModel):
    node_ids: list[str]
    depth: int = 1
    limit: int = 140


class EvidenceTable(BaseModel):
    sql: str
    columns: list[str]
    rows: list[list[Any]]
    row_count: int


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str
    conversation: list[ChatTurn] = Field(default_factory=list)
    focus_node_ids: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    strategy: str
    warnings: list[str] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    sql: str | None = None
    evidence: EvidenceTable | None = None
    graph: GraphPayload


class MetaResponse(BaseModel):
    title: str
    llm_status: dict[str, Any]
    dataset_stats: dict[str, Any]
    example_queries: list[str]
