/**
 * Shared configuration + AI utilities for Convex backend
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Model Configuration
 * Haiku 4.5 — fast, cost-effective for per-message chat, study tools, games
 * Sonnet 5  — higher capability for session indexing (exam room brain)
 */
export const AI_MODEL = 'claude-haiku-4-5-20251001';
export const AI_MODEL_SONNET = 'claude-sonnet-5';

// ─── Shared Claude API Utility ──────────────────────────────

type MessageContent = string | Anthropic.Messages.ContentBlockParam[];

/**
 * A plain string, or structured blocks when part of the prompt should be cached.
 *
 * Caching is a strict PREFIX match: any byte change invalidates everything after
 * it. So a block carrying `cache_control` must be preceded only by content that
 * is stable across calls, and anything volatile (timestamps, per-request values)
 * has to come after it. Getting that order wrong doesn't error — it silently
 * yields a 0% hit rate and costs MORE than not caching, since writes bill at
 * ~1.25x.
 */
type SystemPrompt = string | Anthropic.Messages.TextBlockParam[];

interface CallClaudeOptions {
  /** Model to use. Defaults to AI_MODEL (Haiku). */
  model?: string;
  maxTokens: number;
  temperature?: number;
  system?: SystemPrompt;
  messages: Array<{ role: 'user' | 'assistant'; content: MessageContent }>;
  /**
   * Receives the response's token usage. Mainly for confirming a cache is
   * actually working — `cache_read_input_tokens` stuck at 0 across repeated
   * calls means something in the prefix is still varying.
   */
  onUsage?: (usage: Anthropic.Messages.Usage) => void;
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

  options.onUsage?.(response.usage);

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
