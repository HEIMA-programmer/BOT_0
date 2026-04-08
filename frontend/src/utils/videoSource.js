/**
 * Helpers for deciding whether a video URL should be streamed through the
 * backend proxy (YouTube) or played directly (local mp4, bilibili iframe).
 */

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,20})/;

const BILIBILI_RE = /bilibili\.com|b23\.tv/i;

const VIDEO_FILE_RE = /\.(mp4|webm|mov|ogg|m4v)(\?|#|$)/i;

export function extractYouTubeId(url) {
  if (!url) return null;
  const match = String(url).match(YOUTUBE_ID_RE);
  return match ? match[1] : null;
}

export function isBilibiliUrl(url) {
  return !!url && BILIBILI_RE.test(String(url));
}

export function isDirectVideoUrl(url) {
  if (!url) return false;
  const s = String(url);
  if (VIDEO_FILE_RE.test(s)) return true;
  // Internal uploads or the backend proxy stream are treated as direct too.
  if (s.startsWith('/api/forum/uploads/')) return true;
  if (s.startsWith('/api/proxy/youtube/')) return true;
  return false;
}

/**
 * Convert a user-facing URL into something the HTML5 <video> tag can play.
 * Returns null when the URL cannot be proxied and must stay as an iframe
 * (e.g. bilibili).
 */
export function getProxiedVideoSrc(url) {
  const ytId = extractYouTubeId(url);
  if (ytId) return `/api/proxy/youtube/${ytId}/stream`;
  if (isDirectVideoUrl(url)) return url;
  if (isBilibiliUrl(url)) return null;
  return null;
}

/**
 * true when the URL should fall back to an iframe embed (bilibili).
 */
export function needsIframeFallback(url) {
  return isBilibiliUrl(url);
}
