import type { Message } from '../types'

type ChatPanelProps = {
  messages: Message[]
  exampleQueries: string[]
  draft: string
  isSubmitting: boolean
  llmReady: boolean
  selectedContextLabel: string | null
  onClearContext: () => void
  onDraftChange: (value: string) => void
  onSubmit: () => void
  onExampleClick: (value: string) => void
}

const STRATEGY_LABELS: Record<string, string> = {
  template_top_products: 'Deterministic ranking',
  template_top_customers: 'Deterministic ranking',
  template_trace_billing_document: 'Deterministic flow trace',
  template_incomplete_flows: 'Deterministic exception scan',
  template_cancellations: 'Deterministic cancellation scan',
  template_open_ar: 'Deterministic open-item scan',
  llm_sql: 'Gemini SQL plan',
  llm_sql_failed: 'Gemini fallback',
  needs_llm_provider: 'Configuration note',
  guardrail_rejection: 'Guardrail',
}

function strategyLabel(strategy?: string) {
  if (!strategy) {
    return null
  }
  return STRATEGY_LABELS[strategy] ?? strategy.replaceAll('_', ' ')
}

export function ChatPanel({
  messages,
  exampleQueries,
  draft,
  isSubmitting,
  llmReady,
  selectedContextLabel,
  onClearContext,
  onDraftChange,
  onSubmit,
  onExampleClick,
}: ChatPanelProps) {
  return (
    <section className="panel panel-chat">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Business Q&A</p>
          <h2>Ask an ERP question in plain language</h2>
          <p className="panel-subcopy">
            Results stay grounded in SQL, and the graph automatically narrows to the entities behind the answer.
          </p>
        </div>
      </div>

      <div className="capability-row">
        <span className="pill">Invoice tracing</span>
        <span className="pill">Broken-flow detection</span>
        <span className="pill">{llmReady ? 'Gemini fallback enabled' : 'Deterministic mode available'}</span>
      </div>

      <div className="example-strip">
        {exampleQueries.slice(0, 5).map((query) => (
          <button key={query} type="button" className="example-chip" onClick={() => onExampleClick(query)}>
            {query}
          </button>
        ))}
      </div>

      <div className="message-list">
        {messages.length === 0 ? (
          <div className="empty-message">
            <p>Start with a billing trace, a customer ranking, a cancellation question, or an open A/R investigation.</p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message-card ${message.role}`}>
            <header>
              <span>{message.role === 'user' ? 'Question' : strategyLabel(message.strategy) ?? 'Answer'}</span>
              {message.role === 'assistant' ? <small>Validated SQL</small> : null}
            </header>

            {message.answer_title ? <h3 className="message-title">{message.answer_title}</h3> : null}
            <div className="message-body">{message.content}</div>

            {message.highlights?.length ? (
              <ul className="highlight-list">
                {message.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            ) : null}

            {message.warnings?.length ? (
              <div className="message-meta">
                {message.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            {message.evidence ? (
              <details className="message-detail">
                <summary>Evidence ({message.evidence.row_count} rows)</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {message.evidence.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {message.evidence.rows.slice(0, 8).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((value, cellIndex) => (
                            <td key={cellIndex}>{value === null ? 'NULL' : String(value)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}

            {message.sql ? (
              <details className="message-detail">
                <summary>Executed SQL</summary>
                <pre>{message.sql}</pre>
              </details>
            ) : null}
          </article>
        ))}
      </div>

      <div className="composer">
        {selectedContextLabel ? (
          <div className="context-badge-row">
            <span className="context-badge">Using graph context: {selectedContextLabel}</span>
            <button type="button" className="text-button" onClick={onClearContext}>
              Clear
            </button>
          </div>
        ) : null}

        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Example: Which customer has the most cancelled billing documents, and which invoice ids were reversed?"
          rows={3}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
          }}
        />

        <div className="composer-footer">
          <span className="composer-hint">Press Ctrl/Cmd + Enter to run</span>
          <button type="button" onClick={onSubmit} disabled={isSubmitting || draft.trim().length === 0}>
            {isSubmitting ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </div>
    </section>
  )
}
