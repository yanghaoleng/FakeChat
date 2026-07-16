import { ArrowLeft, Copy, QrCode } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

type AboutDialogProps = {
  open: boolean;
  githubRepositoryUrl: string;
  alipayQrCodeUrl?: string;
  feedbackWechatId: string;
  hasFeedbackWechatId: boolean;
  onClose: () => void;
  onCopyGithubRepositoryUrl: () => void;
  onCopyFeedbackWechatId: () => void;
};

export function AboutDialog({
  open,
  githubRepositoryUrl,
  alipayQrCodeUrl,
  feedbackWechatId,
  hasFeedbackWechatId,
  onClose,
  onCopyGithubRepositoryUrl,
  onCopyFeedbackWechatId
}: AboutDialogProps) {
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
    <div className="about-dialog-layer">
      <div className="about-dialog-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <header className="about-dialog-header">
          <button className="about-dialog-icon-button" type="button" aria-label="返回设置" autoFocus onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 id="about-dialog-title">支持作者</h2>
            <p>开源链接和联系方式</p>
          </div>
        </header>

        <div className="support-author-panel">
          {alipayQrCodeUrl ? (
            <div className="about-support-qr">
              <img src={alipayQrCodeUrl} alt="支付宝收款码" />
            </div>
          ) : (
            <div className="about-support-placeholder">
              <QrCode size={40} />
              <strong>收款码准备中</strong>
            </div>
          )}

          <div className="support-author-links">
            <div className="support-author-row">
              <span className="support-author-copy">
                <span>GitHub</span>
                <a href={githubRepositoryUrl} target="_blank" rel="noreferrer">开源链接</a>
              </span>
              <button className="support-author-copy-button" type="button" aria-label="复制开源链接" title="复制开源链接" onClick={onCopyGithubRepositoryUrl}>
                <Copy size={15} />
              </button>
            </div>
            <div className="support-author-row">
              <span className="support-author-copy">
                <span>作者微信号</span>
                <strong>{feedbackWechatId}</strong>
              </span>
              <button
                className="support-author-copy-button"
                type="button"
                aria-label={hasFeedbackWechatId ? "复制作者微信号" : "作者微信号待补充"}
                title={hasFeedbackWechatId ? "复制作者微信号" : undefined}
                disabled={!hasFeedbackWechatId}
                onClick={onCopyFeedbackWechatId}
              >
                <Copy size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
