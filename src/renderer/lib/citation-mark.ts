/**
 * CitationMark - TipTap Mark extension for transcript citations
 * Wraps text with a citation that links back to a transcript timestamp.
 * Clicking a citation in the study view seeks audio to that moment.
 */

import { Mark, mergeAttributes } from '@tiptap/core';

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const CitationMark = Mark.create({
  name: 'citation',

  addAttributes() {
    return {
      timestamp: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-timestamp');
          return val ? Number.parseInt(val, 10) : null;
        },
        renderHTML: (attributes) => ({
          'data-timestamp': attributes.timestamp,
        }),
      },
      segmentText: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-segment-text') || '',
        renderHTML: (attributes) => ({
          'data-segment-text': attributes.segmentText,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-citation]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const timestamp = HTMLAttributes['data-timestamp'];
    const title = timestamp ? `@ ${formatTimestamp(timestamp)} — click to hear` : 'Citation';

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-citation': '',
        class: 'citation-mark',
        title,
      }),
      0,
    ];
  },
});
