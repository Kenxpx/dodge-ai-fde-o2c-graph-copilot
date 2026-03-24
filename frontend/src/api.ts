import type {
  ChatResponse,
  ChatTurn,
  GraphPayload,
  MetaResponse,
  NodeDetail,
  SearchResult,
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export const api = {
  getMeta: () => request<MetaResponse>('/api/meta'),
  getInitialGraph: () => request<GraphPayload>('/api/graph/initial'),
  searchGraph: (query: string) =>
    request<SearchResult[]>(`/api/graph/search?q=${encodeURIComponent(query)}`),
  getNodeDetail: (nodeId: string) =>
    request<NodeDetail>(`/api/graph/node/${encodeURIComponent(nodeId)}`),
  expandGraph: (nodeId: string, depth = 1, limit = 120) =>
    request<GraphPayload>('/api/graph/expand', {
      method: 'POST',
      body: JSON.stringify({ node_id: nodeId, depth, limit }),
    }),
  getSubgraph: (nodeIds: string[], depth = 1, limit = 120) =>
    request<GraphPayload>('/api/graph/subgraph', {
      method: 'POST',
      body: JSON.stringify({ node_ids: nodeIds, depth, limit }),
    }),
  askQuestion: (question: string, conversation: ChatTurn[], focusNodeIds: string[]) =>
    request<ChatResponse>('/api/query/chat', {
      method: 'POST',
      body: JSON.stringify({
        question,
        conversation,
        focus_node_ids: focusNodeIds,
      }),
    }),
}
