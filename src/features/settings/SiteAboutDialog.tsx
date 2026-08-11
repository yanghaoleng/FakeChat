import { ArrowLeft, HeartHandshake, MessageCircleMore, ShieldCheck, Sparkles } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import type { AppCopy } from "../../shared/i18n";

type SiteAboutDialogProps = {
  open: boolean;
  copy: AppCopy;
  onClose: () => void;
};

export function SiteAboutDialog({ open, copy, onClose }: SiteAboutDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") ?? []);
    if (!controls.length) return;
    const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? controls.length - 1 : currentIndex - 1)
      : (currentIndex >= controls.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    controls[nextIndex]?.focus();
  }

  return (
    <div className="about-dialog-layer about-dialog-subview-layer">
      <div className="about-dialog-backdrop about-dialog-subview-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        className="about-dialog about-dialog-site"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-about-dialog-title"
        aria-describedby="site-about-dialog-description"
        onKeyDown={handleKeyDown}
      >
        <header className="about-dialog-header">
          <button className="about-dialog-icon-button" type="button" aria-label={copy.backToSettings} autoFocus onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 id="site-about-dialog-title">{copy.aboutSite}</h2>
            <p>{copy.aboutSubtitle}</p>
          </div>
        </header>

        <div className="site-about-content">
          <div className="site-about-mark" aria-hidden="true"><Sparkles size={22} /></div>
          <p id="site-about-dialog-description" className="site-about-lead">{copy.aboutLead}</p>
          <div className="site-about-feature-grid">
            <div className="site-about-feature">
              <HeartHandshake size={19} aria-hidden="true" />
              <strong>{copy.aboutEmotional}</strong>
            </div>
            <div className="site-about-feature">
              <MessageCircleMore size={19} aria-hidden="true" />
              <strong>{copy.aboutCreative}</strong>
            </div>
          </div>
          <div className="site-about-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <p>{copy.aboutPrivacy}</p>
          </div>
          <p className="site-about-disclaimer">{copy.aboutDisclaimer}</p>
        </div>
      </section>
    </div>
  );
}
