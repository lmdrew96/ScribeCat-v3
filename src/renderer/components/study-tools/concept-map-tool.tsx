/**
 * Concept Map Tool — AI-generated visual concept hierarchy rendered as SVG
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import type { ConceptMapResult } from '@/types/study-tools';
import { useMemo } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { GenerateButton } from './generate-button';
import { useStudyTool } from './use-study-tool';

interface ConceptMapToolProps {
  sessionId: Id<'sessions'>;
}

interface PositionedNode {
  id: string;
  label: string;
  type: 'main' | 'sub' | 'detail';
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  main: {
    fill: 'hsl(var(--primary))',
    stroke: 'hsl(var(--primary))',
    text: 'hsl(var(--primary-foreground))',
  },
  sub: {
    fill: 'hsl(var(--secondary))',
    stroke: 'hsl(var(--border))',
    text: 'hsl(var(--secondary-foreground))',
  },
  detail: {
    fill: 'hsl(var(--muted))',
    stroke: 'hsl(var(--border))',
    text: 'hsl(var(--muted-foreground))',
  },
};

function layoutNodes(data: ConceptMapResult): PositionedNode[] {
  const mainNodes = data.nodes.filter((n) => n.type === 'main');
  const subNodes = data.nodes.filter((n) => n.type === 'sub');
  const detailNodes = data.nodes.filter((n) => n.type === 'detail');

  const nodeWidth = 120;
  const nodeHeight = 36;
  const hGap = 40;
  const vGap = 60;

  const positioned: PositionedNode[] = [];

  // Row 1: main nodes
  const mainRowWidth = mainNodes.length * nodeWidth + (mainNodes.length - 1) * hGap;
  const mainStartX = Math.max(0, (600 - mainRowWidth) / 2);
  for (let i = 0; i < mainNodes.length; i++) {
    positioned.push({
      ...mainNodes[i],
      x: mainStartX + i * (nodeWidth + hGap),
      y: 20,
      width: nodeWidth,
      height: nodeHeight,
    });
  }

  // Row 2: sub nodes
  const subRowWidth = subNodes.length * nodeWidth + (subNodes.length - 1) * hGap;
  const subStartX = Math.max(0, (600 - subRowWidth) / 2);
  for (let i = 0; i < subNodes.length; i++) {
    positioned.push({
      ...subNodes[i],
      x: subStartX + i * (nodeWidth + hGap),
      y: 20 + nodeHeight + vGap,
      width: nodeWidth,
      height: nodeHeight,
    });
  }

  // Row 3: detail nodes
  const detailRowWidth = detailNodes.length * nodeWidth + (detailNodes.length - 1) * hGap;
  const detailStartX = Math.max(0, (600 - detailRowWidth) / 2);
  for (let i = 0; i < detailNodes.length; i++) {
    positioned.push({
      ...detailNodes[i],
      x: detailStartX + i * (nodeWidth + hGap),
      y: 20 + 2 * (nodeHeight + vGap),
      width: nodeWidth,
      height: nodeHeight,
    });
  }

  return positioned;
}

export function ConceptMapTool({ sessionId }: ConceptMapToolProps) {
  const { data, isGenerating, error, generate, hasData } = useStudyTool<ConceptMapResult>(
    sessionId,
    'conceptMap',
  );

  const { nodes, totalWidth, totalHeight } = useMemo(() => {
    if (!data) return { nodes: [], totalWidth: 600, totalHeight: 300 };
    const positioned = layoutNodes(data);
    const maxX = Math.max(...positioned.map((n) => n.x + n.width), 600);
    const maxY = Math.max(...positioned.map((n) => n.y + n.height), 200);
    return {
      nodes: positioned,
      totalWidth: maxX + 40,
      totalHeight: maxY + 40,
    };
  }, [data]);

  if (!data || isGenerating || error) {
    return (
      <GenerateButton
        onGenerate={generate}
        isGenerating={isGenerating}
        hasData={hasData}
        error={error}
        label="Generate Concept Map"
        description="Visualize how concepts relate to each other."
      />
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {data.nodes.length} concepts &middot; {data.edges.length} connections
        </span>
        <GenerateButton
          onGenerate={generate}
          isGenerating={isGenerating}
          hasData={hasData}
          error={error}
        />
      </div>

      <ScrollArea className="rounded border border-border">
        <svg
          width="100%"
          height={Math.min(totalHeight, 250)}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="bg-background"
          role="img"
          aria-label="Concept map showing relationships between lecture topics"
        >
          {/* Edges */}
          {data.edges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;

            const x1 = from.x + from.width / 2;
            const y1 = from.y + from.height;
            const x2 = to.x + to.width / 2;
            const y2 = to.y;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                />
                {edge.label && (
                  <text
                    x={(x1 + x2) / 2}
                    y={midY - 4}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize="8"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const colors = NODE_COLORS[node.type] || NODE_COLORS.detail;
            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx="6"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="1"
                />
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.text}
                  fontSize="9"
                  fontWeight={node.type === 'main' ? 600 : 400}
                >
                  {node.label.length > 16 ? `${node.label.slice(0, 14)}...` : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </ScrollArea>
    </div>
  );
}
