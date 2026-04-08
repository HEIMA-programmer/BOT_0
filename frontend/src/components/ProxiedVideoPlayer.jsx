import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getProxiedVideoSrc, needsIframeFallback, extractYouTubeId } from '../utils/videoSource';

/**
 * YT.Player compatible states. 1=playing, 2=paused, 0=ended, 3=buffering.
 */
function mapState(video) {
  if (!video) return -1;
  if (video.ended) return 0;
  if (!video.paused) {
    if (video.readyState >= 3) return 1;
    return 3;
  }
  return 2;
}

/**
 * A unified video player that streams YouTube through the backend proxy
 * (via getProxiedVideoSrc) and exposes a ref-based imperative API matching
 * the parts of ``YT.Player`` we use elsewhere (playVideo / pauseVideo /
 * seekTo / getCurrentTime / getDuration / getPlayerState / destroy).
 *
 * For unsupported sources (bilibili) it falls back to an iframe embed.
 */
const ProxiedVideoPlayer = forwardRef(function ProxiedVideoPlayer(
  {
    src,
    controls = true,
    muted = false,
    autoplay = false,
    loop = false,
    style,
    onReady,
    onStateChange,
    onTimeUpdate,
    onError,
  },
  ref
) {
  const videoRef = useRef(null);
  const readyRef = useRef(false);
  const [failed, setFailed] = useState(false);

  const proxiedSrc = useMemo(() => getProxiedVideoSrc(src), [src]);
  const fallbackIframe = useMemo(() => needsIframeFallback(src), [src]);

  useImperativeHandle(ref, () => ({
    playVideo() {
      const v = videoRef.current;
      if (!v) return;
      // HTMLMediaElement.play() returns a Promise that rejects on autoplay
      // blocking. Swallow the rejection so we don't emit unhandled errors
      // — autoplay refusal is expected for non-host late joiners until the
      // user clicks anywhere on the page.
      try {
        const p = v.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => { /* autoplay blocked — user must interact first */ });
        }
      } catch { /* noop */ }
    },
    pauseVideo() {
      const v = videoRef.current;
      if (!v) return;
      try { v.pause(); } catch { /* noop */ }
    },
    seekTo(seconds /* , allowSeekAhead */) {
      const v = videoRef.current;
      if (!v) return;
      try {
        v.currentTime = Math.max(0, Number(seconds) || 0);
      } catch { /* noop */ }
    },
    getCurrentTime() {
      const v = videoRef.current;
      return v ? v.currentTime || 0 : 0;
    },
    getDuration() {
      const v = videoRef.current;
      return v ? v.duration || 0 : 0;
    },
    getPlayerState() {
      return mapState(videoRef.current);
    },
    destroy() {
      const v = videoRef.current;
      if (!v) return;
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
      } catch { /* noop */ }
    },
  }), []);

  // Reset state when src changes
  useEffect(() => {
    readyRef.current = false;
    setFailed(false);
  }, [proxiedSrc]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const handleReady = () => {
      if (!readyRef.current) {
        readyRef.current = true;
        if (onReady) onReady({ getCurrentTime: () => v.currentTime });
      }
    };
    const handlePlay = () => onStateChange && onStateChange({ state: 1 });
    const handlePause = () => onStateChange && onStateChange({ state: 2 });
    const handleEnded = () => onStateChange && onStateChange({ state: 0 });
    const handleWaiting = () => onStateChange && onStateChange({ state: 3 });
    const handleTime = () => onTimeUpdate && onTimeUpdate(v.currentTime || 0);
    const handleError = (e) => {
      setFailed(true);
      if (onError) onError(e);
    };
    v.addEventListener('loadedmetadata', handleReady);
    v.addEventListener('canplay', handleReady);
    v.addEventListener('play', handlePlay);
    v.addEventListener('playing', handlePlay);
    v.addEventListener('pause', handlePause);
    v.addEventListener('ended', handleEnded);
    v.addEventListener('waiting', handleWaiting);
    v.addEventListener('timeupdate', handleTime);
    v.addEventListener('error', handleError);
    return () => {
      v.removeEventListener('loadedmetadata', handleReady);
      v.removeEventListener('canplay', handleReady);
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('playing', handlePlay);
      v.removeEventListener('pause', handlePause);
      v.removeEventListener('ended', handleEnded);
      v.removeEventListener('waiting', handleWaiting);
      v.removeEventListener('timeupdate', handleTime);
      v.removeEventListener('error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proxiedSrc]);

  const wrapperStyle = {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%',
    background: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    ...style,
  };

  if (fallbackIframe) {
    const s = String(src || '');
    // Bilibili iframe (keeps existing behaviour)
    const bvMatch = s.match(/\/video\/(BV[\w]+)/i);
    const bvid = bvMatch ? bvMatch[1] : null;
    const iframeSrc = bvid
      ? `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&danmaku=0`
      : s;
    return (
      <div style={wrapperStyle}>
        <iframe
          src={iframeSrc}
          title="Video"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          allow="fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (!proxiedSrc) {
    return (
      <div style={{ ...wrapperStyle, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#999', fontSize: 14 }}>Unsupported video source</span>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <video
        ref={videoRef}
        src={proxiedSrc}
        controls={controls}
        muted={muted}
        autoPlay={autoplay}
        loop={loop}
        playsInline
        preload="metadata"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
      />
      {failed && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          gap: 8,
        }}>
          <div>Video failed to load</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            {extractYouTubeId(src)
              ? 'The server could not resolve this YouTube video. Please retry later.'
              : 'Source is not reachable.'}
          </div>
        </div>
      )}
    </div>
  );
});

export default ProxiedVideoPlayer;
