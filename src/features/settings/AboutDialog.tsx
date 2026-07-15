import { ArrowLeft, ArrowUpRight, ChevronDown, Copy, GitBranch, Heart, Info, MessageCircle, QrCode, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

type AboutDialogView = "main" | "support" | "feedback";

type AboutDialogProps = {
  open: boolean;
  githubRepositoryUrl: string;
  alipayQrCodeUrl?: string;
  feedbackWechatId: string;
  hasFeedbackWechatId: boolean;
  onClose: () => void;
  onCopyFeedbackWechatId: () => void;
};

export function AboutDialog({
  open,
  githubRepositoryUrl,
  alipayQrCodeUrl,
  feedbackWechatId,
  hasFeedbackWechatId,
  onClose,
  onCopyFeedbackWechatId
}: AboutDialogProps) {
  const [view, setView] = useState<AboutDialogView>("main");
  const dialogRef = useRef<HTMLElement>(null);
  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
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
      <section ref={dialogRef} className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-dialog-title" onKeyDown={handleKeyDown}>
        <header className="about-dialog-header">
          {view === "main" ? (
            <span className="about-dialog-heading-icon" aria-hidden="true"><Info size={18} /></span>
          ) : (
            <button className="about-dialog-icon-button" type="button" aria-label="返回关于" onClick={() => setView("main")}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 id="about-dialog-title">
              {view === "main" ? "关于" : view === "support" ? "支持鼓励" : "意见反馈"}
            </h2>
            <p>
              {view === "main" ? "蛐蛐模拟器" : view === "support" ? "谢谢你让这个小工具继续长大" : "欢迎告诉我你的想法"}
            </p>
          </div>
          <button className="about-dialog-icon-button about-dialog-close" type="button" aria-label="关闭关于" autoFocus onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {view === "main" ? (
          <div className="about-dialog-list">
            <a className="about-dialog-item" href={githubRepositoryUrl} target="_blank" rel="noreferrer">
              <span className="about-dialog-item-icon"><GitBranch size={19} /></span>
              <span><strong>GitHub</strong><small>查看源码和项目更新</small></span>
              <ArrowUpRight size={17} />
            </a>
            <button className="about-dialog-item" type="button" onClick={() => setView("support")}>
              <span className="about-dialog-item-icon"><Heart size={19} /></span>
              <span><strong>支持鼓励</strong><small>请我喝杯奶茶</small></span>
              <ChevronDown className="about-dialog-item-chevron" size={17} />
            </button>
            <button className="about-dialog-item" type="button" onClick={() => setView("feedback")}>
              <span className="about-dialog-item-icon"><MessageCircle size={19} /></span>
              <span><strong>意见反馈</strong><small>通过微信联系我</small></span>
              <ChevronDown className="about-dialog-item-chevron" size={17} />
            </button>
          </div>
        ) : view === "support" ? (
          <div className="about-dialog-content about-support-content">
            {alipayQrCodeUrl ? (
              <div className="about-support-qr">
                <img src={alipayQrCodeUrl} alt="支付宝收款码" />
              </div>
            ) : (
              <div className="about-support-placeholder">
                <QrCode size={44} />
                <strong>收款码准备中</strong>
                <small>之后会在这里补充支付宝收款码</small>
              </div>
            )}
            <p>你的支持会用于继续完善蛐蛐模拟器。</p>
          </div>
        ) : (
          <div className="about-dialog-content about-feedback-content">
            <div className="about-feedback-wechat">
              <span>微信号</span>
              <strong>{feedbackWechatId}</strong>
            </div>
            <button className="about-feedback-copy" type="button" disabled={!hasFeedbackWechatId} onClick={onCopyFeedbackWechatId}>
              <Copy size={17} />
              <span>{hasFeedbackWechatId ? "复制微信号" : "微信号待补充"}</span>
            </button>
            <p>反馈问题时，如果能附上截图和操作步骤，会更容易定位。</p>
          </div>
        )}
      </section>
    </div>
  );
}
