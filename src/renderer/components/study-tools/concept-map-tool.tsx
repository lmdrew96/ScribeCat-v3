/**
 * Concept Map Tool — AI-generated visual concept hierarchy rendered as SVG
 * Uses a tree layout: children positioned below their parent nodes.
 */

import type { ConceptMapResult } from '@/types/study-tools';
import { useMemo } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { GenerateButton } from './generate-button';
import { useStudyTool } from './use-study-tool';

interface ConceptMapToolProps {
  sessionId: Id<'sessions'>;
}

interface LayoutNode {
  id: string;
  label: string;
  type: 'main' | 'sub' | 'detail';
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- Layout constants ---
const NODE_HEIGHT: Record<string, number> = { main: 44, sub: 38, detail: 34 };
const FONT_SIZE: Record<string, number> = { main: 13, sub: 11, detail: 10 };
const PAD_X = 20;
const V_GAP = 52;
const H_GAP = 20;
const CANVAS_PAD = 24;

/** Approximate node width from label text */
function measureWidth(label: string, type: string): number {
  const fontSize = FONT_SIZE[type] || 11;
  const charW = fontSize * 0.6;
  return Math.max(100, Math.ceil(label.length * charW) + PAD_X * 2);
}

/** Build tree layout from concept map data */
function layoutTree(data: ConceptMapResult): {
  nodes: LayoutNode[];
  width: number;
  height: number;
} {
  if (data.nodes.length === 0) return { nodes: [], width: 400, height: 200 };

  const nodeInfo = new Map(data.nodes.map((n) => [n.id, n]));

  // Build parent → children adjacency (first edge wins for tree structure)
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();

  for (const edge of data.edges) {
    if (!nodeInfo.has(edge.from) || !nodeInfo.has(edge.to)) continue;
    if (parentOf.has(edge.to)) continue; // already has a tree parent
    if (!childrenOf.has(edge.from)) childrenOf.set(edge.from, []);
    childrenOf.get(edge.from)!.push(edge.to);
    parentOf.set(edge.to, edge.from);
  }

  // Roots = nodes with no parent
  let roots = data.nodes.filter((n) => !parentOf.has(n.id));
  if (roots.length === 0) roots = [data.nodes[0]];

  // Memoized subtree width computation
  const widthCache = new Map<string, number>();
  function getSubtreeWidth(nodeId: string): number {
    if (widthCache.has(nodeId)) return widthCache.get(nodeId)!;
    const node = nodeInfo.get(nodeId);
    if (!node) return 0;
    const nodeW = measureWidth(node.label, node.type);
    const children = childrenOf.get(nodeId) || [];
    if (children.length === 0) {
      widthCache.set(nodeId, nodeW);
      return nodeW;
    }
    const childrenW =
      children.reduce((sum, cid) => sum + getSubtreeWidth(cid), 0) + (children.length - 1) * H_GAP;
    const w = Math.max(nodeW, childrenW);
    widthCache.set(nodeId, w);
    return w;
  }

  // Position nodes recursively
  const positioned: LayoutNode[] = [];
  const visited = new Set<string>();

  function positionSubtree(nodeId: string, x: number, y: number, availW: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeInfo.get(nodeId);
    if (!node) return;
    const w = measureWidth(node.label, node.type);
    const h = NODE_HEIGHT[node.type] || 38;

    positioned.push({
      id: node.id,
      label: node.label,
      type: node.type,
      x: x + (availW - w) / 2,
      y,
      width: w,
      height: h,
    });

    const children = childrenOf.get(nodeId) || [];
    if (children.length === 0) return;

    const childWidths = children.map((cid) => getSubtreeWidth(cid));
    const totalChildW = childWidths.reduce((a, b) => a + b, 0) + (children.length - 1) * H_GAP;
    let childX = x + (availW - totalChildW) / 2;

    for (let i = 0; i < children.length; i++) {
      positionSubtree(children[i], childX, y + h + V_GAP, childWidths[i]);
      childX += childWidths[i] + H_GAP;
    }
  }

  // Lay out roots side by side
  const rootWidths = roots.map((r) => getSubtreeWidth(r.id));
  const totalRootW = rootWidths.reduce((a, b) => a + b, 0) + (roots.length - 1) * H_GAP * 2;

  let rx = CANVAS_PAD;
  for (let i = 0; i < roots.length; i++) {
    positionSubtree(roots[i].id, rx, CANVAS_PAD, rootWidths[i]);
    rx += rootWidths[i] + H_GAP * 2;
  }

  const maxX = Math.max(...positioned.map((n) => n.x + n.width), 400);
  const maxY = Math.max(...positioned.map((n) => n.y + n.height), 200);

  return {
    nodes: positioned,
    width: Math.max(totalRootW + CANVAS_PAD * 2, maxX + CANVAS_PAD),
    height: maxY + CANVAS_PAD,
  };
}

// --- Component ---

export function ConceptMapTool({ sessionId }: ConceptMapToolProps) {
  const { data, isGenerating, error, generate, hasData } = useStudyTool<ConceptMapResult>(
    sessionId,
    'conceptMap',
  );

  const layout = useMemo(() => {
    if (!data) return { nodes: [], width: 400, height: 200 };
    return layoutTree(data);
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

  const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));

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

      <div className="overflow-auto rounded-lg border border-[var(--glass-border)]">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block"
          role="img"
          aria-label="Concept map showing relationships between session topics"
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
                  stroke="color-mix(in srgb, var(--primary) 35%, transparent)"
                  strokeWidth="2"
                />
                {edge.label && (
                  <text
                    x={(x1 + x2) / 2}
                    y={midY - 6}
                    textAnchor="middle"
                    fill="var(--muted-foreground)"
                    fontSize="9"
                    fontStyle="italic"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {layout.nodes.map((node) => {
            const fontSize = FONT_SIZE[node.type] || 11;
            const isMain = node.type === 'main';
            const isSub = node.type === 'sub';
            const rx = isMain ? node.height / 2 : 8;

            return (
              <g key={node.id}>
                {/* Shadow for depth */}
                <rect
                  x={node.x + 1}
                  y={node.y + 2}
                  width={node.width}
                  height={node.height}
                  rx={rx}
                  fill="color-mix(in srgb, var(--foreground) 8%, transparent)"
                />
                {/* Node background */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={rx}
                  fill={isMain ? 'var(--primary)' : 'var(--card)'}
                  stroke={isMain ? 'var(--primary)' : 'var(--border)'}
                  strokeWidth={isMain ? 0 : 1}
                />
                {/* Label */}
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={
                    isMain
                      ? 'var(--primary-foreground)'
                      : isSub
                        ? 'var(--card-foreground)'
                        : 'var(--muted-foreground)'
                  }
                  fontSize={fontSize}
                  fontWeight={isMain ? 700 : isSub ? 500 : 400}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
