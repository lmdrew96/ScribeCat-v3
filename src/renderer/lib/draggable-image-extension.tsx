import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import interact from 'interactjs';
import { useEffect, useRef, useState } from 'react';

interface DraggableImageComponentProps {
  node: {
    attrs: {
      src: string;
      alt: string;
      title: string;
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  updateAttributes: (
    attrs: Partial<{
      src: string;
      alt: string;
      title: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
  ) => void;
}

function DraggableImageComponent({ node, updateAttributes }: DraggableImageComponentProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setIsAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setIsAltPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!imageRef.current) return;

    const element = imageRef.current;
    let initialWidth = 0;
    let initialHeight = 0;

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
          start(event) {
            initialWidth = event.rect.width;
            initialHeight = event.rect.height;
          },
          move(event) {
            const target = event.target;
            let { width, height } = event.rect;

            // Maintain aspect ratio unless Alt key is pressed
            if (!isAltPressed && initialWidth && initialHeight) {
              const aspectRatio = initialWidth / initialHeight;
              if (event.edges.right || event.edges.left) {
                height = width / aspectRatio;
              } else {
                width = height * aspectRatio;
              }
            }

            target.style.width = `${width}px`;
            target.style.height = `${height}px`;

            // Translate when resizing from top or left edges
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
            min: { width: 50, height: 50 },
          }),
        ],
      });

    return () => {
      interactable.unset();
    };
  }, [updateAttributes, isAltPressed]);

  const { src, alt, width, height, x, y } = node.attrs;

  return (
    <NodeViewWrapper className="draggable-image-wrapper" style={{ display: 'inline-block' }}>
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        data-x={x || 0}
        data-y={y || 0}
        style={{
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
          transform: `translate(${x || 0}px, ${y || 0}px)`,
          cursor: 'move',
          border: '2px solid transparent',
          transition: 'border-color 0.2s',
        }}
        className="draggable-image"
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'transparent';
        }}
      />
    </NodeViewWrapper>
  );
}

export const DraggableImage = Node.create({
  name: 'draggableImage',

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      x: {
        default: 0,
      },
      y: {
        default: 0,
      },
      storageId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-type="draggable-image"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { 'data-type': 'draggable-image' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DraggableImageComponent);
  },
});
