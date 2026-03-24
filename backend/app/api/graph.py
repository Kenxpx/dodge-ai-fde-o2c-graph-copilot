from fastapi import APIRouter, HTTPException, Query

from app.models import GraphExpandRequest, GraphPayload, NodeDetail, SearchResult, SubgraphRequest
from app.services.graph_service import GraphService


router = APIRouter(prefix="/api/graph", tags=["graph"])
service = GraphService()


@router.get("/initial", response_model=GraphPayload)
def initial_graph() -> GraphPayload:
    return service.initial_graph()


@router.get("/search", response_model=list[SearchResult])
def search_graph(q: str = Query(..., min_length=2), limit: int = Query(default=10, ge=1, le=25)) -> list[SearchResult]:
    return service.search(q, limit=limit)


@router.get("/node/{node_id:path}", response_model=NodeDetail)
def node_detail(node_id: str) -> NodeDetail:
    try:
        return service.node_detail(node_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Node not found") from exc


@router.post("/expand", response_model=GraphPayload)
def expand_graph(request: GraphExpandRequest) -> GraphPayload:
    return service.subgraph(node_ids=[request.node_id], depth=request.depth, limit=request.limit)


@router.post("/subgraph", response_model=GraphPayload)
def custom_subgraph(request: SubgraphRequest) -> GraphPayload:
    return service.subgraph(node_ids=request.node_ids, depth=request.depth, limit=request.limit)
