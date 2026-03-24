export type GraphElement = {
  data: Record<string, unknown>
  classes?: string
}

export type GraphPayload = {
  nodes: GraphElement[]
  edges: GraphElement[]
  focus_node_ids: string[]
}

export type SearchResult = {
  node_id: string
  node_type: string
  label: string
  subtitle?: string | null
  score: number
}

export type NeighborSummary = {
  edge_type: string
  direction: 'incoming' | 'outgoing'
  count: number
}

export type NodeDetail = {
  node_id: string
  node_type: string
  label: string
  subtitle?: string | null
  metadata: Record<string, unknown>
  neighbors: NeighborSummary[]
}

export type EvidenceTable = {
  sql: string
  columns: string[]
  rows: Array<Array<unknown>>
  row_count: number
}

export type InboxItem = {
  id: string
  title: string
  summary: string
  severity: 'high' | 'medium' | 'low'
  count: number
  sample_ids: string[]
  focus_node_ids: string[]
  drill_question: string
}

export type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatResponse = {
  answer: string
  answer_title?: string | null
  highlights: string[]
  recommended_actions: string[]
  follow_up_questions: string[]
  strategy: string
  warnings: string[]
  citations: string[]
  sql?: string | null
  evidence?: EvidenceTable | null
  graph: GraphPayload
}

export type HelpChatResponse = {
  answer: string
  answer_title?: string | null
  highlights: string[]
  suggested_questions: string[]
  citations: string[]
}

export type MetaResponse = {
  title: string
  llm_status: {
    provider: string
    ready: boolean
    model: string
  }
  dataset_stats: {
    totals: Record<string, number>
    node_types: Record<string, number>
  }
  example_queries: string[]
  ops_inbox: InboxItem[]
}

export type Message = {
  role: 'user' | 'assistant'
  content: string
  answer_title?: string | null
  highlights?: string[]
  recommended_actions?: string[]
  follow_up_questions?: string[]
  graph_focus_count?: number
  strategy?: string
  warnings?: string[]
  citations?: string[]
  sql?: string | null
  evidence?: EvidenceTable | null
}

export type HelpMessage = {
  role: 'user' | 'assistant'
  content: string
  answer_title?: string | null
  highlights?: string[]
  suggested_questions?: string[]
  citations?: string[]
}
