import { startTransition, useDeferredValue, useEffect, useState } from 'react'

import { api } from './api'
import './App.css'
import { ChatPanel } from './components/ChatPanel'
import { GraphCanvas } from './components/GraphCanvas'
import { InspectorPanel } from './components/InspectorPanel'
import type { GraphPayload, Message, MetaResponse, NodeDetail, SearchResult } from './types'

function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null)
  const [graph, setGraph] = useState<GraphPayload>({
    nodes: [],
    edges: [],
    focus_node_ids: [],
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [draft, setDraft] = useState('')
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [nextMeta, nextGraph] = await Promise.all([
          api.getMeta(),
          api.getInitialGraph(),
        ])
        setMeta(nextMeta)
        startTransition(() => setGraph(nextGraph))
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Failed to load the app.')
      } finally {
        setIsBootstrapping(false)
      }
    }

    bootstrap().catch(() => {})
  }, [])

  useEffect(() => {
    if (deferredSearch.trim().length < 2) {
      setSearchResults([])
      return
    }

    const runSearch = async () => {
      try {
        const results = await api.searchGraph(deferredSearch.trim())
        setSearchResults(results)
      } catch {
        setSearchResults([])
      }
    }

    runSearch().catch(() => {})
  }, [deferredSearch])

  const loadNode = async (nodeId: string) => {
    const detail = await api.getNodeDetail(nodeId)
    setSelectedNodeId(nodeId)
    setSelectedNode(detail)
  }

  const handlePickResult = async (nodeId: string) => {
    try {
      const nextGraph = await api.getSubgraph([nodeId], 1, 110)
      startTransition(() => setGraph(nextGraph))
      await loadNode(nodeId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load search result.')
    }
  }

  const handleExpandSelected = async () => {
    if (!selectedNodeId) {
      return
    }
    try {
      const nextGraph = await api.expandGraph(selectedNodeId, 1, 140)
      startTransition(() => setGraph(nextGraph))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to expand graph.')
    }
  }

  const handleSubmit = async () => {
    const question = draft.trim()
    if (!question) {
      return
    }

    const nextMessages: Message[] = [...messages, { role: 'user', content: question }]
    setMessages(nextMessages)
    setDraft('')
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await api.askQuestion(
        question,
        nextMessages.map((message) => ({ role: message.role, content: message.content })),
        selectedNodeId ? [selectedNodeId] : [],
      )

      startTransition(() => setGraph(response.graph))
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        strategy: response.strategy,
        warnings: response.warnings,
        citations: response.citations,
        sql: response.sql,
        evidence: response.evidence ?? null,
      }
      setMessages((current) => [...current, assistantMessage])

      const focusNode = response.graph.focus_node_ids[0]
      if (focusNode) {
        await loadNode(focusNode)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to run query.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stats = meta?.dataset_stats.totals

  return (
    <div className="app-shell">
      <header className="hero-bar">
        <div>
          <p className="eyebrow">Dodge AI Take-Home</p>
          <h1>{meta?.title ?? 'Loading graph copilot...'}</h1>
          <p className="hero-copy">
            A grounded ERP copilot over the SAP order-to-cash dataset with graph exploration, SQL-backed answers,
            cancellation awareness, and flow tracing across orders, deliveries, billing, A/R, and payment clearance.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span>Orders</span>
            <strong>{stats?.sales_orders ?? '...'}</strong>
          </div>
          <div className="stat-card">
            <span>Deliveries</span>
            <strong>{stats?.deliveries ?? '...'}</strong>
          </div>
          <div className="stat-card">
            <span>Billing Docs</span>
            <strong>{stats?.billing_documents ?? '...'}</strong>
          </div>
          <div className="stat-card">
            <span>Graph Nodes</span>
            <strong>{stats?.graph_nodes ?? '...'}</strong>
          </div>
        </div>
      </header>

      <div className="status-row">
        <span className={`status-pill ${meta?.llm_status.ready ? 'ready' : 'idle'}`}>
          LLM: {meta?.llm_status.provider ?? '...'} {meta?.llm_status.ready ? 'configured' : 'not configured'}
        </span>
        <span className="status-pill neutral">Model: {meta?.llm_status.model ?? '...'}</span>
        <span className="status-pill neutral">Grounding: DuckDB + semantic O2C view</span>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <main className="workspace">
        <ChatPanel
          messages={messages}
          exampleQueries={meta?.example_queries ?? []}
          draft={draft}
          isSubmitting={isSubmitting}
          onDraftChange={setDraft}
          onSubmit={() => void handleSubmit()}
          onExampleClick={(query) => setDraft(query)}
        />

        <section className="panel panel-graph">
          {isBootstrapping ? (
            <div className="loading-state">Building dataset views and graph...</div>
          ) : (
            <GraphCanvas
              graph={graph}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => {
                void loadNode(nodeId)
              }}
            />
          )}
        </section>

        <InspectorPanel
          selectedNode={selectedNode}
          selectedNodeId={selectedNodeId}
          search={search}
          searchResults={searchResults}
          onSearchChange={setSearch}
          onPickResult={(nodeId) => {
            void handlePickResult(nodeId)
          }}
          onExpandSelected={() => {
            void handleExpandSelected()
          }}
        />
      </main>
    </div>
  )
}

export default App
