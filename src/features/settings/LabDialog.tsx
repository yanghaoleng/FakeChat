import { ArrowLeft, Bot, Check, ChevronDown, Globe2, KeyRound, MessageSquarePlus, PlugZap, Smartphone, Sparkles, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { aiProviders, type AiModelChoiceId, type AiProviderId } from "../../shared/aiProviders";
import { customModelProviders, type CustomModelSettings, type CustomModelTestState } from "../../shared/customModel";
import type { AppLanguage } from "../../shared/i18n";
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
  aiProviderId: AiProviderId;
  customModelPanelOpen: boolean;
  customModelSettings: CustomModelSettings;
  customModelTestState: CustomModelTestState;
  customModelTestMessage: string;
  fishAutoReadEnabled: boolean;
  fishApiKey: string;
  multiSessionToggleDisabled: boolean;
  language: AppLanguage;
  onClose: () => void;
  onChoosePreviewMode: (mode: SettingsPreviewMode) => void;
  onSelectAmbientSkin: (skin: SettingsAmbientSkinId) => void;
  onToggleMultiSession: () => void;
  onSelectAiModel: (modelId: AiModelChoiceId) => void;
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
  aiProviderId,
  customModelPanelOpen,
  customModelSettings,
  customModelTestState,
  customModelTestMessage,
  fishAutoReadEnabled,
  fishApiKey,
  multiSessionToggleDisabled,
  language,
  onClose,
  onChoosePreviewMode,
  onSelectAmbientSkin,
  onToggleMultiSession,
  onSelectAiModel,
  onSelectCustomModelProvider,
  onChangeCustomModelSettings,
  onTestCustomModel,
  onToggleFishAutoRead,
  onChangeFishApiKey
}: LabDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const modelSelectRef = useRef<HTMLDivElement>(null);
  const modelSelectTriggerRef = useRef<HTMLButtonElement>(null);
  const modelOptionRefs = useRef<Partial<Record<AiModelChoiceId, HTMLButtonElement | null>>>({});
  const modelCloseTimerRef = useRef<number | null>(null);
  const [modelMenuState, setModelMenuState] = useState<"closed" | "open" | "closing">("closed");
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const text = {
    "zh-CN": { back: "返回设置", aiModel: "AI 模型", chooseAiModel: "选择续写使用的 AI 模型", customModel: "自定义模型", model: "接口模板", chooseProvider: "选择自定义模型供应商", domestic: "国内主流", global: "国外主流", modelName: "模型名", apiKey: "粘贴 API key", testing: "测试中", testSave: "测试并保存", unchecked: "未检测", fishRead: "Fish 朗读", fishDescription: "逐条等待语音后显示气泡", fishPlaceholder: "留空使用服务端默认 Key", multiSession: "多会话", multiDescription: "允许 AI 按剧情新增私聊或群聊", lab: "实验室", subtitle: "预览、背景和高级功能", menu: "实验室菜单", settings: "实验室设置", preview: "预览", previewMode: "预览模式", interface: "界面版", video: "视频版", background: "背景", switchBackground: "切换背景" },
    "zh-TW": { back: "返回設定", aiModel: "AI 模型", chooseAiModel: "選擇續寫使用的 AI 模型", customModel: "自訂模型", model: "介面範本", chooseProvider: "選擇自訂模型供應商", domestic: "中國服務", global: "全球服務", modelName: "模型名稱", apiKey: "貼上 API key", testing: "測試中", testSave: "測試並儲存", unchecked: "尚未檢測", fishRead: "Fish 朗讀", fishDescription: "逐則等待語音後顯示訊息", fishPlaceholder: "留空使用伺服器預設 Key", multiSession: "多會話", multiDescription: "允許 AI 依劇情新增私聊或群聊", lab: "實驗室", subtitle: "預覽、背景與進階功能", menu: "實驗室選單", settings: "實驗室設定", preview: "預覽", previewMode: "預覽模式", interface: "介面版", video: "影片版", background: "背景", switchBackground: "切換背景" },
    en: { back: "Back to settings", aiModel: "AI model", chooseAiModel: "Choose the AI model for story generation", customModel: "Custom model", model: "API template", chooseProvider: "Choose a model provider", domestic: "China providers", global: "Global providers", modelName: "Model name", apiKey: "Paste API key", testing: "Testing", testSave: "Test and save", unchecked: "Not tested", fishRead: "Fish narration", fishDescription: "Wait for speech before showing each bubble", fishPlaceholder: "Leave blank to use the server default", multiSession: "Multiple chats", multiDescription: "Let the AI add direct or group chats", lab: "Lab", subtitle: "Preview, background, and advanced features", menu: "Lab menu", settings: "Lab settings", preview: "Preview", previewMode: "Preview mode", interface: "Interface", video: "Video", background: "Background", switchBackground: "Change background" },
    ja: { back: "設定に戻る", aiModel: "AIモデル", chooseAiModel: "ストーリー生成に使うAIモデルを選択", customModel: "カスタムモデル", model: "APIテンプレート", chooseProvider: "モデル提供元を選択", domestic: "中国向け", global: "グローバル", modelName: "モデル名", apiKey: "API keyを貼り付け", testing: "テスト中", testSave: "テストして保存", unchecked: "未テスト", fishRead: "Fish 読み上げ", fishDescription: "音声の後に吹き出しを表示", fishPlaceholder: "空欄でサーバー既定Keyを使用", multiSession: "複数チャット", multiDescription: "展開に応じて個別・グループチャットを追加", lab: "ラボ", subtitle: "プレビュー・背景・詳細機能", menu: "ラボメニュー", settings: "ラボ設定", preview: "プレビュー", previewMode: "プレビューモード", interface: "画面版", video: "動画版", background: "背景", switchBackground: "背景を変更" }
  }[language];

  function clearModelCloseTimer() {
    if (modelCloseTimerRef.current === null) return;
    window.clearTimeout(modelCloseTimerRef.current);
    modelCloseTimerRef.current = null;
  }

  function openModelMenu(focusIndex?: number) {
    clearModelCloseTimer();
    const selectedIndex = modelChoices.findIndex((choice) => choice.id === selectedAiModel);
    const nextIndex = focusIndex ?? Math.max(0, selectedIndex);
    setActiveModelIndex(nextIndex);
    setModelMenuState("open");
    if (focusIndex !== undefined) {
      window.requestAnimationFrame(() => modelOptionRefs.current[modelChoices[nextIndex]?.id]?.focus());
    }
  }

  function closeModelMenu(restoreFocus = false) {
    clearModelCloseTimer();
    if (modelMenuState === "closed") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setModelMenuState("closing");
    modelCloseTimerRef.current = window.setTimeout(() => {
      setModelMenuState("closed");
      modelCloseTimerRef.current = null;
      if (restoreFocus) modelSelectTriggerRef.current?.focus();
    }, reduceMotion ? 0 : 160);
  }

  useEffect(() => () => clearModelCloseTimer(), []);

  useEffect(() => {
    if (!open) {
      clearModelCloseTimer();
      setModelMenuState("closed");
    }
  }, [open]);

  useEffect(() => {
    if (modelMenuState === "closed") return;
    function handleOutsidePointerDown(event: PointerEvent) {
      if (!modelSelectRef.current?.contains(event.target as Node)) closeModelMenu();
    }
    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [modelMenuState]);

  if (!open) return null;

  const selectedAiModel: AiModelChoiceId = customModelPanelOpen ? "custom" : aiProviderId;
  const modelChoices: Array<{ id: AiModelChoiceId; label: string }> = [
    ...aiProviders.map((provider) => ({ id: provider.id, label: provider.label })),
    { id: "custom", label: text.customModel }
  ];
  const selectedModelLabel = modelChoices.find((choice) => choice.id === selectedAiModel)?.label ?? modelChoices[0].label;

  function focusModelOption(index: number) {
    const nextIndex = (index + modelChoices.length) % modelChoices.length;
    setActiveModelIndex(nextIndex);
    modelOptionRefs.current[modelChoices[nextIndex].id]?.focus();
  }

  function handleModelTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const selectedIndex = Math.max(0, modelChoices.findIndex((choice) => choice.id === selectedAiModel));
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      const nextIndex = event.key === "ArrowDown"
        ? (selectedIndex + 1) % modelChoices.length
        : (selectedIndex - 1 + modelChoices.length) % modelChoices.length;
      openModelMenu(nextIndex);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (modelMenuState === "open") closeModelMenu();
      else openModelMenu();
      return;
    }
    if (event.key === "Escape" && modelMenuState !== "closed") {
      event.preventDefault();
      event.stopPropagation();
      closeModelMenu(true);
    }
  }

  function handleModelOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      focusModelOption(index + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      focusModelOption(event.key === "Home" ? 0 : modelChoices.length - 1);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeModelMenu(true);
      return;
    }
    if (event.key === "Tab") closeModelMenu();
  }

  function selectModel(modelId: AiModelChoiceId) {
    onSelectAiModel(modelId);
    closeModelMenu(true);
  }
  const switchItems: LabSwitchItem[] = [
    {
      id: "fish-auto-read",
      label: text.fishRead,
      description: text.fishDescription,
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
              placeholder={text.fishPlaceholder}
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
      label: text.multiSession,
      description: text.multiDescription,
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
          <button className="about-dialog-icon-button" type="button" aria-label={text.back} autoFocus onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 id="lab-dialog-title">{text.lab}</h2>
            <p>{text.subtitle}</p>
          </div>
        </header>

        <div className="settings-lab-panel" aria-label={text.menu}>
          <div className="settings-option-list" aria-label={text.settings}>
            <label className="settings-option-row">
              <span className="settings-option-label">
                <Smartphone size={16} />
                <span>{text.preview}</span>
              </span>
              <span className="settings-option-control">
                <select
                  aria-label={text.previewMode}
                  value={previewMode}
                  onChange={(event) => onChoosePreviewMode(event.currentTarget.value as SettingsPreviewMode)}
                >
                  <option value="wechat">{text.interface}</option>
                  <option value="video">{text.video}</option>
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>

            <label className="settings-option-row">
              <span className="settings-option-label">
                <Sparkles size={16} />
                <span>{text.background}</span>
              </span>
              <span className="settings-option-control">
                <select
                  aria-label={text.switchBackground}
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

          <div className="settings-lab-section">
            <div className="settings-option-list settings-model-panel" aria-label={text.aiModel}>
              <div className="settings-option-row settings-model-select-row">
                <span className="settings-option-label">
                  <Bot size={16} />
                  <span>{text.aiModel}</span>
                </span>
                <div className="settings-option-control settings-model-select" ref={modelSelectRef}>
                  <button
                    ref={modelSelectTriggerRef}
                    className="settings-model-select-trigger"
                    type="button"
                    role="combobox"
                    aria-label={text.chooseAiModel}
                    aria-controls="settings-ai-model-listbox"
                    aria-expanded={modelMenuState === "open"}
                    aria-haspopup="listbox"
                    onClick={() => modelMenuState === "open" ? closeModelMenu() : openModelMenu()}
                    onKeyDown={handleModelTriggerKeyDown}
                  >
                    <span>{selectedModelLabel}</span>
                    <ChevronDown className="settings-model-select-chevron" size={15} aria-hidden="true" />
                  </button>

                  {modelMenuState !== "closed" ? (
                    <div
                      id="settings-ai-model-listbox"
                      className={`settings-model-select-menu settings-model-select-menu-${modelMenuState}`}
                      role="listbox"
                      aria-label={text.chooseAiModel}
                    >
                      {modelChoices.map((choice, index) => (
                        <button
                          key={choice.id}
                          ref={(node) => { modelOptionRefs.current[choice.id] = node; }}
                          className="settings-model-select-option"
                          type="button"
                          role="option"
                          aria-selected={choice.id === selectedAiModel}
                          tabIndex={index === activeModelIndex ? 0 : -1}
                          onClick={() => selectModel(choice.id)}
                          onKeyDown={(event) => handleModelOptionKeyDown(event, index)}
                        >
                          <span>{choice.label}</span>
                          <Check className="settings-model-select-check" size={15} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {customModelPanelOpen ? (
                <>
                  <label className="settings-option-row">
                    <span className="settings-option-label">
                      <Globe2 size={16} />
                      <span>{text.model}</span>
                    </span>
                    <span className="settings-option-control">
                      <select
                        aria-label={text.chooseProvider}
                        value={customModelSettings.providerId}
                        onChange={(event) => onSelectCustomModelProvider(event.currentTarget.value)}
                      >
                        <optgroup label={text.domestic}>
                          {customModelProviders.filter((provider) => provider.region === "domestic").map((provider) => (
                            <option key={provider.id} value={provider.id}>{provider.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label={text.global}>
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
                      <span>{text.modelName}</span>
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
                        placeholder={text.apiKey}
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
                      {customModelTestState === "testing" ? text.testing : text.testSave}
                    </button>
                    <span className={`settings-model-test-status settings-model-test-status-${customModelTestState}`}>
                      {customModelTestMessage || text.unchecked}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
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
