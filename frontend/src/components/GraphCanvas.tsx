import { useEffect, useRef } from 'react'
import cytoscape, { type Core } from 'cytoscape'

import type { GraphPayload } from '../types'

type GraphCanvasProps = {
  graph: GraphPayload
  selectedNodeId: string | null
  onResetGraph: () => void
  onSelectNode: (nodeId: string) => void
}

const graphStylesheet: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#1f2937',
      color: '#f9fafb',
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': 108,
      'font-family': '"Instrument Sans", sans-serif',
      'font-size': 11,
      'font-weight': 600,
      'text-valign': 'center',
      'text-halign': 'center',
      width: 52,
      height: 52,
      'border-width': 1.5,
      'border-color': '#ffffff',
      'shadow-color': 'rgba(15, 23, 42, 0.12)',
      'shadow-opacity': 0.18,
      'shadow-blur': 10,
      'shadow-offset-x': 0,
      'shadow-offset-y': 4,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.4,
      'line-color': '#cbd5e1',
      'target-arrow-color': '#cbd5e1',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: '',
      opacity: 0.9,
    },
  },
  { selector: '.customer', style: { 'background-color': '#525f7a' } },
  { selector: '.sales_order', style: { 'background-color': '#111827' } },
  { selector: '.sales_order_item', style: { 'background-color': '#6b7280', width: 40, height: 40 } },
  { selector: '.schedule_summary', style: { 'background-color': '#94a3b8', color: '#111827', width: 38, height: 38 } },
  { selector: '.delivery', style: { 'background-color': '#315b8a' } },
  { selector: '.delivery_item', style: { 'background-color': '#8aa2bf', color: '#111827', width: 38, height: 38 } },
  { selector: '.billing_document', style: { 'background-color': '#364172' } },
  { selector: '.billing_item', style: { 'background-color': '#8a93bb', color: '#111827', width: 38, height: 38 } },
  { selector: '.accounting_document', style: { 'background-color': '#3b4a58' } },
  { selector: '.payment_document', style: { 'background-color': '#3c756b' } },
  { selector: '.product', style: { 'background-color': '#55636f' } },
  { selector: '.plant', style: { 'background-color': '#6b7280' } },
  { selector: '.address', style: { 'background-color': '#d1d5db', color: '#111827', width: 36, height: 36 } },
  {
    selector: '.focus',
    style: {
      'border-width': 4,
      'border-color': '#111827',
      'overlay-color': '#111827',
      'overlay-opacity': 0.03,
    },
  },
  {
    selector: '.selected-node',
    style: {
      'border-width': 4.5,
      'border-color': '#0f172a',
      'shadow-color': 'rgba(15, 23, 42, 0.24)',
      'shadow-opacity': 0.28,
      'shadow-blur': 18,
      'shadow-offset-x': 0,
      'shadow-offset-y': 8,
    },
  },
]

export function GraphCanvas({ graph, selectedNodeId, onResetGraph, onSelectNode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  const onSelectRef = useRef(onSelectNode)

  useEffect(() => {
    onSelectRef.current = onSelectNode
  }, [onSelectNode])

  const fitGraph = () => {
    cyRef.current?.fit(undefined, 36)
  }

  const centerFocus = () => {
    const cy = cyRef.current
    if (!cy) {
      return
    }
    if (graph.focus_node_ids.length > 0) {
      const focusElements = graph.focus_node_ids
        .map((nodeId) => cy.getElementById(nodeId))
        .filter((element) => element.length > 0) as any
      cy.fit(cy.collection(focusElements), 52)
      return
    }
    cy.fit(undefined, 36)
  }

  const exportPng = () => {
    const cy = cyRef.current
    if (!cy) {
      return
    }
    const dataUrl = cy.png({
      bg: '#ffffff',
      full: true,
      scale: 2,
    })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = 'o2c-context-map.png'
    link.click()
  }

  useEffect(() => {
    if (!containerRef.current) {
      return undefined
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: graphStylesheet,
      wheelSensitivity: 0.15,
    })

    cy.on('tap', 'node', (event) => {
      const nodeId = event.target.id()
      onSelectRef.current(nodeId)
    })

    cyRef.current = cy
    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    cy.batch(() => {
      cy.elements().remove()
      cy.add([...graph.nodes, ...graph.edges])
      cy.nodes().removeClass('focus selected-node')
      graph.focus_node_ids.forEach((nodeId) => {
        cy.getElementById(nodeId).addClass('focus')
      })
      if (selectedNodeId) {
        cy.getElementById(selectedNodeId).addClass('selected-node')
      }
    })

    const focusedLayout = graph.focus_node_ids.length > 0
    cy.layout({
      name: focusedLayout ? 'breadthfirst' : 'cose',
      animate: false,
      fit: true,
      padding: 28,
      directed: true,
      spacingFactor: focusedLayout ? 1.4 : 1.1,
      roots: focusedLayout ? graph.focus_node_ids : undefined,
      nodeDimensionsIncludeLabels: true,
    }).run()
  }, [graph, selectedNodeId])

  return (
    <div className="graph-shell">
      <div className="graph-header">
        <div>
          <p className="eyebrow">Context Map</p>
          <h2>Follow the entities behind each answer</h2>
          <p className="panel-subcopy">Select any node to inspect it, or use the right rail to search directly for a known object.</p>
        </div>
        <div className="graph-side">
          <div className="graph-badges">
            {graph.focus_node_ids.length > 0 ? <span>{graph.focus_node_ids.length} focused</span> : null}
            {selectedNodeId ? <span>1 selected</span> : null}
            <span>{graph.nodes.length} nodes</span>
            <span>{graph.edges.length} edges</span>
          </div>
          <div className="graph-actions">
            <button type="button" className="secondary-button" onClick={fitGraph}>
              Fit
            </button>
            <button type="button" className="secondary-button" onClick={centerFocus}>
              Center focus
            </button>
            <button type="button" className="secondary-button" onClick={exportPng}>
              Export PNG
            </button>
            <button type="button" className="secondary-button" onClick={onResetGraph}>
              Reset map
            </button>
          </div>
        </div>
      </div>
      <div className="graph-canvas" ref={containerRef} />
    </div>
  )
}
