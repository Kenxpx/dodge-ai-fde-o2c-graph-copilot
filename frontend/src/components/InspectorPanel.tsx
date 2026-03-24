import type { NodeDetail, SearchResult } from '../types'

type InspectorPanelProps = {
  selectedNode: NodeDetail | null
  selectedNodeId: string | null
  search: string
  searchResults: SearchResult[]
  onSearchChange: (value: string) => void
  onPickResult: (nodeId: string) => void
  onExpandSelected: () => void
  onClearSelected: () => void
}

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
  onSearchChange,
  onPickResult,
  onExpandSelected,
  onClearSelected,
}: InspectorPanelProps) {
  const metadataEntries = selectedNode
    ? Object.entries(selectedNode.metadata).filter(([, value]) => value !== null && value !== '')
    : []

  return (
    <section className="panel panel-inspector">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Entity Explorer</p>
          <h2>Search any order, invoice, customer, delivery, or product</h2>
          <p className="panel-subcopy">Use search to jump directly to a business object, then inspect its metadata and relationships.</p>
        </div>
      </div>

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
    </section>
  )
}
