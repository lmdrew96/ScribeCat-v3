/**
 * Shared authentication helpers for Convex functions.
 * Extracts user identity from Clerk JWT tokens.
 */

import { ConvexError } from 'convex/values';

interface AuthContext {
  auth: {
    getUserIdentity: () => Promise<{
      subject: string;
      name?: string;
      pictureUrl?: string;
    } | null>;
  };
}

/**
 * Get the authenticated user's ID from the JWT token.
 * Throws ConvexError if not authenticated.
 */
export async function requireAuth(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  return identity.subject;
}

/**
 * Get the authenticated user's ID along with profile info from JWT claims.
 * Used for profile creation where we need the display name and avatar.
 */
export async function requireAuthWithProfile(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  return {
    userId: identity.subject,
    displayName: identity.name ?? 'Student',
    avatarUrl: identity.pictureUrl,
  };
}
