from fastapi import APIRouter

from app.models import APIEndpoint, APIIndexResponse


router = APIRouter(prefix="/api", tags=["api"])


@router.get("", response_model=APIIndexResponse, summary="API index")
def api_index() -> APIIndexResponse:
    return APIIndexResponse(
        title="O2C Workspace API",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        endpoints=[
            APIEndpoint(method="GET", path="/api", summary="Discover the API surface and documentation URLs."),
            APIEndpoint(method="GET", path="/api/health", summary="Check whether the service is up."),
            APIEndpoint(method="GET", path="/api/meta", summary="Fetch dataset stats, model status, example queries, and the ops inbox."),
            APIEndpoint(method="POST", path="/api/query/chat", summary="Ask grounded ERP questions over the O2C dataset."),
            APIEndpoint(method="POST", path="/api/help/chat", summary="Ask project-level questions about architecture, setup, deployment, and authorship."),
            APIEndpoint(method="GET", path="/api/graph/initial", summary="Load the initial graph view."),
            APIEndpoint(method="GET", path="/api/graph/search", summary="Search entities by id, label, or description."),
            APIEndpoint(method="GET", path="/api/graph/node/{node_id}", summary="Inspect a single node and its relationship summary."),
            APIEndpoint(method="POST", path="/api/graph/expand", summary="Expand the graph around a single node."),
            APIEndpoint(method="POST", path="/api/graph/subgraph", summary="Fetch a focused subgraph around one or more nodes."),
        ],
    )
