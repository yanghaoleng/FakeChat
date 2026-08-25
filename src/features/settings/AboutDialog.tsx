import { Calligraph } from "calligraph";
import { ArrowLeft, Copy, MessageCircle, QrCode, WalletCards } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AppLanguage } from "../../shared/i18n";
import { segmentSupportPraise, supportAuthorCopy } from "./supportAuthorCopy";

type PaymentMethod = "wechat" | "alipay";
const supportPraiseStaggerMs = 42;

type AnimatedSupportPraiseProps = {
  language: AppLanguage;
  praise: string;
  praiseIndex: number;
  reduceMotion: boolean;
};

function AnimatedSupportPraise({ language, praise, praiseIndex, reduceMotion }: AnimatedSupportPraiseProps) {
  const segments = segmentSupportPraise(praise, language);
  const animatedSegmentCount = segments.filter((segment) => !/^\s+$/u.test(segment)).length;
  const [visibleSegmentCount, setVisibleSegmentCount] = useState(reduceMotion ? animatedSegmentCount : 0);

  useEffect(() => {
    if (reduceMotion) {
      setVisibleSegmentCount(animatedSegmentCount);
      return undefined;
    }

    setVisibleSegmentCount(0);
    const timers = Array.from({ length: animatedSegmentCount }, (_, index) => window.setTimeout(
      () => setVisibleSegmentCount(index + 1),
      index * supportPraiseStaggerMs
    ));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [animatedSegmentCount, language, praise, reduceMotion]);

  if (reduceMotion) return <span className="support-author-praise" aria-label={praise}>{praise}</span>;

  let animatedSegmentIndex = -1;
  return (
    <span className="support-author-praise" aria-label={praise}>
      {segments.map((segment, index) => {
        if (/^\s+$/u.test(segment)) {
          return <span className="support-author-praise-space" aria-hidden="true" key={`${index}-space`}>{segment}</span>;
        }
        animatedSegmentIndex += 1;
        return (
          <span className="support-author-praise-token" aria-hidden="true" key={`${index}-${segment}`}>
            <span className="support-author-praise-placeholder">{segment}</span>
            {animatedSegmentIndex < visibleSegmentCount ? (
              <Calligraph
                key={`${language}-${praiseIndex}-${index}-${segment}`}
                className="support-author-praise-motion"
                variant="text"
                animation="bouncy"
                drift={{ x: 10, y: 6 }}
                trend={1}
                initial
                autoSize={false}
                aria-hidden="true"
                style={{ display: "inline-flex", position: "absolute", inset: "0 auto auto 0", whiteSpace: "nowrap" }}
              >
                {segment}
              </Calligraph>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

type AboutDialogProps = {
  open: boolean;
  githubRepositoryUrl: string;
  wechatQrCodeUrl?: string;
  alipayQrCodeUrl?: string;
  feedbackWechatId: string;
  hasFeedbackWechatId: boolean;
  language: AppLanguage;
  praiseIndex: number;
  onClose: () => void;
  onCopyGithubRepositoryUrl: () => void;
  onCopyFeedbackWechatId: () => void;
};

export function AboutDialog({
  open,
  githubRepositoryUrl,
  wechatQrCodeUrl,
  alipayQrCodeUrl,
  feedbackWechatId,
  hasFeedbackWechatId,
  language,
  praiseIndex,
  onClose,
  onCopyGithubRepositoryUrl,
  onCopyFeedbackWechatId
}: AboutDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wechat");
  const [reduceMotion, setReduceMotion] = useState(() => (
    typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ));
  const text = supportAuthorCopy[language];
  const normalizedPraiseIndex = ((praiseIndex % text.praises.length) + text.praises.length) % text.praises.length;
  const praise = text.praises[normalizedPraiseIndex];

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReduceMotion(mediaQuery.matches);
    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);
    return () => mediaQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  if (!open) return null;

  const paymentMethodLabel = paymentMethod === "wechat" ? text.wechat : text.alipay;
  const paymentQrCodeUrl = paymentMethod === "wechat" ? wechatQrCodeUrl : alipayQrCodeUrl;

  function focusPaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);
    dialogRef.current?.querySelector<HTMLButtonElement>(`[data-payment-method="${method}"]`)?.focus();
  }

  function handlePaymentMethodKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Home") {
      event.preventDefault();
      focusPaymentMethod("alipay");
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusPaymentMethod("wechat");
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    focusPaymentMethod(paymentMethod === "wechat" ? "alipay" : "wechat");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), a[href]') ?? []);
    if (!controls.length) return;
    const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? controls.length - 1 : currentIndex - 1)
      : (currentIndex >= controls.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    controls[nextIndex]?.focus();
  }

  return (
    <div className="about-dialog-layer">
      <div className="about-dialog-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        className="about-dialog about-dialog-support"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <header className="about-dialog-header">
          <button className="about-dialog-icon-button" type="button" aria-label={text.back} autoFocus onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 id="about-dialog-title">{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
        </header>

        <div className="support-author-panel">
          <p className="support-author-message">
            <span>{text.intro}</span>
            <AnimatedSupportPraise
              language={language}
              praise={praise}
              praiseIndex={normalizedPraiseIndex}
              reduceMotion={reduceMotion}
            />
            <span>{text.request}</span>
          </p>

          <div className="support-author-payment">
            <div className="support-author-payment-tabs" role="tablist" aria-label={text.choosePayment}>
              <button
                id="support-author-alipay-tab"
                className="support-author-payment-tab"
                type="button"
                role="tab"
                aria-controls="support-author-payment-panel"
                aria-selected={paymentMethod === "alipay"}
                tabIndex={paymentMethod === "alipay" ? 0 : -1}
                data-payment-method="alipay"
                onClick={() => setPaymentMethod("alipay")}
                onKeyDown={handlePaymentMethodKeyDown}
              >
                <WalletCards size={18} />
                <span>{text.alipay}</span>
              </button>
              <button
                id="support-author-wechat-tab"
                className="support-author-payment-tab"
                type="button"
                role="tab"
                aria-controls="support-author-payment-panel"
                aria-selected={paymentMethod === "wechat"}
                tabIndex={paymentMethod === "wechat" ? 0 : -1}
                data-payment-method="wechat"
                onClick={() => setPaymentMethod("wechat")}
                onKeyDown={handlePaymentMethodKeyDown}
              >
                <MessageCircle size={18} />
                <span>{text.wechat}</span>
              </button>
            </div>

            {paymentQrCodeUrl ? (
              <div
                id="support-author-payment-panel"
                className="about-support-qr"
                role="tabpanel"
                aria-labelledby={`support-author-${paymentMethod}-tab`}
              >
                <img src={paymentQrCodeUrl} alt={language.startsWith("zh") ? `${paymentMethodLabel}${text.qr}` : `${paymentMethodLabel} ${text.qr}`} />
              </div>
            ) : (
              <div
                id="support-author-payment-panel"
                className="about-support-placeholder"
                role="tabpanel"
                aria-labelledby={`support-author-${paymentMethod}-tab`}
              >
                <QrCode size={40} />
                <strong>{paymentMethodLabel} {text.preparing}</strong>
              </div>
            )}
          </div>

          <div className="support-author-links">
            <div className="support-author-row">
              <span className="support-author-copy">
                <span>GitHub</span>
                <a href={githubRepositoryUrl} target="_blank" rel="noreferrer">{text.openSource}</a>
              </span>
              <button className="support-author-copy-button" type="button" aria-label={text.copyOpenSource} title={text.copyOpenSource} onClick={onCopyGithubRepositoryUrl}>
                <Copy size={15} />
              </button>
            </div>
            <div className="support-author-row">
              <span className="support-author-copy">
                <span>{text.wechatId}</span>
                <strong>{feedbackWechatId}</strong>
              </span>
              <button
                className="support-author-copy-button"
                type="button"
                aria-label={hasFeedbackWechatId ? text.copyWechat : text.pendingWechat}
                title={hasFeedbackWechatId ? text.copyWechat : undefined}
                disabled={!hasFeedbackWechatId}
                onClick={onCopyFeedbackWechatId}
              >
                <Copy size={15} />
              </button>
            </div>
            <div className="support-author-row support-author-row-link">
              <span className="support-author-copy">
                <span>{text.homepage}</span>
                <a href="https://mikeywa.icu" target="_blank" rel="noreferrer">mikeywa.icu</a>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
