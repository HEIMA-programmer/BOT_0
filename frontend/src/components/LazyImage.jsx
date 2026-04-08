import { useEffect, useRef, useState } from 'react';
import { Image } from 'antd';

/**
 * LazyImage wraps an Antd <Image> with IntersectionObserver so off-screen
 * images don't hit the network until they're near the viewport. The
 * placeholder keeps the same layout footprint (absolute inset: 0) so
 * scrolling doesn't reflow when the real image loads.
 *
 * It intentionally renders the real <Image> once visible so Antd's
 * <Image.PreviewGroup> still picks it up for the full-screen preview.
 */
export default function LazyImage({
  src,
  alt,
  style,
  wrapperStyle,
  preview,
  rootMargin = '300px',
  placeholderColor = '#e5e7eb',
}) {
  const containerRef = useRef(null);
  // Skip the observer entirely on environments without IntersectionObserver
  // (e.g. legacy SSR / older test runners) by initialising visible=true.
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    if (visible) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        background: placeholderColor,
      }}
    >
      {visible && (
        <Image
          src={src}
          alt={alt}
          style={style}
          wrapperStyle={wrapperStyle}
          preview={preview}
          loading="lazy"
        />
      )}
    </div>
  );
}
