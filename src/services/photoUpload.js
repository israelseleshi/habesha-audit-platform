import { supabase } from '../lib/supabase';

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

export async function getCurrentPosition(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => resolve(null), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30000,
      }
    );
  });
}

export async function uploadAuditPhoto(file, auditId, itemKey) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  if (!file) {
    throw new Error('Photo file is required for upload.');
  }

  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

  if (Number(file.size || 0) > MAX_PHOTO_SIZE_BYTES) {
    throw new Error('Photo must be 10MB or smaller.');
  }

  const gps = await getCurrentPosition();
  const ext = file.name.split('.').pop();
  const datePath = new Date().toISOString().slice(0, 10);
  const path = `audits/${datePath}/${auditId}/${itemKey}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('audit-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from('audit-photos').getPublicUrl(path);

  return {
    photoUrl: urlData.publicUrl,
    lat: gps?.lat ?? null,
    lng: gps?.lng ?? null,
    accuracy: gps?.accuracy ?? null,
  };
}
