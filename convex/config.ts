/**
 * Shared configuration + AI utilities for Convex backend
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Model Configuration
 * Haiku 4.5 — used for all endpoints (chat, study tools, games, exam brain)
 */
export const AI_MODEL = 'claude-haiku-4-5-20251001';

// ─── Shared Claude API Utility ──────────────────────────────

type MessageContent = string | Anthropic.Messages.ContentBlockParam[];

interface CallClaudeOptions {
  /** Model to use. Defaults to AI_MODEL (Haiku). */
  model?: string;
  maxTokens: number;
  temperature?: number;
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: MessageContent }>;
}

/**
 * Single entry point for all Anthropic API calls.
 * Handles client creation, API key validation, and response extraction.
 */
export async function callClaude(options: CallClaudeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: options.model ?? AI_MODEL,
    max_tokens: options.maxTokens,
    ...(options.temperature !== undefined && { temperature: options.temperature }),
    ...(options.system && { system: options.system }),
    messages: options.messages,
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
