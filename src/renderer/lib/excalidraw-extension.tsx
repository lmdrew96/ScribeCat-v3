import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import interact from 'interactjs';
import { Loader2 } from 'lucide-react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';

// Dynamically import Excalidraw
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((module) => ({ default: module.Excalidraw })),
);

interface ExcalidrawComponentProps {
  node: { attrs: { sceneData: string; width: number; height: number } };
  updateAttributes: (attrs: Partial<{ sceneData: string; width: number; height: number }>) => void;
}

function ExcalidrawComponent({ node, updateAttributes }: ExcalidrawComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: Excalidraw API types not available
  const [excalidrawAPI, setExcalidrawAPI] = useState<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || isEditing) return;

    const element = containerRef.current;

    const interactable = interact(element).resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      listeners: {
        move(event) {
          const target = event.target;
          const { width, height } = event.rect;

          target.style.width = `${width}px`;
          target.style.height = `${height}px`;

          const x = Number.parseFloat(target.getAttribute('data-x') || '0') + event.deltaRect.left;
          const y = Number.parseFloat(target.getAttribute('data-y') || '0') + event.deltaRect.top;

          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x.toString());
          target.setAttribute('data-y', y.toString());
        },
        end(event) {
          const target = event.target;
          const width = Number.parseInt(target.style.width);
          const height = Number.parseInt(target.style.height);
          const x = Number.parseFloat(target.getAttribute('data-x') || '0');
          const y = Number.parseFloat(target.getAttribute('data-y') || '0');
          updateAttributes({ width, height, x, y });
        },
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 300, height: 200 },
        }),
      ],
    });

    return () => {
      interactable.unset();
    };
  }, [updateAttributes, isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (excalidrawAPI) {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      updateAttributes({
        data: JSON.stringify({ elements, appState }),
      });
    }
    setIsEditing(false);
  };

  const { width, height, x, y, data } = node.attrs;
  let sceneData = { elements: [], appState: {} };

  if (data) {
    try {
      sceneData = JSON.parse(data);
    } catch (error) {
      console.error('Error parsing Excalidraw data:', error);
    }
  }

  return (
    <NodeViewWrapper className="excalidraw-wrapper" style={{ display: 'inline-block' }}>
      <div
        ref={containerRef}
        data-x={x || 0}
        data-y={y || 0}
        onDoubleClick={handleDoubleClick}
        style={{
          width: width ? `${width}px` : '600px',
          height: height ? `${height}px` : '400px',
          transform: `translate(${x || 0}px, ${y || 0}px)`,
          border: '2px solid var(--border)',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: 'var(--card)',
          transition: 'border-color 0.2s',
          position: 'relative',
        }}
        className="excalidraw-container"
        onMouseEnter={(e) => {
          if (!isEditing) {
            e.currentTarget.style.borderColor = 'var(--primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isEditing) {
            e.currentTarget.style.borderColor = 'var(--border)';
          }
        }}
      >
        {!isEditing && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: 'var(--muted-foreground)',
                backgroundColor: 'var(--background)',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              Double-click to edit
            </span>
          </div>
        )}

        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <Excalidraw
            initialData={sceneData}
            viewModeEnabled={!isEditing}
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            onChange={() => {
              if (isEditing && excalidrawAPI) {
                const elements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();
                updateAttributes({
                  data: JSON.stringify({ elements, appState }),
                });
              }
            }}
          />
        </Suspense>

        {isEditing && (
          <button
            type="button"
            onClick={handleBlur}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 10,
              padding: '4px 12px',
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            Done
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ExcalidrawNode = Node.create({
  name: 'excalidraw',

  group: 'block',

  draggable: false,

  addAttributes() {
    return {
      data: {
        default: null,
      },
      width: {
        default: 600,
      },
      height: {
        default: 400,
      },
      x: {
        default: 0,
      },
      y: {
        default: 0,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="excalidraw"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'excalidraw' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawComponent);
  },
});
