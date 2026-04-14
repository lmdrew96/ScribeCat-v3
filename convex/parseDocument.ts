/**
 * Document Parsing — Claude Vision API for extracting text from images and PDFs.
 * Supports handwritten notes, diagrams, whiteboard photos, and PDF documents.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ConvexError, v } from 'convex/values';
import { action } from './_generated/server';
import { AI_MODEL } from './config';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const SUPPORTED_PDF_TYPES = new Set(['application/pdf']);

const PARSE_PROMPT = `You are an expert at reading and transcribing documents. Analyze the uploaded file(s) and extract ALL text content.

INSTRUCTIONS:
1. **Handwritten text**: Transcribe exactly as written, preserving paragraph structure
2. **Typed/printed text**: Extract verbatim
3. **Diagrams/drawings**: Describe them in detail inside [DIAGRAM: ...] blocks
4. **Tables**: Reproduce using markdown table format
5. **Math/formulas**: Use LaTeX notation inside $...$ delimiters
6. **Multiple pages**: Process in order, separate with "---" between pages

OUTPUT FORMAT:
- Plain text with markdown formatting for structure
- Preserve the original organization (headings, bullet points, numbering)
- If text is unclear or illegible, mark it as [illegible] or [unclear: best guess]
- Do NOT add commentary, summaries, or interpretations — just extract what's there`;

/** Convert ArrayBuffer to base64 using web-standard APIs (no Node.js Buffer needed) */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Process in chunks to avoid stack overflow on large files
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

export const parseDocumentImages = action({
  args: {
    storageIds: v.array(v.string()),
    mimeTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ConvexError('ANTHROPIC_API_KEY not configured');
    }

    if (args.storageIds.length === 0) {
      throw new ConvexError('No files provided');
    }

    if (args.storageIds.length !== args.mimeTypes.length) {
      throw new ConvexError('storageIds and mimeTypes must have the same length');
    }

    const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

    // Fetch each file from Convex storage and convert to base64
    for (let i = 0; i < args.storageIds.length; i++) {
      const storageId = args.storageIds[i];
      const mimeType = args.mimeTypes[i];

      console.log(
        `[parseDocument] Fetching file ${i + 1}/${args.storageIds.length}, type: ${mimeType}`,
      );

      const url = await ctx.storage.getUrl(storageId);
      if (!url) {
        throw new ConvexError(`Failed to get storage URL for file ${i + 1}`);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new ConvexError(`Failed to fetch file ${i + 1}: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`[parseDocument] File ${i + 1} fetched: ${arrayBuffer.byteLength} bytes`);

      const base64Data = toBase64(arrayBuffer);

      if (SUPPORTED_PDF_TYPES.has(mimeType)) {
        contentBlocks.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        });
      } else if (SUPPORTED_IMAGE_TYPES.has(mimeType)) {
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as ImageMediaType,
            data: base64Data,
          },
        });
      } else {
        throw new ConvexError(`Unsupported file type: ${mimeType}`);
      }
    }

    // Add the text prompt after all file blocks
    contentBlocks.push({ type: 'text', text: PARSE_PROMPT });

    console.log(`[parseDocument] Calling Claude API with ${contentBlocks.length} content blocks`);

    try {
      const anthropic = new Anthropic({ apiKey });

      const message = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 8192,
        messages: [{ role: 'user', content: contentBlocks }],
      });

      const extractedText = message.content[0].type === 'text' ? message.content[0].text : '';
      console.log(`[parseDocument] Extracted ${extractedText.length} chars`);

      if (!extractedText) {
        throw new ConvexError('Claude returned empty text — the document may be unreadable');
      }

      return {
        text: extractedText,
        success: true,
      };
    } catch (error: unknown) {
      console.error('[parseDocument] Anthropic API error:', error);
      if (error instanceof ConvexError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown API error';
      throw new ConvexError(`Failed to parse document: ${message}`);
    }
  },
});
