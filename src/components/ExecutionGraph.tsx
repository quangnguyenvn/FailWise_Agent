import { useEffect, useMemo, useState } from 'react';
import type { WheelEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type NodeMouseHandler,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import { buildEdges, buildNodes, statusTone } from '../graphConfig';
import type { AgentRunResult, GraphNodeId, NodeStatus } from '../types';
import { AgentNode } from './AgentNode';

interface ExecutionGraphProps {
  run: AgentRunResult;
  selectedNodeId: GraphNodeId;
  onSelectNode: (id: GraphNodeId) => void;
}

export function ExecutionGraph({ run, selectedNodeId, onSelectNode }: ExecutionGraphProps) {
  const initialNodes = useMemo(() => buildNodes(run.nodeDetails), [run]);
  const initialEdges = useMemo(() => buildEdges(run.edgeStates), [run]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isGraphInteractive, setIsGraphInteractive] = useState(false);
  const nodeTypes = useMemo(() => ({ agentNode: AgentNode }), []);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setEdges, setNodes]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onSelectNode(node.id as GraphNodeId);
  };

  const handleGraphWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsGraphInteractive(false);
    window.scrollBy({ left: event.deltaX, top: event.deltaY, behavior: 'auto' });
  };

  return (
    <section className="panel graph-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Runtime Trace</p>
          <h2>Failure-Aware Execution Graph</h2>
          <p>Follow the failing step, recovery policy, confidence impact, and trusted context state.</p>
        </div>
        <div className="legend" aria-label="Node status legend">
          {(['success', 'warning', 'failed', 'recovered', 'skipped'] as NodeStatus[]).map((status) => (
            <span key={status}>
              <i style={{ background: statusTone[status] }} />
              {status}
            </span>
          ))}
        </div>
      </div>
      <div
        className={`graph-shell ${isGraphInteractive ? 'graph-interactive' : ''}`}
        onMouseDownCapture={() => setIsGraphInteractive(true)}
        onWheelCapture={handleGraphWheel}
        onMouseLeave={() => setIsGraphInteractive(false)}
      >
        <div className="graph-interaction-hint">
          {isGraphInteractive ? 'Drag graph or use controls' : 'Click graph to drag; wheel scrolls page'}
        </div>
        <ReactFlow
          nodes={nodes.map((node) => ({
            ...node,
            className: `${node.className ?? ''} ${node.id === selectedNodeId ? 'node-selected' : ''}`,
          }))}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          zoomOnScroll={false}
          zoomOnPinch
          zoomOnDoubleClick={isGraphInteractive}
          panOnDrag={isGraphInteractive}
          nodesDraggable={isGraphInteractive}
          panOnScroll={false}
          nodesConnectable={false}
          minZoom={0.35}
          maxZoom={1.4}
        >
          <MiniMap
            nodeColor={(node) => {
              const status = run.nodeDetails[node.id as GraphNodeId]?.status ?? 'idle';
              return statusTone[status];
            }}
            pannable
            zoomable
          />
          <Controls />
          <Background gap={18} size={1} />
        </ReactFlow>
      </div>
    </section>
  );
}
