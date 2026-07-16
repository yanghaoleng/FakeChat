import { ArrowLeft, ArrowUpRight, ChevronDown, Copy, GitBranch, Heart, MessageCircle, QrCode } from "lucide-react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

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
  const mainDialogRef = useRef<HTMLElement>(null);
  const childDialogRef = useRef<HTMLElement>(null);
  const childTriggerRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    if (open && view === "main") childTriggerRef.current?.focus({ preventScroll: true });
  }, [open, view]);

  if (!open) return null;

  function openChildView(nextView: Exclude<AboutDialogView, "main">, trigger: HTMLButtonElement) {
    childTriggerRef.current = trigger;
    setView(nextView);
  }

  function returnToMainView() {
    setView("main");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, currentView: AboutDialogView) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (currentView === "main") onClose();
      else returnToMainView();
      return;
    }
    if (event.key !== "Tab") return;
    const activeDialog = currentView === "main" ? mainDialogRef.current : childDialogRef.current;
    const controls = Array.from(activeDialog?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") ?? []);
    if (!controls.length) return;
    const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? controls.length - 1 : currentIndex - 1)
      : (currentIndex >= controls.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    controls[nextIndex]?.focus();
  }

  return (
    <div className={view === "main" ? "about-dialog-layer" : "about-dialog-layer about-dialog-layer-has-child"}>
      <div className="about-dialog-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        ref={mainDialogRef}
        className="about-dialog"
        role="dialog"
        aria-modal={view === "main" ? true : undefined}
        aria-hidden={view !== "main" || undefined}
        inert={view !== "main"}
        aria-labelledby="about-dialog-title"
        onKeyDown={(event) => handleKeyDown(event, "main")}
      >
        <header className="about-dialog-header">
          <button className="about-dialog-icon-button" type="button" aria-label="返回设置" autoFocus onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 id="about-dialog-title">关于</h2>
            <p>蛐蛐模拟器</p>
          </div>
        </header>

        <div className="about-dialog-list">
          <a className="about-dialog-item" href={githubRepositoryUrl} target="_blank" rel="noreferrer">
            <span className="about-dialog-item-icon"><GitBranch size={19} /></span>
            <span><strong>GitHub</strong><small>查看源码和项目更新</small></span>
            <ArrowUpRight size={17} />
          </a>
          <button className="about-dialog-item" type="button" onClick={(event) => openChildView("support", event.currentTarget)}>
            <span className="about-dialog-item-icon"><Heart size={19} /></span>
            <span><strong>支持鼓励</strong><small>请我喝杯奶茶</small></span>
            <ChevronDown className="about-dialog-item-chevron" size={17} />
          </button>
          <button className="about-dialog-item" type="button" onClick={(event) => openChildView("feedback", event.currentTarget)}>
            <span className="about-dialog-item-icon"><MessageCircle size={19} /></span>
            <span><strong>意见反馈</strong><small>通过微信联系我</small></span>
            <ChevronDown className="about-dialog-item-chevron" size={17} />
          </button>
        </div>
      </section>

      {view !== "main" ? (
        <div className="about-dialog-layer about-dialog-subview-layer">
          <div className="about-dialog-backdrop about-dialog-subview-backdrop" aria-hidden="true" onClick={returnToMainView} />
          <section
            ref={childDialogRef}
            className="about-dialog about-dialog-subview"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-dialog-subview-title"
            onKeyDown={(event) => handleKeyDown(event, view)}
          >
            <header className="about-dialog-header">
              <button className="about-dialog-icon-button" type="button" aria-label="返回关于" autoFocus onClick={returnToMainView}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 id="about-dialog-subview-title">{view === "support" ? "支持鼓励" : "意见反馈"}</h2>
                <p>{view === "support" ? "谢谢你让这个小工具继续长大" : "欢迎告诉我你的想法"}</p>
              </div>
            </header>

            {view === "support" ? (
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
      ) : null}
    </div>
  );
}
