import { useEffect, useRef } from 'react'
import cytoscape, { type Core } from 'cytoscape'

import type { GraphPayload } from '../types'

type GraphCanvasProps = {
  graph: GraphPayload
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
}

const graphStylesheet: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#0f766e',
      color: '#10233a',
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': 118,
      'font-family': '"Space Grotesk", sans-serif',
      'font-size': 12,
      'font-weight': 700,
      'text-valign': 'center',
      'text-halign': 'center',
      width: 54,
      height: 54,
      'border-width': 2,
      'border-color': '#f8fafc',
      'shadow-color': '#cbd5e1',
      'shadow-opacity': 0.45,
      'shadow-blur': 16,
      'shadow-offset-x': 0,
      'shadow-offset-y': 8,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#a8b4c7',
      'target-arrow-color': '#a8b4c7',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: '',
      opacity: 0.72,
    },
  },
  { selector: '.customer', style: { 'background-color': '#d97706', color: '#fff7ed' } },
  { selector: '.sales_order', style: { 'background-color': '#db2777', color: '#fff1f2' } },
  { selector: '.sales_order_item', style: { 'background-color': '#ef4444', color: '#fff5f5', width: 44, height: 44 } },
  { selector: '.schedule_summary', style: { 'background-color': '#f59e0b', width: 42, height: 42 } },
  { selector: '.delivery', style: { 'background-color': '#0284c7', color: '#eff6ff' } },
  { selector: '.delivery_item', style: { 'background-color': '#0ea5e9', width: 42, height: 42 } },
  { selector: '.billing_document', style: { 'background-color': '#6d28d9', color: '#f5f3ff' } },
  { selector: '.billing_item', style: { 'background-color': '#7c3aed', color: '#faf5ff', width: 42, height: 42 } },
  { selector: '.accounting_document', style: { 'background-color': '#4338ca', color: '#eef2ff' } },
  { selector: '.payment_document', style: { 'background-color': '#0f766e', color: '#ecfeff' } },
  { selector: '.product', style: { 'background-color': '#16a34a', color: '#f0fdf4' } },
  { selector: '.plant', style: { 'background-color': '#475569', color: '#f8fafc' } },
  { selector: '.address', style: { 'background-color': '#cbd5e1', color: '#334155', width: 40, height: 40 } },
  {
    selector: '.focus',
    style: {
      'border-width': 4,
      'border-color': '#111827',
      'overlay-color': '#111827',
      'overlay-opacity': 0.05,
    },
  },
  {
    selector: '.selected-node',
    style: {
      'border-width': 5,
      'border-color': '#111827',
      'shadow-color': '#111827',
      'shadow-opacity': 0.25,
      'shadow-blur': 20,
      'shadow-offset-x': 0,
      'shadow-offset-y': 10,
    },
  },
]

export function GraphCanvas({ graph, selectedNodeId, onSelectNode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  const onSelectRef = useRef(onSelectNode)

  useEffect(() => {
    onSelectRef.current = onSelectNode
  }, [onSelectNode])

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
          <p className="eyebrow">Context Graph</p>
          <h2>Follow the business objects behind each answer</h2>
          <p className="panel-subcopy">Click a node to inspect it, or search on the right to jump directly to an entity.</p>
        </div>
        <div className="graph-badges">
          <span>{graph.nodes.length} nodes</span>
          <span>{graph.edges.length} edges</span>
        </div>
      </div>
      <div className="graph-canvas" ref={containerRef} />
    </div>
  )
}
