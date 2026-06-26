import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

export const CREDENTIALS_BUCKET = env.SUPABASE_BUCKET;

/**
 * Upload an encrypted file to Supabase Storage
 */
export async function uploadFile(
  userId: string,
  credentialId: string,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  const ext = originalName.split('.').pop();
  const path = `${userId}/${credentialId}.${ext}`;

  const { error } = await supabase.storage
    .from(CREDENTIALS_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  // Return signed URL (1 year)
  const { data: signedData, error: signError } = await supabase.storage
    .from(CREDENTIALS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signError) throw new Error(`Failed to create signed URL: ${signError.message}`);
  return signedData.signedUrl;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(userId: string, credentialId: string): Promise<void> {
  const { data: files } = await supabase.storage
    .from(CREDENTIALS_BUCKET)
    .list(`${userId}/`, { search: credentialId });

  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from(CREDENTIALS_BUCKET).remove(paths);
  }
}
