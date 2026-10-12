import { useEffect } from 'react';
import styles from './Drawer.module.css';

/**
 * Reusable Right-side Drawer Component
 * Slides in from the right edge of the screen.
 *
 * @param {boolean} isOpen - Whether drawer is visible
 * @param {() => void} onClose - Callback to close the drawer
 * @param {string|React.ReactNode} title - Drawer title
 * @param {string} [eyebrow] - Optional eyebrow / category label
 * @param {string} [subtitle] - Optional subtitle (e.g. product name)
 * @param {React.ReactNode} children - Drawer body content
 * @param {React.ReactNode} [footer] - Optional footer content
 * @param {string} [width] - Custom maximum width (e.g. '560px')
 */
export default function Drawer({
  isOpen,
  onClose,
  title,
  eyebrow,
  subtitle,
  children,
  footer,
  width,
}) {
  // Lock document body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      aria-hidden={!isOpen}
    >
      <aside
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        style={width ? { width } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Drawer'}
      >
        <header className={styles.header}>
          <div className={styles.headerTitleWrap}>
            {eyebrow && <span className={styles.headerEyebrow}>{eyebrow}</span>}
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Đóng"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </aside>
    </div>
  );
}
