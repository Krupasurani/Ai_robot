import React from 'react';
import AgentBuilderCanvas from './canvas';
import FlowBuilderSidebar from './sidebar';
import type { AgentBuilderCanvasWrapperProps } from '../../types/agent';

const AgentBuilderCanvasWrapper: React.FC<AgentBuilderCanvasWrapperProps> = ({
  sidebarOpen,
  sidebarWidth,
  nodeTemplates,
  loading,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onDrop,
  onDragOver,
  setNodes,
  onNodeEdit,
  onNodeDelete,
}) => (
  <div className="flex-1 flex overflow-hidden min-h-0">
    <FlowBuilderSidebar
      sidebarOpen={sidebarOpen}
      nodeTemplates={nodeTemplates}
      loading={loading}
      sidebarWidth={sidebarWidth}
    />

    <AgentBuilderCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      nodeTemplates={nodeTemplates}
      onDrop={onDrop}
      onDragOver={onDragOver}
      setNodes={setNodes}
      sidebarOpen={sidebarOpen}
      sidebarWidth={sidebarWidth}
      onNodeEdit={onNodeEdit}
      onNodeDelete={onNodeDelete}
    />
  </div>
);

export default AgentBuilderCanvasWrapper;
