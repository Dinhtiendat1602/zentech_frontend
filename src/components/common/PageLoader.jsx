import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './PageLoader.module.css';

/**
 * Trigger manual page loading start
 */
export function triggerPageLoading() {
  window.dispatchEvent(new CustomEvent('zen-page-loading-start'));
}

/**
 * Complete manual page loading
 */
export function finishPageLoading() {
  window.dispatchEvent(new CustomEvent('zen-page-loading-done'));
}

/**
 * PageLoader Component
 * Snappy, futuristic page transition loading indicator with glowing neon top bar
 * and subtle ambient badge.
 *
 * @param {boolean} [showBadge=true] - Whether to show the centered floating badge
 * @param {number} [speed=320] - Total transition time in milliseconds
 */
export default function PageLoader({ showBadge = true, speed = 320 }) {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const prevPathRef = useRef(location.pathname + location.search);
  const isFirstRender = useRef(true);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  const startSnappyTransition = () => {
    clearTimers();

    setLoading(true);
    setVisible(true);
    setProgress(32);

    const step1 = Math.round(speed * 0.22);
    const step2 = Math.round(speed * 0.5);
    const step3 = Math.round(speed * 0.75);
    const stepFade = speed;
    const stepFinish = speed + 130;

    timersRef.current.push(
      setTimeout(() => setProgress(72), step1),
      setTimeout(() => setProgress(90), step2),
      setTimeout(() => setProgress(100), step3),
      setTimeout(() => setVisible(false), stepFade),
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, stepFinish)
    );
  };

  // Listen to route changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const currentPath = location.pathname + location.search;
    if (prevPathRef.current === currentPath) return;
    prevPathRef.current = currentPath;

    // Scroll smoothly to top on page navigation
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    startSnappyTransition();

    return () => clearTimers();
  }, [location.pathname, location.search]);

  // Listen to custom manual events
  useEffect(() => {
    const handleStart = () => {
      clearTimers();
      setLoading(true);
      setVisible(true);
      setProgress(40);
    };

    const handleDone = () => {
      setProgress(100);
      timersRef.current.push(
        setTimeout(() => setVisible(false), 120),
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 260)
      );
    };

    window.addEventListener('zen-page-loading-start', handleStart);
    window.addEventListener('zen-page-loading-done', handleDone);

    return () => {
      window.removeEventListener('zen-page-loading-start', handleStart);
      window.removeEventListener('zen-page-loading-done', handleDone);
      clearTimers();
    };
  }, []);

  if (!loading && !visible) return null;

  return (
    <>
      {/* Top glowing progress bar */}
      <div className={styles.progressBarContainer} aria-hidden="true">
        <div
          className={styles.progressBar}
          style={{
            width: `${progress}%`,
            opacity: visible ? 1 : 0,
          }}
        >
          <div className={styles.shimmer} />
          {progress > 0 && progress < 100 && <div className={styles.glowHead} />}
        </div>
      </div>

      {/* Subtle ambient center badge */}
      {showBadge && (
        <aside
          className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
          role="status"
          aria-live="polite"
          aria-label="Đang chuyển trang"
        >
          <div className={`${styles.badge} ${visible ? styles.badgeVisible : ''}`}>
            <div className={styles.spinnerRing}>
              <div className={styles.outerRing} />
              <i className={`fa-solid fa-bolt ${styles.innerCore}`} />
            </div>
            <div className={styles.badgeText}>
              <span className={styles.badgeBrand}>ZenTech</span>
              <span className={styles.badgeSub}>
                Đang chuyển trang<span className={styles.dotPulse}>...</span>
              </span>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
