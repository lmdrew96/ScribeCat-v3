import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export function useApiKeys() {
  const keys = useQuery(api.apiKeys.list, {});
  const generateKey = useAction(api.apiKeys.generate);
  const revokeKey = useMutation(api.apiKeys.revoke);
  return { keys, generateKey, revokeKey };
}
