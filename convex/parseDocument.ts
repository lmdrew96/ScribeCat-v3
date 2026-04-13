/**
 * Document Parsing — Claude Vision API for extracting text from images and PDFs.
 * Supports handwritten notes, diagrams, whiteboard photos, and PDF documents.
 */

import Anthropic from '@anthropic-ai/sdk';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { AI_MODEL } from './config';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
]);

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

export const parseDocumentImages = action({
  args: {
    storageIds: v.array(v.string()),
    mimeTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    if (args.storageIds.length === 0) {
      throw new Error('No files provided');
    }

    if (args.storageIds.length !== args.mimeTypes.length) {
      throw new Error('storageIds and mimeTypes must have the same length');
    }

    // Fetch each file from storage and convert to base64
    const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

    for (let i = 0; i < args.storageIds.length; i++) {
      const storageId = args.storageIds[i];
      const mimeType = args.mimeTypes[i];

      const url = await ctx.storage.getUrl(storageId);
      if (!url) {
        throw new Error(`Failed to get URL for storage ID: ${storageId}`);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

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
        // HEIC gets re-mapped to jpeg (browsers convert on upload)
        const mediaType: ImageMediaType =
          mimeType === 'image/heic' ? 'image/jpeg' : (mimeType as ImageMediaType);

        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        });
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    }

    // Add the text prompt after all file blocks
    contentBlocks.push({ type: 'text', text: PARSE_PROMPT });

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const extractedText = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      text: extractedText,
      success: true,
    };
  },
});
