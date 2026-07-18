import { ArrowLeft, Bot, ChevronDown, Globe2, KeyRound, MessageSquarePlus, PlugZap, Smartphone, Sparkles, Volume2 } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { customModelProviders, type CustomModelSettings, type CustomModelTestState } from "../../shared/customModel";
import type { StoryPackage } from "../../shared/linearStory";
import type { SettingsAmbientSkinId, SettingsPreviewMode } from "./SettingsDialog";

type LabDialogProps = {
  open: boolean;
  closing: boolean;
  previewMode: SettingsPreviewMode;
  storyPackage: StoryPackage;
  ambientSkins: Array<{ id: SettingsAmbientSkinId; label: string }>;
  ambientSkin: SettingsAmbientSkinId;
  allowMultiSession: boolean;
  customModelPanelOpen: boolean;
  customModelSettings: CustomModelSettings;
  customModelTestState: CustomModelTestState;
  customModelTestMessage: string;
  fishAutoReadEnabled: boolean;
  fishApiKey: string;
  multiSessionToggleDisabled: boolean;
  onClose: () => void;
  onChoosePreviewMode: (mode: SettingsPreviewMode) => void;
  onSelectAmbientSkin: (skin: SettingsAmbientSkinId) => void;
  onToggleMultiSession: () => void;
  onToggleCustomModel: () => void;
  onSelectCustomModelProvider: (providerId: string) => void;
  onChangeCustomModelSettings: (settings: Partial<CustomModelSettings>) => void;
  onTestCustomModel: () => void;
  onToggleFishAutoRead: () => void;
  onChangeFishApiKey: (apiKey: string) => void;
};

type LabSwitchItem = {
  id: string;
  label: string;
  description: string;
  icon: typeof Bot;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
  panel?: ReactNode;
};

export function LabDialog({
  open,
  closing,
  previewMode,
  storyPackage,
  ambientSkins,
  ambientSkin,
  allowMultiSession,
  customModelPanelOpen,
  customModelSettings,
  customModelTestState,
  customModelTestMessage,
  fishAutoReadEnabled,
  fishApiKey,
  multiSessionToggleDisabled,
  onClose,
  onChoosePreviewMode,
  onSelectAmbientSkin,
  onToggleMultiSession,
  onToggleCustomModel,
  onSelectCustomModelProvider,
  onChangeCustomModelSettings,
  onTestCustomModel,
  onToggleFishAutoRead,
  onChangeFishApiKey
}: LabDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);

  if (!open) return null;

  const switchItems: LabSwitchItem[] = [
    {
      id: "custom-model",
      label: "自定义模型",
      description: "测试通过后保存并启用",
      icon: Bot,
      enabled: customModelPanelOpen,
      onToggle: onToggleCustomModel,
      panel: customModelPanelOpen ? (
        <div className="settings-option-list settings-model-panel" aria-label="自定义模型设置">
          <label className="settings-option-row">
            <span className="settings-option-label">
              <Globe2 size={16} />
              <span>模型</span>
            </span>
            <span className="settings-option-control">
              <select
                aria-label="选择自定义模型供应商"
                value={customModelSettings.providerId}
                onChange={(event) => onSelectCustomModelProvider(event.currentTarget.value)}
              >
                <optgroup label="国内主流">
                  {customModelProviders.filter((provider) => provider.region === "domestic").map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.label}</option>
                  ))}
                </optgroup>
                <optgroup label="国外主流">
                  {customModelProviders.filter((provider) => provider.region === "global").map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.label}</option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </span>
          </label>
          <label className="settings-option-row settings-option-row-stack">
            <span className="settings-option-label">
              <PlugZap size={16} />
              <span>Base URL</span>
            </span>
            <span className="settings-option-control">
              <input
                aria-label="自定义模型 Base URL"
                type="url"
                autoComplete="off"
                spellCheck={false}
                value={customModelSettings.baseUrl}
                placeholder="https://api.example.com/v1"
                onChange={(event) => onChangeCustomModelSettings({ baseUrl: event.currentTarget.value })}
              />
            </span>
          </label>
          <label className="settings-option-row settings-option-row-stack">
            <span className="settings-option-label">
              <Bot size={16} />
              <span>模型名</span>
            </span>
            <span className="settings-option-control">
              <input
                aria-label="自定义模型名"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={customModelSettings.model}
                placeholder="model-name"
                onChange={(event) => onChangeCustomModelSettings({ model: event.currentTarget.value })}
              />
            </span>
          </label>
          <label className="settings-option-row settings-option-row-stack">
            <span className="settings-option-label">
              <KeyRound size={16} />
              <span>API Key</span>
            </span>
            <span className="settings-option-control">
              <input
                aria-label="自定义模型 API Key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={customModelSettings.apiKey}
                placeholder="粘贴 API key"
                onChange={(event) => onChangeCustomModelSettings({ apiKey: event.currentTarget.value })}
              />
            </span>
          </label>
          <div className="settings-model-test-row">
            <button
              className="settings-model-test-button"
              type="button"
              disabled={customModelTestState === "testing"}
              onClick={onTestCustomModel}
            >
              <PlugZap size={15} />
              {customModelTestState === "testing" ? "测试中" : "测试并保存"}
            </button>
            <span className={`settings-model-test-status settings-model-test-status-${customModelTestState}`}>
              {customModelTestMessage || "未检测"}
            </span>
          </div>
        </div>
      ) : null
    },
    {
      id: "fish-auto-read",
      label: "Fish 朗读",
      description: "逐条等待语音后显示气泡",
      icon: Volume2,
      enabled: fishAutoReadEnabled,
      onToggle: onToggleFishAutoRead,
      panel: fishAutoReadEnabled ? (
        <label className="settings-option-row settings-option-row-stack">
          <span className="settings-option-label">
            <Volume2 size={16} />
            <span>Fish Key</span>
          </span>
          <span className="settings-option-control">
            <input
              aria-label="Fish Audio API Key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={fishApiKey}
              placeholder="留空使用服务端默认 Key"
              onChange={(event) => onChangeFishApiKey(event.currentTarget.value)}
            />
          </span>
        </label>
      ) : null
    }
  ];

  if (storyPackage === "viral") {
    switchItems.push({
      id: "multi-session",
      label: "多会话",
      description: "允许 DeepSeek 按剧情新增私聊或群聊",
      icon: MessageSquarePlus,
      enabled: allowMultiSession,
      disabled: multiSessionToggleDisabled,
      onToggle: onToggleMultiSession
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled)") ?? []);
    if (!controls.length) return;
    const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? controls.length - 1 : currentIndex - 1)
      : (currentIndex >= controls.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    controls[nextIndex]?.focus();
  }

  return (
    <div className={closing ? "about-dialog-layer about-dialog-layer-closing about-dialog-subview-layer" : "about-dialog-layer about-dialog-subview-layer"}>
      <div className="about-dialog-backdrop about-dialog-subview-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        className="about-dialog about-dialog-subview settings-lab-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <header className="about-dialog-header">
          <button className="about-dialog-icon-button" type="button" aria-label="返回设置" autoFocus onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 id="lab-dialog-title">实验室</h2>
            <p>预览、背景和高级功能</p>
          </div>
        </header>

        <div className="settings-lab-panel" aria-label="实验室菜单">
          <div className="settings-option-list" aria-label="实验室设置">
            <label className="settings-option-row">
              <span className="settings-option-label">
                <Smartphone size={16} />
                <span>预览</span>
              </span>
              <span className="settings-option-control">
                <select
                  aria-label="预览模式"
                  value={previewMode}
                  onChange={(event) => onChoosePreviewMode(event.currentTarget.value as SettingsPreviewMode)}
                >
                  <option value="wechat">界面版</option>
                  <option value="video">视频版</option>
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>

            <label className="settings-option-row">
              <span className="settings-option-label">
                <Sparkles size={16} />
                <span>背景</span>
              </span>
              <span className="settings-option-control">
                <select
                  aria-label="切换背景"
                  value={ambientSkin}
                  onChange={(event) => onSelectAmbientSkin(event.currentTarget.value as SettingsAmbientSkinId)}
                >
                  {ambientSkins.map((skin) => (
                    <option key={skin.id} value={skin.id}>{skin.label}</option>
                  ))}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
          </div>

          {switchItems.map((item) => {
            const Icon = item.icon;
            return (
              <div className="settings-lab-section" key={item.id}>
                <button
                  className={item.enabled ? "title-menu-item title-menu-toggle title-menu-item-active" : "title-menu-item title-menu-toggle"}
                  type="button"
                  role="switch"
                  aria-label={item.label}
                  aria-checked={item.enabled}
                  disabled={item.disabled}
                  onClick={item.onToggle}
                >
                  <Icon size={16} />
                  <span className="title-menu-toggle-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className={item.enabled ? "title-menu-toggle-indicator title-menu-toggle-indicator-active" : "title-menu-toggle-indicator"} aria-hidden="true" />
                </button>
                {item.panel}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
