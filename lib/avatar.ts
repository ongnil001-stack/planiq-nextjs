import { createClient } from '@/lib/supabase/client';

const BUCKET = 'avatars';
const MAX_SIZE_MB = 5;

/**
 * Upload a profile picture to Supabase Storage.
 * Returns the public URL of the uploaded image, or throws on error.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image must be under ${MAX_SIZE_MB}MB.`);
  }

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Cache-bust so browser fetches fresh image immediately
  return `${data.publicUrl}?t=${Date.now()}`;
}
