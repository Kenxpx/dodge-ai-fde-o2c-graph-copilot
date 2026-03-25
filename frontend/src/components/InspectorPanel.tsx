import { useEffect, useState } from 'react'

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
  onQuickAction: (value: string) => void
}

type QuickAction = {
  label: string
  prompt: string
  note: string
}

type Runbook = {
  title: string
  summary: string
  steps: string[]
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

function readMetadataValue(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key]
    if (value !== null && value !== undefined && value !== '') {
      return String(value)
    }
  }
  return null
}

function buildQuickActions(node: NodeDetail | null): QuickAction[] {
  if (!node) {
    return []
  }

  const metadata = node.metadata
  const customerId = readMetadataValue(metadata, 'customer_id')
  const billingDocument = readMetadataValue(metadata, 'billing_document') ?? node.label
  const salesOrder = readMetadataValue(metadata, 'sales_order') ?? node.label
  const accountingDocument = readMetadataValue(metadata, 'accounting_document') ?? node.label
  const productId = readMetadataValue(metadata, 'product_id') ?? node.label
  const deliveryDocument = readMetadataValue(metadata, 'delivery_document') ?? node.label
  const plantId =
    readMetadataValue(metadata, 'delivery_plant_id', 'delivery_plant_name', 'delivery_plant', 'plant', 'plant_id') ??
    node.label

  if (node.node_type === 'billing_document') {
    return [
      {
        label: 'Trace flow',
        prompt: `Trace the full flow of billing document ${billingDocument}.`,
        note: 'Follow the order, delivery, billing, and A/R lineage end to end.',
      },
      {
        label: 'Check reversal',
        prompt: `Was billing document ${billingDocument} cancelled later?`,
        note: 'Verify whether this invoice was reversed through a cancellation document.',
      },
      ...(customerId
        ? [
            {
              label: 'Customer billing',
              prompt: `Show all billing documents for customer ${customerId}.`,
              note: 'Pivot from this invoice to the broader customer context.',
            },
          ]
        : []),
    ]
  }

  if (node.node_type === 'sales_order') {
    return [
      {
        label: 'Trace order',
        prompt: `Trace sales order ${salesOrder} end to end.`,
        note: 'Check whether the order completed delivery, billing, and clearing.',
      },
      {
        label: 'Check breaks',
        prompt: 'Identify sales orders that have broken or incomplete flows.',
        note: 'Compare this order against the broader exception queue.',
      },
      ...(customerId
        ? [
            {
              label: 'Customer billing',
              prompt: `Show all billing documents for customer ${customerId}.`,
              note: 'See whether this order is part of a wider customer pattern.',
            },
          ]
        : []),
    ]
  }

  if (node.node_type === 'customer') {
    return [
      {
        label: 'Billing activity',
        prompt: `Show all billing documents for customer ${node.label}.`,
        note: 'Review the full invoice activity for this customer.',
      },
      {
        label: 'Open A/R',
        prompt: `Show all open accounting documents for customer ${node.label}.`,
        note: 'Check whether this customer has unresolved receivables.',
      },
      {
        label: 'Check cancellations',
        prompt: `Which billing documents were cancelled for customer ${node.label}?`,
        note: 'Look for reversed invoices and process-quality signals.',
      },
    ]
  }

  if (node.node_type === 'accounting_document') {
    return [
      {
        label: 'Find source invoice',
        prompt: `Which billing document created accounting document ${accountingDocument}?`,
        note: 'Reconnect the accounting posting to the commercial document flow.',
      },
      {
        label: 'Open A/R queue',
        prompt: 'Show me open accounting documents that have not been cleared by a payment.',
        note: 'Compare this posting against the wider open-item backlog.',
      },
      ...(customerId
        ? [
            {
              label: 'Customer open items',
              prompt: `Show all open accounting documents for customer ${customerId}.`,
              note: 'Check whether this is isolated or part of a broader customer issue.',
            },
          ]
        : []),
    ]
  }

  if (node.node_type === 'product') {
    return [
      {
        label: 'Customer demand',
        prompt: `Which customers bought product ${productId}?`,
        note: 'Identify the commercial footprint of this product.',
      },
      {
        label: 'Delivery path',
        prompt: `Which deliveries carried product ${productId}?`,
        note: 'Trace where the product shows up in shipment and billing flows.',
      },
      {
        label: 'Cancellation risk',
        prompt: `Are there any cancelled billing documents involving product ${productId}?`,
        note: 'Check whether this product is overrepresented in reversed invoices.',
      },
    ]
  }

  if (node.node_type === 'delivery') {
    return [
      {
        label: 'Trace delivery',
        prompt: `Trace delivery document ${deliveryDocument} through billing and accounting.`,
        note: 'Follow what happened after fulfillment.',
      },
      {
        label: 'Check breaks',
        prompt: 'Identify sales orders that have broken or incomplete flows.',
        note: 'See whether this delivery belongs to a broader execution issue.',
      },
      {
        label: 'Plant context',
        prompt: `Which products are billed from delivery document ${deliveryDocument}?`,
        note: 'Inspect which products moved through this shipment.',
      },
    ]
  }

  if (node.node_type === 'plant') {
    return [
      {
        label: 'Product spread',
        prompt: `Which products are billed from delivery plant ${plantId}?`,
        note: 'Understand the billed product mix associated with this plant.',
      },
      {
        label: 'Plant ranking',
        prompt: 'Which delivery plants are associated with the widest range of billed products?',
        note: 'Compare this plant against the full network.',
      },
      {
        label: 'Exception scan',
        prompt: 'Identify sales orders that have broken or incomplete flows.',
        note: 'Check whether fulfillment breaks cluster around specific plants.',
      },
    ]
  }

  return [
    {
      label: 'Expand context',
      prompt: 'Identify sales orders that have broken or incomplete flows.',
      note: 'Use a broader operational query to gather more context before drilling deeper.',
    },
  ]
}

function buildRunbook(node: NodeDetail | null): Runbook | null {
  if (!node) {
    return null
  }

  if (node.node_type === 'billing_document') {
    return {
      title: 'Invoice investigation runbook',
      summary: 'Best path when starting from a billing document.',
      steps: [
        'Confirm whether the document is an original invoice or a cancellation record.',
        'Validate the linked A/R posting and whether the receivable was cleared by payment.',
        'Inspect the billing items and delivery chain to verify what was actually fulfilled.',
      ],
    }
  }

  if (node.node_type === 'sales_order') {
    return {
      title: 'Order investigation runbook',
      summary: 'Use this when starting from a sales order or exception case.',
      steps: [
        'Check whether the order has reached delivery at the item level.',
        'Separate delivered-not-billed leakage from billed-not-cleared finance issues.',
        'Compare the order against the incomplete-flow queue to gauge whether it is isolated or systemic.',
      ],
    }
  }

  if (node.node_type === 'customer') {
    return {
      title: 'Customer review runbook',
      summary: 'Useful when a customer appears repeatedly in billing, cancellations, or open A/R.',
      steps: [
        'Review the customer billing footprint before drilling into single documents.',
        'Check whether cancellations or open receivables cluster around this customer.',
        'Use one representative billing trace to inspect the underlying operational chain.',
      ],
    }
  }

  if (node.node_type === 'accounting_document') {
    return {
      title: 'A/R investigation runbook',
      summary: 'Start here when you are triaging open accounting items.',
      steps: [
        'Reconnect the posting to the originating billing document.',
        'Check whether the open item reflects a true unpaid invoice or a later reversal.',
        'Review neighboring customer and billing entities to understand the business impact.',
      ],
    }
  }

  if (node.node_type === 'product') {
    return {
      title: 'Product pattern runbook',
      summary: 'Useful when you want to know whether a product is tied to volume or quality issues.',
      steps: [
        'Identify which customers and deliveries contribute most to this product activity.',
        'Check whether the product appears frequently in cancelled or problematic billing flows.',
        'Use the graph to compare whether the signal is concentrated or broad.',
      ],
    }
  }

  if (node.node_type === 'delivery' || node.node_type === 'plant') {
    return {
      title: 'Fulfillment runbook',
      summary: 'A good path when starting from the shipping side of the flow.',
      steps: [
        'Trace what was fulfilled and whether it was billed correctly afterward.',
        'Check whether the issue is local to this entity or part of a wider execution pattern.',
        'Use nearby products and invoices to understand business impact quickly.',
      ],
    }
  }

  return {
    title: 'Investigation runbook',
    summary: 'A lightweight path for turning this entity into a grounded business investigation.',
    steps: [
      'Start with the closest document or business object linked to this entity.',
      'Run one focused ERP question before expanding into broader pattern analysis.',
      'Use graph neighbors plus evidence rows together before drawing a conclusion.',
    ],
  }
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
  onQuickAction,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'explorer'>('guide')

  useEffect(() => {
    if (selectedNodeId || search.trim().length >= 2) {
      setActiveTab('explorer')
    }
  }, [selectedNodeId, search])

  const metadataEntries = selectedNode
    ? Object.entries(selectedNode.metadata).filter(([, value]) => value !== null && value !== '')
    : []
  const quickActions = buildQuickActions(selectedNode)
  const runbook = buildRunbook(selectedNode)

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

                {quickActions.length ? (
                  <div className="quick-action-section">
                    <p className="section-label">Suggested investigations</p>
                    <div className="quick-action-grid">
                      {quickActions.map((action) => (
                        <button
                          key={`${selectedNode.node_id}-${action.label}`}
                          type="button"
                          className="quick-action-card"
                          onClick={() => onQuickAction(action.prompt)}
                        >
                          <strong>{action.label}</strong>
                          <span>{action.note}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {runbook ? (
                  <div className="runbook-card">
                    <div className="runbook-header">
                      <div>
                        <p className="section-label">Runbook</p>
                        <h4>{runbook.title}</h4>
                      </div>
                      <span className="pill">Operator workflow</span>
                    </div>
                    <p>{runbook.summary}</p>
                    <ol className="runbook-list">
                      {runbook.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}

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
            ) : (
              <p className="search-helper">
                Select an entity to unlock suggested investigations and a lightweight runbook for the next best analysis step.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
