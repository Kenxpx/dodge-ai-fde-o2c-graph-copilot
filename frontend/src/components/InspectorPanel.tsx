import { useState } from 'react'

import type { HelpMessage, NodeDetail, SearchResult } from '../types'

type InspectorPanelProps = {
  selectedNode: NodeDetail | null
  selectedNodeId: string | null
  search: string
  searchResults: SearchResult[]
  helpMessages: HelpMessage[]
  helpDraft: string
  isHelpSubmitting: boolean
  onSearchChange: (value: string) => void
  onPickResult: (nodeId: string) => void
  onExpandSelected: () => void
  onClearSelected: () => void
  onHelpDraftChange: (value: string) => void
  onHelpSubmit: () => void
  onHelpExampleClick: (value: string) => void
}

const HELP_EXAMPLES = [
  'How is this project structured end to end?',
  'Why did you choose DuckDB and FastAPI?',
  'How does Gemini stay grounded and safe?',
  'Who built this project and what was the goal?',
]

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export function InspectorPanel({
  selectedNode,
  selectedNodeId,
  search,
  searchResults,
  helpMessages,
  helpDraft,
  isHelpSubmitting,
  onSearchChange,
  onPickResult,
  onExpandSelected,
  onClearSelected,
  onHelpDraftChange,
  onHelpSubmit,
  onHelpExampleClick,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'explorer'>('guide')

  const metadataEntries = selectedNode
    ? Object.entries(selectedNode.metadata).filter(([, value]) => value !== null && value !== '')
    : []

  return (
    <section className="panel panel-inspector">
      <div className="panel-header">
        <div className="inspector-header-row">
          <div>
            <p className="eyebrow">Right Rail</p>
            <h2>{activeTab === 'guide' ? 'Project guide and reviewer help' : 'Entity explorer and inspector'}</h2>
            <p className="panel-subcopy">
              {activeTab === 'guide'
                ? 'Ask how the project was built, why key decisions were made, how the app is deployed, and what the submission includes.'
                : 'Search any order, invoice, customer, delivery, or product, then inspect its metadata and nearby relationships.'}
            </p>
          </div>

          <div className="tab-row">
            <button
              type="button"
              className={`tab-button ${activeTab === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              Project guide
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
            >
              Explorer
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'guide' ? (
        <div className="guide-shell">
          <div className="guide-intro-card">
            <p className="section-label">Ask the project guide</p>
            <div className="guide-example-row">
              {HELP_EXAMPLES.map((question) => (
                <button key={question} type="button" className="follow-up-chip" onClick={() => onHelpExampleClick(question)}>
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="guide-message-list">
            {helpMessages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`guide-message ${message.role}`}>
                <header>
                  <span>{message.role === 'user' ? 'You' : 'Project guide'}</span>
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

                {message.citations?.length ? (
                  <div className="citation-block">
                    {message.citations.map((citation) => (
                      <p key={citation}>{citation}</p>
                    ))}
                  </div>
                ) : null}

                {message.suggested_questions?.length ? (
                  <div className="follow-up-section">
                    <p className="section-label">Good follow-up questions</p>
                    <div className="follow-up-row">
                      {message.suggested_questions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          className="follow-up-chip"
                          onClick={() => onHelpExampleClick(question)}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="guide-composer">
            <textarea
              value={helpDraft}
              onChange={(event) => onHelpDraftChange(event.target.value)}
              placeholder="Example: How does the app keep Gemini grounded while still supporting open-ended ERP questions?"
              rows={3}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  onHelpSubmit()
                }
              }}
            />
            <div className="composer-footer">
              <span className="composer-hint">Ask about architecture, guardrails, deployment, docs, or authorship</span>
              <button type="button" onClick={onHelpSubmit} disabled={isHelpSubmitting || helpDraft.trim().length === 0}>
                {isHelpSubmitting ? 'Thinking...' : 'Ask guide'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <label className="search-box">
            <span>Search graph entities</span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Try 90504298, 740598, 320000083, or a product name"
            />
          </label>

          <div className="search-results">
            {search.trim().length < 2 ? <p className="search-helper">Enter at least two characters to search.</p> : null}
            {search.trim().length >= 2 && searchResults.length === 0 ? <p className="search-helper">No matching graph entities found.</p> : null}
            {searchResults.map((result) => (
              <button key={result.node_id} type="button" className="search-result" onClick={() => onPickResult(result.node_id)}>
                <strong>{result.label}</strong>
                <span>{formatLabel(result.node_type)}</span>
                {result.subtitle ? <small>{result.subtitle}</small> : null}
              </button>
            ))}
          </div>

          <div className="inspector-card">
            <div className="inspector-title-row">
              <div>
                <p className="eyebrow">Inspector</p>
                <h3>{selectedNode?.label ?? 'Select an entity'}</h3>
                <p>
                  {selectedNode?.subtitle ??
                    'Click a graph node or choose a search result to inspect its metadata and nearby relationships.'}
                </p>
              </div>
              <div className="inspector-actions">
                <button type="button" onClick={onExpandSelected} disabled={!selectedNodeId}>
                  Expand
                </button>
                <button type="button" className="secondary-button" onClick={onClearSelected} disabled={!selectedNodeId}>
                  Clear
                </button>
              </div>
            </div>

            {selectedNode ? (
              <>
                <div className="pill-row">
                  <span className="pill">{formatLabel(selectedNode.node_type)}</span>
                  <span className="pill">{selectedNode.node_id}</span>
                </div>

                <div className="section-label">Key facts</div>
                <div className="metadata-grid">
                  {metadataEntries.map(([key, value]) => (
                    <div key={key} className="metadata-item">
                      <span>{formatLabel(key)}</span>
                      <strong>{String(value)}</strong>
                    </div>
                  ))}
                </div>

                <div className="neighbor-section">
                  <p className="section-label">Relationship summary</p>
                  {selectedNode.neighbors.map((neighbor) => (
                    <div key={`${neighbor.direction}-${neighbor.edge_type}`} className="neighbor-row">
                      <span>{formatLabel(neighbor.direction)}</span>
                      <strong>{formatLabel(neighbor.edge_type)}</strong>
                      <span>{neighbor.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}
