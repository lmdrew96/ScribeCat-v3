import { R2 } from '@convex-dev/r2';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { requireAuth } from './authHelpers';

/**
 * Central R2 client — backs all file storage (audio, editor images, parsed
 * documents). Reads bucket/credentials from R2_BUCKET, R2_ENDPOINT,
 * R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars set on the Convex deployment.
 */
export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata, getMetadata } = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await requireAuth(ctx);
  },
});
