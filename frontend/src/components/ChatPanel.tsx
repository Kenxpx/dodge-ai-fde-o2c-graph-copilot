import type { Message } from '../types'

type ChatPanelProps = {
  messages: Message[]
  exampleQueries: string[]
  draft: string
  isSubmitting: boolean
  onDraftChange: (value: string) => void
  onSubmit: () => void
  onExampleClick: (value: string) => void
}

export function ChatPanel({
  messages,
  exampleQueries,
  draft,
  isSubmitting,
  onDraftChange,
  onSubmit,
  onExampleClick,
}: ChatPanelProps) {
  return (
    <section className="panel panel-chat">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Grounded Chat</p>
          <h2>Ask business questions in plain language</h2>
        </div>
      </div>

      <div className="example-strip">
        {exampleQueries.map((query) => (
          <button key={query} type="button" className="example-chip" onClick={() => onExampleClick(query)}>
            {query}
          </button>
        ))}
      </div>

      <div className="message-list">
        {messages.length === 0 ? (
          <div className="empty-message">
            <p>Use the examples above or ask about flows, cancellations, open items, customers, or products.</p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message-card ${message.role}`}>
            <header>
              <span>{message.role === 'user' ? 'Question' : 'Answer'}</span>
              {message.strategy ? <small>{message.strategy}</small> : null}
            </header>
            <div className="message-body">{message.content}</div>
            {message.warnings?.length ? (
              <div className="message-meta">
                {message.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
            {message.sql ? (
              <details className="message-detail">
                <summary>SQL</summary>
                <pre>{message.sql}</pre>
              </details>
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
          </article>
        ))}
      </div>

      <div className="composer">
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Trace a billing document, find broken flows, rank products, or ask a custom ERP question..."
          rows={4}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
          }}
        />
        <button type="button" onClick={onSubmit} disabled={isSubmitting || draft.trim().length === 0}>
          {isSubmitting ? 'Running...' : 'Run Query'}
        </button>
      </div>
    </section>
  )
}
