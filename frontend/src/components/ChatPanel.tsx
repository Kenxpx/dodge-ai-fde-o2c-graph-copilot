import type { InboxItem, Message } from '../types'

type ChatPanelProps = {
  messages: Message[]
  exampleQueries: string[]
  inboxItems: InboxItem[]
  draft: string
  isSubmitting: boolean
  llmReady: boolean
  selectedContextLabel: string | null
  onClearContext: () => void
  onDraftChange: (value: string) => void
  onSubmit: () => void
  onExampleClick: (value: string) => void
  onInvestigateInbox: (item: InboxItem) => void
  onFollowUpClick: (value: string) => void
  onExportMessage: (messageIndex: number) => void
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

function severityLabel(severity: InboxItem['severity']) {
  if (severity === 'high') {
    return 'High priority'
  }
  if (severity === 'medium') {
    return 'Medium priority'
  }
  return 'Low priority'
}

export function ChatPanel({
  messages,
  exampleQueries,
  inboxItems,
  draft,
  isSubmitting,
  llmReady,
  selectedContextLabel,
  onClearContext,
  onDraftChange,
  onSubmit,
  onExampleClick,
  onInvestigateInbox,
  onFollowUpClick,
  onExportMessage,
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
        <span className="pill">Exception inbox</span>
        <span className="pill">Shareable investigation brief</span>
        <span className="pill">{llmReady ? 'Gemini fallback enabled' : 'Deterministic mode available'}</span>
      </div>

      <div className="example-strip">
        {exampleQueries.slice(0, 5).map((query) => (
          <button key={query} type="button" className="example-chip" onClick={() => onExampleClick(query)}>
            {query}
          </button>
        ))}
      </div>

      {inboxItems.length ? (
        <section className="ops-inbox">
          <div className="ops-inbox-header">
            <div>
              <p className="eyebrow">Operations Inbox</p>
              <h3>Start with the issues that deserve attention</h3>
            </div>
            <span className="pill">{inboxItems.length} issue buckets</span>
          </div>

          <div className="ops-inbox-grid">
            {inboxItems.map((item) => (
              <article key={item.id} className="inbox-card">
                <div className="inbox-card-top">
                  <span className={`severity-pill ${item.severity}`}>{severityLabel(item.severity)}</span>
                  <strong>{item.count}</strong>
                </div>
                <h4>{item.title}</h4>
                <p>{item.summary}</p>
                {item.sample_ids.length ? (
                  <div className="sample-chip-row">
                    {item.sample_ids.map((sampleId) => (
                      <span key={sampleId} className="sample-chip">
                        {sampleId}
                      </span>
                    ))}
                  </div>
                ) : null}
                <button type="button" className="secondary-button full-width-button" onClick={() => onInvestigateInbox(item)}>
                  Investigate
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="message-list">
        {messages.length === 0 ? (
          <div className="empty-message">
            <p>Start with an ops inbox issue, a billing trace, a customer ranking, a cancellation question, or an open A/R investigation.</p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message-card ${message.role}`}>
            <header>
              <span>{message.role === 'user' ? 'Question' : strategyLabel(message.strategy) ?? 'Answer'}</span>
              {message.role === 'assistant' ? <small>Grounded answer</small> : null}
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

            {message.recommended_actions?.length ? (
              <div className="action-section">
                <p className="section-label">Recommended next actions</p>
                <ul className="action-list">
                  {message.recommended_actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {message.follow_up_questions?.length ? (
              <div className="follow-up-section">
                <p className="section-label">Suggested next questions</p>
                <div className="follow-up-row">
                  {message.follow_up_questions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="follow-up-chip"
                      onClick={() => onFollowUpClick(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {message.warnings?.length ? (
              <div className="message-meta">
                {message.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            {message.citations?.length ? (
              <div className="citation-block">
                {message.citations.map((citation) => (
                  <p key={citation}>{citation}</p>
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

            {message.role === 'assistant' ? (
              <div className="message-actions">
                <button type="button" className="secondary-button" onClick={() => onExportMessage(index)}>
                  Export brief
                </button>
              </div>
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
            {isSubmitting ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>
    </section>
  )
}
