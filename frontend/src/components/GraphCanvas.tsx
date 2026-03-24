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
      color: '#0f172a',
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': 120,
      'font-family': '"Space Grotesk", sans-serif',
      'font-size': 12,
      'font-weight': 700,
      'text-valign': 'center',
      'text-halign': 'center',
      width: 58,
      height: 58,
      'border-width': 2,
      'border-color': '#ecfeff',
      'box-shadow': '0 14px 30px rgba(15, 23, 42, 0.12)',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      'font-size': 9,
      'font-family': '"IBM Plex Mono", monospace',
      color: '#475569',
      'text-background-color': '#f8fafc',
      'text-background-opacity': 1,
      'text-background-padding': 2,
      'text-rotation': 'autorotate',
    },
  },
  { selector: '.customer', style: { 'background-color': '#f97316' } },
  { selector: '.sales_order', style: { 'background-color': '#fb7185' } },
  { selector: '.sales_order_item', style: { 'background-color': '#f43f5e', width: 46, height: 46 } },
  { selector: '.schedule_summary', style: { 'background-color': '#f59e0b', width: 44, height: 44 } },
  { selector: '.delivery', style: { 'background-color': '#38bdf8' } },
  { selector: '.delivery_item', style: { 'background-color': '#0ea5e9', width: 44, height: 44 } },
  { selector: '.billing_document', style: { 'background-color': '#8b5cf6', color: '#faf5ff' } },
  { selector: '.billing_item', style: { 'background-color': '#7c3aed', color: '#faf5ff', width: 44, height: 44 } },
  { selector: '.accounting_document', style: { 'background-color': '#6366f1', color: '#eef2ff' } },
  { selector: '.payment_document', style: { 'background-color': '#14b8a6' } },
  { selector: '.product', style: { 'background-color': '#22c55e' } },
  { selector: '.plant', style: { 'background-color': '#64748b', color: '#f8fafc' } },
  { selector: '.address', style: { 'background-color': '#cbd5e1', color: '#334155', width: 42, height: 42 } },
  {
    selector: '.focus',
    style: {
      'border-width': 4,
      'border-color': '#111827',
      'overlay-color': '#111827',
      'overlay-opacity': 0.08,
    },
  },
  {
    selector: '.selected-node',
    style: {
      'border-width': 5,
      'border-color': '#f8fafc',
      'shadow-color': '#0f172a',
      'shadow-opacity': 0.25,
      'shadow-blur': 18,
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

    const layoutName = graph.focus_node_ids.length > 0 ? 'breadthfirst' : 'cose'
    cy.layout({
      name: layoutName,
      animate: false,
      fit: true,
      padding: 36,
      directed: true,
      spacingFactor: 1.25,
    }).run()
  }, [graph, selectedNodeId])

  return (
    <div className="graph-shell">
      <div className="graph-header">
        <div>
          <p className="eyebrow">Context Graph</p>
          <h2>Explore flow lineage, cancellations, and payment clearance paths</h2>
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
