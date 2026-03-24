import type { NodeDetail, SearchResult } from '../types'

type InspectorPanelProps = {
  selectedNode: NodeDetail | null
  selectedNodeId: string | null
  search: string
  searchResults: SearchResult[]
  onSearchChange: (value: string) => void
  onPickResult: (nodeId: string) => void
  onExpandSelected: () => void
}

export function InspectorPanel({
  selectedNode,
  selectedNodeId,
  search,
  searchResults,
  onSearchChange,
  onPickResult,
  onExpandSelected,
}: InspectorPanelProps) {
  return (
    <section className="panel panel-inspector">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Node Search</p>
          <h2>Jump to any customer, order, delivery, invoice, or product</h2>
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
        {searchResults.map((result) => (
          <button key={result.node_id} type="button" className="search-result" onClick={() => onPickResult(result.node_id)}>
            <strong>{result.label}</strong>
            <span>{result.node_type}</span>
            {result.subtitle ? <small>{result.subtitle}</small> : null}
          </button>
        ))}
      </div>

      <div className="inspector-card">
        <div className="inspector-title-row">
          <div>
            <p className="eyebrow">Node Inspector</p>
            <h3>{selectedNode?.label ?? 'Select a node'}</h3>
            <p>{selectedNode?.subtitle ?? 'Click a graph node or choose a search result to inspect its metadata.'}</p>
          </div>
          <button type="button" onClick={onExpandSelected} disabled={!selectedNodeId}>
            Expand
          </button>
        </div>

        {selectedNode ? (
          <>
            <div className="pill-row">
              <span className="pill">{selectedNode.node_type}</span>
              <span className="pill">{selectedNode.node_id}</span>
            </div>

            <div className="metadata-grid">
              {Object.entries(selectedNode.metadata).map(([key, value]) => (
                <div key={key} className="metadata-item">
                  <span>{key}</span>
                  <strong>{value === null || value === '' ? 'NULL' : String(value)}</strong>
                </div>
              ))}
            </div>

            <div className="neighbor-section">
              <p className="eyebrow">Relationship Summary</p>
              {selectedNode.neighbors.map((neighbor) => (
                <div key={`${neighbor.direction}-${neighbor.edge_type}`} className="neighbor-row">
                  <span>{neighbor.direction}</span>
                  <strong>{neighbor.edge_type}</strong>
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
