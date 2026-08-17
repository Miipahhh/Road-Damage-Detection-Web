import { useEffect, useRef, useState } from "react";

const MAX_RETRIES = 6;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 8000;

/**
 * Drop-in replacement for <img> that retries on load failure.
 * Handles transient failures from the shared-hosting backend when many
 * thumbnails load at once, instead of leaving a permanently broken image.
 */
export default function RetryImage({ src, onError, ...props }) {
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setAttempt(0);
  }, [src]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  if (!src) return null;

  const handleError = (e) => {
    if (attempt < MAX_RETRIES) {
      const delay = Math.min(BASE_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS);
      timeoutRef.current = setTimeout(() => setAttempt((a) => a + 1), delay);
    } else if (onError) {
      onError(e);
    }
  };

  const retriedSrc = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}_retry=${attempt}`;

  return <img loading="lazy" src={retriedSrc} onError={handleError} {...props} />;
}
