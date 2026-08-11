import { ArrowLeft, Copy, MessageCircle, QrCode, WalletCards } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import type { AppLanguage } from "../../shared/i18n";

type PaymentMethod = "wechat" | "alipay";

type AboutDialogProps = {
  open: boolean;
  githubRepositoryUrl: string;
  wechatQrCodeUrl?: string;
  alipayQrCodeUrl?: string;
  feedbackWechatId: string;
  hasFeedbackWechatId: boolean;
  language: AppLanguage;
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
  onClose,
  onCopyGithubRepositoryUrl,
  onCopyFeedbackWechatId
}: AboutDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wechat");
  const text = {
    "zh-CN": { wechat: "微信", alipay: "支付宝", back: "返回设置", title: "支持作者", subtitle: "开源链接和联系方式", message: <>这个工具会一直免费。<br />如果它给你带来了乐趣，可以请我喝杯咖啡，支持后续维护，我会开心一整天！ 🥰<br />也可以给我提要求，我会努力实现！</>, choosePayment: "选择收款方式", qr: "收款码", preparing: "收款码准备中", openSource: "开源链接", copyOpenSource: "复制开源链接", wechatId: "作者微信号", copyWechat: "复制作者微信号", pendingWechat: "作者微信号待补充", homepage: "作者主页" },
    "zh-TW": { wechat: "微信", alipay: "支付寶", back: "返回設定", title: "支持作者", subtitle: "開源連結與聯絡方式", message: <>這個工具會一直免費。<br />如果它為你帶來樂趣，可以請我喝杯咖啡，支持後續維護！ 🥰<br />也歡迎提出想法，我會努力實現！</>, choosePayment: "選擇付款方式", qr: "收款碼", preparing: "收款碼準備中", openSource: "開源連結", copyOpenSource: "複製開源連結", wechatId: "作者微信號", copyWechat: "複製作者微信號", pendingWechat: "作者微信號待補充", homepage: "作者首頁" },
    en: { wechat: "WeChat", alipay: "Alipay", back: "Back to settings", title: "Support the creator", subtitle: "Open source and contact details", message: <>This tool will stay free.<br />If it made you smile, you can buy me a coffee and support future maintenance! 🥰<br />Feature ideas are welcome too.</>, choosePayment: "Choose payment method", qr: "payment QR code", preparing: "QR code coming soon", openSource: "Open-source link", copyOpenSource: "Copy open-source link", wechatId: "Creator WeChat ID", copyWechat: "Copy creator WeChat ID", pendingWechat: "WeChat ID not set", homepage: "Creator website" },
    ja: { wechat: "WeChat", alipay: "Alipay", back: "設定に戻る", title: "作者を応援", subtitle: "オープンソース・連絡先", message: <>このツールはこれからも無料です。<br />楽しんでいただけたら、コーヒー一杯で今後の運営を応援できます！ 🥰<br />機能のリクエストも歓迎です。</>, choosePayment: "支払い方法を選択", qr: "支払いQRコード", preparing: "QRコードを準備中", openSource: "オープンソース", copyOpenSource: "リンクをコピー", wechatId: "作者のWeChat ID", copyWechat: "WeChat IDをコピー", pendingWechat: "WeChat ID未設定", homepage: "作者サイト" }
  }[language];

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
            {text.message}
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
