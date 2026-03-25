import { startTransition, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'

import { api } from './api'
import './App.css'
import { ChatPanel } from './components/ChatPanel'
import { GraphCanvas } from './components/GraphCanvas'
import { InspectorPanel } from './components/InspectorPanel'
import type { GraphPayload, HelpMessage, InboxItem, Message, MetaResponse, NodeDetail, SearchResult } from './types'

const INITIAL_HELP_MESSAGE: HelpMessage = {
  role: 'assistant',
  answer_title: 'Project guide',
  content:
    'Ask how the system is built, why the stack was chosen, how the graph and SQL layers stay aligned, how Gemini is grounded, who built the project, or how to run and deploy it.',
  highlights: [
    'Covers architecture, data modeling, guardrails, deployment, and submission details.',
    'Stays focused on the project itself instead of the ERP dataset questions.',
    'Uses grounded project notes so reviewers can quickly understand the implementation.',
  ],
  suggested_questions: [
    'How is this project structured end to end?',
    'Why did you choose DuckDB and FastAPI?',
    'Who built this project and what was the goal?',
  ],
  citations: ['README.md', 'docs/ARCHITECTURE.md'],
}

const DEMO_SCENARIOS: Record<string, { kind: 'erp' | 'help'; question: string }> = {
  trace: {
    kind: 'erp',
    question: 'Trace the full flow of billing document 90504298.',
  },
  open_ar: {
    kind: 'erp',
    question: 'Show me open accounting documents that have not been cleared by a payment.',
  },
  cancellations: {
    kind: 'erp',
    question: 'Which billing documents are cancelled and what are their cancellation documents?',
  },
  guide: {
    kind: 'help',
    question: 'How is this project structured end to end?',
  },
}

function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null)
  const emptyGraph: GraphPayload = {
    nodes: [],
    edges: [],
    focus_node_ids: [],
  }
  const [graph, setGraph] = useState<GraphPayload>(emptyGraph)
  const [initialGraph, setInitialGraph] = useState<GraphPayload>(emptyGraph)
  const [messages, setMessages] = useState<Message[]>([])
  const [helpMessages, setHelpMessages] = useState<HelpMessage[]>([INITIAL_HELP_MESSAGE])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [draft, setDraft] = useState('')
  const [helpDraft, setHelpDraft] = useState('')
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isHelpSubmitting, setIsHelpSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const demoHandledRef = useRef(false)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Load the app shell and a small starter graph together so the first
        // screen feels complete instead of progressively filling in piece by piece.
        const [nextMeta, nextGraph] = await Promise.all([
          api.getMeta(),
          api.getInitialGraph(),
        ])
        setMeta(nextMeta)
        setInitialGraph(nextGraph)
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

  const clearSelection = () => {
    setSelectedNodeId(null)
    setSelectedNode(null)
  }

  const runQuestion = async (question: string, focusNodeIds: string[] = []) => {
    const resolvedFocusNodeIds = focusNodeIds.length > 0 ? focusNodeIds : selectedNodeId ? [selectedNodeId] : []
    const nextMessages: Message[] = [...messages, { role: 'user', content: question }]
    setMessages(nextMessages)
    setDraft('')
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await api.askQuestion(
        question,
        nextMessages.map((message) => ({ role: message.role, content: message.content })),
        resolvedFocusNodeIds,
      )

      // Each answer already comes with the graph slice that best explains it.
      startTransition(() => setGraph(response.graph))
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        answer_title: response.answer_title,
        highlights: response.highlights,
        recommended_actions: response.recommended_actions,
        follow_up_questions: response.follow_up_questions,
        graph_focus_count: response.graph.focus_node_ids.length,
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
      } else {
        clearSelection()
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to run query.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const runHelpQuestion = async (question: string) => {
    const nextMessages: HelpMessage[] = [...helpMessages, { role: 'user', content: question }]
    setHelpMessages(nextMessages)
    setHelpDraft('')
    setIsHelpSubmitting(true)
    setError(null)

    try {
      const response = await api.askProjectHelp(
        question,
        nextMessages.map((message) => ({ role: message.role, content: message.content })),
      )

      const assistantMessage: HelpMessage = {
        role: 'assistant',
        content: response.answer,
        answer_title: response.answer_title,
        highlights: response.highlights,
        suggested_questions: response.suggested_questions,
        citations: response.citations,
      }
      setHelpMessages((current) => [...current, assistantMessage])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load project help.')
    } finally {
      setIsHelpSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    const question = draft.trim()
    if (!question) {
      return
    }
    await runQuestion(question)
  }

  const handleHelpSubmit = async () => {
    const question = helpDraft.trim()
    if (!question) {
      return
    }
    await runHelpQuestion(question)
  }

  const handlePickResult = async (nodeId: string) => {
    try {
      const nextGraph = await api.getSubgraph([nodeId], 1, 90)
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
      const nextGraph = await api.expandGraph(selectedNodeId, 1, 120)
      startTransition(() => setGraph(nextGraph))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to expand graph.')
    }
  }

  const handleInvestigateInbox = async (item: InboxItem) => {
    await runQuestion(item.drill_question, item.focus_node_ids)
  }

  const handleResetWorkspace = async () => {
    setDraft('')
    setSearch('')
    setSearchResults([])
    clearSelection()
    setError(null)

    if (initialGraph.nodes.length > 0 || initialGraph.edges.length > 0) {
      startTransition(() => setGraph(initialGraph))
      return
    }

    try {
      const nextGraph = await api.getInitialGraph()
      setInitialGraph(nextGraph)
      startTransition(() => setGraph(nextGraph))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to reset workspace.')
    }
  }

  const handleRefreshOverview = async () => {
    try {
      const [nextMeta, nextGraph] = await Promise.all([api.getMeta(), api.getInitialGraph()])
      setMeta(nextMeta)
      setInitialGraph(nextGraph)
      startTransition(() => setGraph(nextGraph))
      clearSelection()
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to refresh overview.')
    }
  }

  const handleExportMessage = (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message || message.role !== 'assistant') {
      return
    }

    const previousQuestion = [...messages.slice(0, messageIndex)]
      .reverse()
      .find((entry) => entry.role === 'user')?.content

    const lines = [
      `# Investigation Brief`,
      '',
      `## Question`,
      previousQuestion ?? 'Not found',
      '',
      `## Answer`,
      message.answer_title ? `### ${message.answer_title}` : '',
      message.content,
      '',
    ]

    if (message.highlights?.length) {
      lines.push('## Key findings')
      message.highlights.forEach((item) => lines.push(`- ${item}`))
      lines.push('')
    }

    if (message.recommended_actions?.length) {
      lines.push('## Recommended actions')
      message.recommended_actions.forEach((item) => lines.push(`- ${item}`))
      lines.push('')
    }

    if (message.citations?.length) {
      lines.push('## Sources and trust notes')
      message.citations.forEach((item) => lines.push(`- ${item}`))
      lines.push('')
    }

    if (message.sql) {
      lines.push('## SQL')
      lines.push('```sql')
      lines.push(message.sql)
      lines.push('```')
      lines.push('')
    }

    if (message.evidence) {
      lines.push(`## Evidence rows (${message.evidence.row_count})`)
      lines.push(message.evidence.columns.join(' | '))
      message.evidence.rows.slice(0, 5).forEach((row) => {
        lines.push(row.map((value) => (value === null ? 'NULL' : String(value))).join(' | '))
      })
      lines.push('')
    }

    const blob = new Blob([lines.filter(Boolean).join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `investigation-${messageIndex + 1}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyMessage = async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message || message.role !== 'assistant') {
      return
    }

    const parts = [message.answer_title, message.content]
    if (message.highlights?.length) {
      parts.push('', 'Key findings:')
      message.highlights.forEach((item) => parts.push(`- ${item}`))
    }
    if (message.recommended_actions?.length) {
      parts.push('', 'Recommended actions:')
      message.recommended_actions.forEach((item) => parts.push(`- ${item}`))
    }
    await navigator.clipboard.writeText(parts.filter(Boolean).join('\n'))
  }

  const handleCopySql = async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message?.sql) {
      return
    }
    await navigator.clipboard.writeText(message.sql)
  }

  const runDemoScenario = useEffectEvent((demoKey: string) => {
    const scenario = DEMO_SCENARIOS[demoKey]
    if (!scenario) {
      return
    }

    demoHandledRef.current = true
    if (scenario.kind === 'erp') {
      void runQuestion(scenario.question)
      return
    }

    void runHelpQuestion(scenario.question)
  })

  useEffect(() => {
    if (isBootstrapping || demoHandledRef.current) {
      return
    }

    const demoKey = new URLSearchParams(window.location.search).get('demo')
    if (!demoKey) {
      return
    }

    runDemoScenario(demoKey)
  }, [isBootstrapping])

  const stats = meta?.dataset_stats.totals
  const selectedContextLabel = selectedNode
    ? `${selectedNode.label}${selectedNode.subtitle ? ` | ${selectedNode.subtitle}` : ''}`
    : null

  return (
    <div className="app-shell">
      <header className="hero-bar">
        <div>
          <p className="eyebrow">SAP Order-to-Cash Intelligence</p>
          <h1>{meta?.title ?? 'Loading intelligence copilot...'}</h1>
          <p className="hero-copy">
            A minimal operator workspace for tracing invoices, investigating broken flows, and answering ERP questions
            with grounded SQL and a shared business graph.
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
            <span>A/R Docs</span>
            <strong>{stats?.accounting_documents ?? '...'}</strong>
          </div>
        </div>
      </header>

      <div className="status-row">
        <span className="status-pill neutral">Grounded in DuckDB SQL</span>
        <span className={`status-pill ${meta?.llm_status.ready ? 'ready' : 'idle'}`}>
          {meta?.llm_status.provider === 'gemini' ? 'Gemini fallback configured' : 'LLM fallback disabled'}
        </span>
        <span className="status-pill neutral">Operations inbox and guided flows</span>
        <button type="button" className="workspace-action" onClick={() => void handleResetWorkspace()}>
          Reset workspace
        </button>
        <button type="button" className="workspace-action" onClick={() => void handleRefreshOverview()}>
          Refresh overview
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <main className="workspace">
        <ChatPanel
          messages={messages}
          exampleQueries={meta?.example_queries ?? []}
          inboxItems={meta?.ops_inbox ?? []}
          draft={draft}
          isSubmitting={isSubmitting}
          llmReady={Boolean(meta?.llm_status.ready)}
          selectedContextLabel={selectedContextLabel}
          onClearContext={clearSelection}
          onDraftChange={setDraft}
          onSubmit={() => void handleSubmit()}
          onExampleClick={(query) => setDraft(query)}
          onInvestigateInbox={(item) => {
            void handleInvestigateInbox(item)
          }}
          onFollowUpClick={(query) => {
            void runQuestion(query)
          }}
          onCopyMessage={(messageIndex) => {
            void handleCopyMessage(messageIndex)
          }}
          onCopySql={(messageIndex) => {
            void handleCopySql(messageIndex)
          }}
          onExportMessage={handleExportMessage}
        />

        <section className="panel panel-graph">
          {isBootstrapping ? (
            <div className="loading-state">Building semantic views and graph context...</div>
          ) : (
            <GraphCanvas
              graph={graph}
              selectedNodeId={selectedNodeId}
              onResetGraph={() => {
                void handleResetWorkspace()
              }}
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
          helpMessages={helpMessages}
          helpDraft={helpDraft}
          isHelpSubmitting={isHelpSubmitting}
          onSearchChange={setSearch}
          onPickResult={(nodeId) => {
            void handlePickResult(nodeId)
          }}
          onExpandSelected={() => {
            void handleExpandSelected()
          }}
          onClearSelected={clearSelection}
          onHelpDraftChange={setHelpDraft}
          onHelpSubmit={() => {
            void handleHelpSubmit()
          }}
          onHelpExampleClick={(question) => {
            void runHelpQuestion(question)
          }}
          onQuickAction={(question) => {
            void runQuestion(question, selectedNodeId ? [selectedNodeId] : [])
          }}
        />
      </main>
    </div>
  )
}

export default App
