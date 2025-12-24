import '@xyflow/react/dist/style.css';

import type { Node, Edge, NodeTypes, Connection } from '@xyflow/react';

import React, { useRef, useCallback } from 'react';
import { Plus, Minus, Focus, Maximize2 } from 'lucide-react';
import {
  Panel,
  Controls,
  ReactFlow,
  Background,
  useReactFlow,
  BackgroundVariant,
} from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

// Import the enhanced FlowNode component
import FlowNode from './flow-node';
import { normalizeDisplayName } from '../../utils/agent';

interface FlowNodeData extends Record<string, unknown> {
  id: string;
  type: string;
  label: string;
  config: Record<string, any>;
  description?: string;
  icon?: any;
  inputs?: string[];
  outputs?: string[];
  isConfigured?: boolean;
}

interface NodeTemplate {
  type: string;
  label: string;
  description: string;
  icon: any;
  defaultConfig: Record<string, any>;
  inputs: string[];
  outputs: string[];
  category: 'inputs' | 'llm' | 'tools' | 'knowledge' | 'outputs' | 'agent';
}

interface FlowBuilderCanvasProps {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: any) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge<any>) => void;
  nodeTemplates: NodeTemplate[];
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node<FlowNodeData>[]>>;
  sidebarOpen: boolean;
  sidebarWidth: number;
  onNodeEdit?: (nodeId: string, data: any) => void;
  onNodeDelete?: (nodeId: string) => void;
}

// Enhanced Controls Component that uses ReactFlow context
const EnhancedControls: React.FC = () => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  return (
    <Controls
      className="[&>button]:bg-background [&>button]:border-border [&>button]:rounded-lg [&>button]:shadow-sm dark:[&>button]:shadow-[0_8px_32px_rgba(0,0,0,0.4)] [&>button]:backdrop-blur-sm [&>button]:p-1"
      style={{
        background: 'hsl(var(--background))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08), 0 4px 16px rgba(15, 23, 42, 0.04)',
        backdropFilter: 'blur(10px)',
        padding: '4px',
      }}
      showZoom={false}
      showFitView={false}
      showInteractive={false}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => zoomIn()}
            className={cn(
              'h-8 w-8 m-0.5 bg-transparent text-muted-foreground rounded-md',
              'hover:bg-primary/10 hover:text-primary hover:scale-110',
              'transition-all duration-200'
            )}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Zoom In</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => zoomOut()}
            className={cn(
              'h-8 w-8 m-0.5 bg-transparent text-muted-foreground rounded-md',
              'hover:bg-primary/10 hover:text-primary hover:scale-110',
              'transition-all duration-200'
            )}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Zoom Out</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fitView({ padding: 0.2 })}
            className={cn(
              'h-8 w-8 m-0.5 bg-transparent text-muted-foreground rounded-md',
              'hover:bg-primary/10 hover:text-primary hover:scale-110',
              'transition-all duration-200'
            )}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Fit View</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fitView({ padding: 0.1, includeHiddenNodes: false })}
            className={cn(
              'h-8 w-8 m-0.5 bg-transparent text-muted-foreground rounded-md',
              'hover:bg-primary/10 hover:text-primary hover:scale-110',
              'transition-all duration-200'
            )}
          >
            <Focus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Center View</p>
        </TooltipContent>
      </Tooltip>
    </Controls>
  );
};

const AgentBuilderCanvas: React.FC<FlowBuilderCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  nodeTemplates,
  onDrop,
  onDragOver,
  setNodes,
  sidebarOpen,
  sidebarWidth,
  onNodeEdit,
  onNodeDelete,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const FlowNodeWrapper = useCallback((props: any) => <FlowNode {...props} />, []);

  const nodeTypes: NodeTypes = {
    flowNode: FlowNodeWrapper,
  };

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      const template = nodeTemplates.find((t) => t.type === type);

      if (!template) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 130,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      const newNode: Node<FlowNodeData> = {
        id: `${type}-${Date.now()}`,
        type: 'flowNode',
        position,
        data: {
          id: `${type}-${Date.now()}`,
          type: template.type,
          label: normalizeDisplayName(template.label),
          description: template.description,
          icon: template.icon,
          config: {
            ...template.defaultConfig,
            // Add default approval config for tool nodes
            ...(template.type.startsWith('tool-') &&
              !template.type.startsWith('tool-group-') && {
                approvalConfig: {
                  requiresApproval: false,
                  approvers: { users: [], groups: [] },
                  approvalThreshold: 'single',
                  autoApprove: false,
                },
              }),
          },
          inputs: template.inputs,
          outputs: template.outputs,
          isConfigured: false,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, nodeTemplates]
  );

  return (
    <div
      className={cn(
        'flex-1 relative flex flex-col transition-all duration-300 h-full',
        sidebarOpen ? `w-[calc(100%-${sidebarWidth}px)]` : 'w-full'
      )}
    >
      {/* Enhanced React Flow Canvas */}
      <div
        ref={reactFlowWrapper}
        className={cn(
          'flex-1 w-full h-full min-h-0 relative',
          '[&_.react-flow__renderer]:dark:contrast-[1.05] [&_.react-flow__renderer]:dark:brightness-110',
          '[&_.react-flow__controls]:bottom-5 [&_.react-flow__controls]:left-5 [&_.react-flow__controls]:z-10',
          '[&_.react-flow__minimap]:bottom-5 [&_.react-flow__minimap]:right-5 [&_.react-flow__minimap]:z-10',
          '[&_.react-flow__background]:dark:opacity-20 [&_.react-flow__background]:opacity-50',
          '[&_.react-flow__edge-path]:stroke-2 [&_.react-flow__edge-path]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]',
          '[&_.react-flow__edge.selected_.react-flow__edge-path]:stroke-[3px]',
          '[&_.react-flow__edge.selected_.react-flow__edge-path]:drop-shadow-[0_2px_4px_hsl(var(--primary)/0.3)]',
          '[&_.react-flow__connectionline]:stroke-2 [&_.react-flow__connectionline]:stroke-dash-[5,5]',
          '[&_.react-flow__connectionline]:stroke-primary',
          '[&_.react-flow__connectionline]:drop-shadow-[0_2px_4px_hsl(var(--primary)/0.3)]'
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={handleDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.1,
            includeHiddenNodes: false,
            minZoom: 0.4,
            maxZoom: 1.5,
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          minZoom={0.3}
          maxZoom={2.0}
          snapToGrid
          snapGrid={[25, 25]}
          defaultEdgeOptions={{
            style: {
              strokeWidth: 3,
              stroke: 'hsl(var(--primary))',
              cursor: 'pointer',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))',
            },
            type: 'smoothstep',
            animated: false,
            interactionWidth: 30,
            // Remove arrowheads for cleaner tree appearance
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
          panOnScroll
          selectionOnDrag
          panOnDrag={[1, 2]}
          selectNodesOnDrag={false}
          proOptions={{ hideAttribution: true }}
        >
          {/* Enhanced Controls */}
          <EnhancedControls />

          {/* Enhanced Background */}
          <Background
            variant={BackgroundVariant.Dots}
            size={2}
            gap={20}
            className="opacity-50 dark:opacity-30"
          />

          {/* Status Panel */}
          <Panel position="top-left">
            <div
              className={cn(
                'px-4 py-2 backdrop-blur-md border border-border rounded-lg',
                'flex items-center gap-3',
                'shadow-[0_4px_16px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]',
                'bg-background/80'
              )}
            >
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full bg-green-500',
                  'shadow-[0_0_8px_hsl(142_76%_36%/0.6)]'
                )}
              />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Agent Builder
              </span>
              <span className="text-[0.7rem] text-muted-foreground ml-1">
                {nodes.length} nodes, {edges.length} connections
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default AgentBuilderCanvas;
