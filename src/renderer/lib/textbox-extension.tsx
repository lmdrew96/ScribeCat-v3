import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import interact from 'interactjs';
import { useEffect, useRef } from 'react';

interface TextBoxComponentProps {
  node: { attrs: { content: string; x: number; y: number; width: number; height: number } };
  updateAttributes: (
    attrs: Partial<{ content: string; x: number; y: number; width: number; height: number }>,
  ) => void;
}

function TextBoxComponent({ node, updateAttributes }: TextBoxComponentProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boxRef.current) return;

    const element = boxRef.current;

    const interactable = interact(element)
      .draggable({
        inertia: true,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: 'parent',
            endOnly: true,
          }),
        ],
        autoScroll: true,
        listeners: {
          start(event) {
            const target = event.target;
            const x = Number.parseFloat(target.getAttribute('data-x') || '0');
            const y = Number.parseFloat(target.getAttribute('data-y') || '0');
            target.style.transform = `translate(${x}px, ${y}px)`;
          },
          move(event) {
            const target = event.target;
            const x = Number.parseFloat(target.getAttribute('data-x') || '0') + event.dx;
            const y = Number.parseFloat(target.getAttribute('data-y') || '0') + event.dy;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x.toString());
            target.setAttribute('data-y', y.toString());
          },
          end(event) {
            const target = event.target;
            const x = Number.parseFloat(target.getAttribute('data-x') || '0');
            const y = Number.parseFloat(target.getAttribute('data-y') || '0');
            updateAttributes({ x, y });
          },
        },
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
          move(event) {
            const target = event.target;
            const { width, height } = event.rect;

            target.style.width = `${width}px`;
            target.style.height = `${height}px`;

            const x =
              Number.parseFloat(target.getAttribute('data-x') || '0') + event.deltaRect.left;
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
            min: { width: 100, height: 50 },
          }),
        ],
      });

    return () => {
      interactable.unset();
    };
  }, [updateAttributes]);

  const { content, width, height, x, y } = node.attrs;

  return (
    <NodeViewWrapper className="textbox-wrapper" style={{ display: 'inline-block' }}>
      <div
        ref={boxRef}
        data-x={x || 0}
        data-y={y || 0}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          updateAttributes({ content: e.currentTarget.textContent });
        }}
        style={{
          width: width ? `${width}px` : '200px',
          height: height ? `${height}px` : '100px',
          transform: `translate(${x || 0}px, ${y || 0}px)`,
          cursor: 'move',
          border: '2px solid var(--border)',
          borderRadius: '4px',
          padding: '8px',
          backgroundColor: 'var(--card)',
          color: 'var(--foreground)',
          overflow: 'auto',
          transition: 'border-color 0.2s',
        }}
        className="textbox"
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        {content || 'Enter text...'}
      </div>
    </NodeViewWrapper>
  );
}

export const TextBox = Node.create({
  name: 'textBox',

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
      width: {
        default: 200,
      },
      height: {
        default: 100,
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
        tag: 'div[data-type="textbox"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'textbox' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TextBoxComponent);
  },
});
