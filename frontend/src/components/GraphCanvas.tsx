import { useEffect, useRef, useState } from 'react'
import cytoscape, { type Core } from 'cytoscape'

import type { GraphPayload } from '../types'

type GraphCanvasProps = {
  graph: GraphPayload
  selectedNodeId: string | null
  onResetGraph: () => void
  onSelectNode: (nodeId: string) => void
}

type HoverCard = {
  nodeId: string
  label: string
  subtitle: string | null
  nodeType: string
  degree: number
  x: number
  y: number
}

const graphStylesheet: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#20324f',
      color: '#f8fafc',
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': 108,
      'font-family': '"Manrope", sans-serif',
      'font-size': 11,
      'font-weight': 700,
      'text-valign': 'center',
      'text-halign': 'center',
      width: 52,
      height: 52,
      'border-width': 1.5,
      'border-color': 'rgba(255, 255, 255, 0.88)',
      'shadow-color': 'rgba(76, 95, 130, 0.16)',
      'shadow-opacity': 0.28,
      'shadow-blur': 18,
      'shadow-offset-x': 0,
      'shadow-offset-y': 8,
      'transition-property': 'background-color, border-color, border-width, width, height, opacity, shadow-blur, shadow-opacity',
      'transition-duration': '180ms',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.2,
      'line-color': 'rgba(125, 141, 167, 0.34)',
      'target-arrow-color': 'rgba(125, 141, 167, 0.42)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      opacity: 0.62,
      'arrow-scale': 0.8,
      'transition-property': 'line-color, target-arrow-color, opacity, width',
      'transition-duration': '180ms',
    },
  },
  { selector: '.customer', style: { 'background-color': '#5f728e' } },
  { selector: '.sales_order', style: { 'background-color': '#152238' } },
  { selector: '.sales_order_item', style: { 'background-color': '#74849b', width: 40, height: 40 } },
  { selector: '.schedule_summary', style: { 'background-color': '#a9b7c8', color: '#172033', width: 38, height: 38 } },
  { selector: '.delivery', style: { 'background-color': '#2d598d' } },
  { selector: '.delivery_item', style: { 'background-color': '#9bb5d2', color: '#18212f', width: 38, height: 38 } },
  { selector: '.billing_document', style: { 'background-color': '#384c93' } },
  { selector: '.billing_item', style: { 'background-color': '#a7b0db', color: '#18212f', width: 38, height: 38 } },
  { selector: '.accounting_document', style: { 'background-color': '#415468' } },
  { selector: '.payment_document', style: { 'background-color': '#2d7b76' } },
  { selector: '.product', style: { 'background-color': '#586a7a' } },
  { selector: '.plant', style: { 'background-color': '#66758a' } },
  { selector: '.address', style: { 'background-color': '#d6dee8', color: '#172033', width: 36, height: 36 } },
  {
    selector: '.focus',
    style: {
      'border-width': 3.6,
      'border-color': '#0f172a',
      'overlay-color': '#93c5fd',
      'overlay-opacity': 0.04,
    },
  },
  {
    selector: '.selected-node',
    style: {
      'border-width': 4.6,
      'border-color': '#0f172a',
      'shadow-color': 'rgba(59, 130, 246, 0.28)',
      'shadow-opacity': 0.38,
      'shadow-blur': 28,
      'shadow-offset-x': 0,
      'shadow-offset-y': 10,
    },
  },
  {
    selector: '.hover-node',
    style: {
      width: 60,
      height: 60,
      'border-width': 3.8,
      'border-color': '#2563eb',
      'shadow-color': 'rgba(59, 130, 246, 0.3)',
      'shadow-opacity': 0.44,
      'shadow-blur': 34,
      'shadow-offset-x': 0,
      'shadow-offset-y': 12,
      'z-index': 10,
    },
  },
  {
    selector: '.hover-neighbor',
    style: {
      opacity: 0.94,
      'border-width': 2.4,
      'border-color': 'rgba(37, 99, 235, 0.36)',
    },
  },
  {
    selector: '.hover-edge',
    style: {
      width: 2.2,
      opacity: 0.96,
      'line-color': 'rgba(59, 130, 246, 0.88)',
      'target-arrow-color': 'rgba(59, 130, 246, 0.9)',
    },
  },
  {
    selector: '.dimmed',
    style: {
      opacity: 0.12,
    },
  },
]

function formatNodeType(value: string | null | undefined) {
  if (!value) {
    return 'Business entity'
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function GraphCanvas({ graph, selectedNodeId, onResetGraph, onSelectNode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  const onSelectRef = useRef(onSelectNode)
  const hoveredNodeIdRef = useRef<string | null>(null)
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelectNode
  }, [onSelectNode])

  const clearHoverState = () => {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    cy.batch(() => {
      cy.elements().removeClass('dimmed hover-node hover-neighbor hover-edge')
    })

    hoveredNodeIdRef.current = null
    setHoverCard(null)
  }

  const syncHoverCard = (node: any) => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const data = node.data()
    const renderedPosition = node.renderedPosition()
    const width = container.clientWidth
    const height = container.clientHeight

    setHoverCard({
      nodeId: node.id(),
      label: String(data.label ?? node.id()),
      subtitle: data.subtitle ? String(data.subtitle) : null,
      nodeType: formatNodeType(data.nodeType ? String(data.nodeType) : undefined),
      degree: node.connectedEdges().length,
      x: clamp(renderedPosition.x + 18, 18, Math.max(18, width - 274)),
      y: clamp(renderedPosition.y - 22, 18, Math.max(18, height - 164)),
    })
  }

  const applyHoverState = (node: any) => {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    cy.batch(() => {
      cy.elements().removeClass('dimmed hover-node hover-neighbor hover-edge')
      cy.elements().addClass('dimmed')

      const connectedEdges = node.connectedEdges()
      const neighborhoodNodes = node.neighborhood('node')
      const visibleElements = node.closedNeighborhood()

      visibleElements.removeClass('dimmed')
      neighborhoodNodes.addClass('hover-neighbor')
      connectedEdges.addClass('hover-edge')
      node.removeClass('dimmed')
      node.addClass('hover-node')
    })

    hoveredNodeIdRef.current = node.id()
    syncHoverCard(node)
  }

  const fitGraph = () => {
    cyRef.current?.fit(undefined, 56)
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
      cy.fit(cy.collection(focusElements), 92)
      return
    }

    cy.fit(undefined, 56)
  }

  const exportPng = () => {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    const dataUrl = cy.png({
      bg: '#f4f7fb',
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
      wheelSensitivity: 0.16,
      minZoom: 0.28,
      maxZoom: 2.4,
      motionBlur: true,
      textureOnViewport: true,
      hideEdgesOnViewport: false,
    })

    const handleTapNode = (event: any) => {
      const nodeId = event.target.id()
      onSelectRef.current(nodeId)
    }

    const handleHoverNode = (event: any) => {
      applyHoverState(event.target)
    }

    const handleMoveNode = (event: any) => {
      if (hoveredNodeIdRef.current === event.target.id()) {
        syncHoverCard(event.target)
      }
    }

    const handleExitNode = () => {
      clearHoverState()
    }

    const handleViewportChange = () => {
      if (!hoveredNodeIdRef.current) {
        return
      }

      const node = cy.getElementById(hoveredNodeIdRef.current)
      if (node.length === 0) {
        clearHoverState()
        return
      }

      syncHoverCard(node)
    }

    const handleResize = () => {
      cy.resize()
      handleViewportChange()
    }

    cy.on('tap', 'node', handleTapNode)
    cy.on('mouseover', 'node', handleHoverNode)
    cy.on('mousemove', 'node', handleMoveNode)
    cy.on('mouseout', 'node', handleExitNode)
    cy.on('tap', (event) => {
      if (event.target === cy) {
        clearHoverState()
      }
    })
    cy.on('pan zoom drag free', handleViewportChange)
    window.addEventListener('resize', handleResize)

    cyRef.current = cy

    return () => {
      window.removeEventListener('resize', handleResize)
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
      cy.elements().removeClass('focus selected-node dimmed hover-node hover-neighbor hover-edge')

      graph.focus_node_ids.forEach((nodeId) => {
        cy.getElementById(nodeId).addClass('focus')
      })

      if (selectedNodeId) {
        cy.getElementById(selectedNodeId).addClass('selected-node')
      }
    })

    const useStructuredTraceLayout =
      graph.focus_node_ids.length === 1 &&
      graph.nodes.length <= 18 &&
      graph.edges.length <= 24

    const layout = cy.layout(
      useStructuredTraceLayout
        ? {
            name: 'breadthfirst',
            animate: true,
            animationDuration: 280,
            fit: true,
            directed: true,
            padding: 64,
            spacingFactor: 1.55,
            roots: graph.focus_node_ids,
            nodeDimensionsIncludeLabels: true,
          }
        : {
            name: 'cose',
            animate: true,
            animationDuration: 320,
            fit: true,
            padding: 64,
            randomize: false,
            nodeDimensionsIncludeLabels: true,
            componentSpacing: 120,
            nodeRepulsion: 240000,
            idealEdgeLength: 110,
            edgeElasticity: 120,
            nestingFactor: 0.9,
            gravity: 0.42,
            numIter: 850,
            initialTemp: 180,
            coolingFactor: 0.96,
            minTemp: 1.0,
          },
    )

    layout.run()

    if (hoveredNodeIdRef.current) {
      const hoveredNode = cy.getElementById(hoveredNodeIdRef.current)
      if (hoveredNode.length > 0) {
        applyHoverState(hoveredNode)
      } else {
        clearHoverState()
      }
    }
  }, [graph, selectedNodeId])

  return (
    <div className="graph-shell">
      <div className="graph-header">
        <div>
          <p className="eyebrow">Context Map</p>
          <h2>Follow the entities behind each answer</h2>
          <p className="panel-subcopy">
            Hover to preview relationships, click to inspect an entity, and keep the graph centered on the business
            objects behind the answer.
          </p>
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

      <div className="graph-stage">
        <div className="graph-canvas" ref={containerRef} />

        <div className="graph-overlay graph-overlay-top">
          <div className="graph-legend">
            <span>
              <i className="legend-dot focus" />
              Focused
            </span>
            <span>
              <i className="legend-dot selected" />
              Selected
            </span>
            <span>
              <i className="legend-dot neighbor" />
              Hover preview
            </span>
          </div>
        </div>

        <div className="graph-overlay graph-overlay-bottom">
          <p className="graph-helper">
            Scroll to zoom. Drag the canvas to pan. Hover any node to reveal nearby relationships before committing to a
            deeper inspection.
          </p>
        </div>

        {hoverCard ? (
          <div className="graph-tooltip" style={{ left: hoverCard.x, top: hoverCard.y }}>
            <p className="graph-tooltip-type">{hoverCard.nodeType}</p>
            <h3>{hoverCard.label}</h3>
            {hoverCard.subtitle ? <p className="graph-tooltip-subtitle">{hoverCard.subtitle}</p> : null}
            <div className="graph-tooltip-meta">
              <span>{hoverCard.nodeId}</span>
              <span>{hoverCard.degree} linked edges</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
