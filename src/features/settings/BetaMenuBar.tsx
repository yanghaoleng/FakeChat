import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { selectableAiProviders, type AiModelChoiceId, type AiProviderId } from "../../shared/aiProviders";
import { appLanguages, languageLabels, type AppCopy, type AppLanguage, type LanguagePreference } from "../../shared/i18n";
import type { StoryPackage } from "../../shared/linearStory";
import type { JojoPresetRole, PresetRoleSelection, ViralPresetRole } from "../../shared/presetStories";
import type { SettingsAmbientSkinId, SettingsPreviewMode } from "./SettingsDialog";

type MenuId = "file" | "view" | "role" | "model" | "help";

export const betaModelMenuOpenEvent = "ququ:open-beta-model-menu";

export type FishApiTestState = "idle" | "testing" | "success" | "error";

type RoleChoice = {
  id: string;
  label: string;
};

type BetaMenuBarProps = {
  brandIconSrc: string;
  copy: AppCopy;
  language: AppLanguage;
  languagePreference: LanguagePreference;
  storyPackage: StoryPackage;
  activePresetRole: PresetRoleSelection;
  jojoRoleChoices: Array<{ roleId: JojoPresetRole; label: string }>;
  viralRoleChoices: Array<{ id: ViralPresetRole; label: string }>;
  previewMode: SettingsPreviewMode;
  ambientSkins: Array<{ id: SettingsAmbientSkinId; label: string }>;
  ambientSkin: SettingsAmbientSkinId;
  aiProviderId: AiProviderId;
  allowMultiSession: boolean;
  multiSessionToggleDisabled: boolean;
  fishAutoReadEnabled: boolean;
  fishApiKey: string;
  fishApiTestState: FishApiTestState;
  fishApiTestMessage: string;
  switchLink: { href: string; label: string };
  onChoosePreviewMode: (mode: SettingsPreviewMode) => void;
  onSelectAmbientSkin: (skin: SettingsAmbientSkinId) => void;
  onSwitchPresetRole: (selection: Partial<PresetRoleSelection>) => void;
  onChangeLanguage: (preference: LanguagePreference) => void;
  onSelectAiModel: (model: AiModelChoiceId) => void;
  onToggleMultiSession: () => void;
  onToggleFishAutoRead: () => void;
  onChangeFishApiKey: (apiKey: string) => void;
  onTestFishApiKey: () => void;
  onOpenAbout: () => void;
  onOpenSiteAbout: () => void;
  onExportArchive: () => void;
  onImportArchive: () => void;
};

type MenuItemProps = {
  checked?: boolean;
  disabled?: boolean;
  label: string;
  shortcut?: string;
  onClick?: () => void;
};

function MenuItem({ checked, disabled, label, shortcut, onClick }: MenuItemProps) {
  return (
    <button
      className="beta-menu-item"
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked === undefined ? undefined : checked}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="beta-menu-check" aria-hidden="true">{checked ? <Check size={14} strokeWidth={2.4} /> : null}</span>
      <span className="beta-menu-label">{label}</span>
      {shortcut ? <kbd>{shortcut}</kbd> : null}
    </button>
  );
}

export function BetaMenuBar({
  brandIconSrc,
  copy,
  language,
  languagePreference,
  storyPackage,
  activePresetRole,
  jojoRoleChoices,
  viralRoleChoices,
  previewMode,
  ambientSkins,
  ambientSkin,
  aiProviderId,
  allowMultiSession,
  multiSessionToggleDisabled,
  fishAutoReadEnabled,
  fishApiKey,
  fishApiTestState,
  fishApiTestMessage,
  switchLink,
  onChoosePreviewMode,
  onSelectAmbientSkin,
  onSwitchPresetRole,
  onChangeLanguage,
  onSelectAiModel,
  onToggleMultiSession,
  onToggleFishAutoRead,
  onChangeFishApiKey,
  onTestFishApiKey,
  onOpenAbout,
  onOpenSiteAbout,
  onExportArchive,
  onImportArchive
}: BetaMenuBarProps) {
  const rootRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [closingMenu, setClosingMenu] = useState<MenuId | null>(null);
  const text = {
    "zh-CN": { file: "文件", view: "显示", role: "角色", language: "语言", model: "模型", help: "帮助", interface: "界面版", video: "视频版", multiSession: "多会话（测试版）", background: "背景", aiModel: "AI 模型", fish: "Fish 朗读", customFish: "自定义 Fish Audio API", fishPlaceholder: "粘贴 Fish Audio API Key", test: "测试", testing: "测试中", save: "保存存档", load: "载入存档", support: "支持作者", about: "关于本站" },
    "zh-TW": { file: "檔案", view: "顯示", role: "角色", language: "語言", model: "模型", help: "說明", interface: "介面版", video: "影片版", multiSession: "多會話（測試版）", background: "背景", aiModel: "AI 模型", fish: "Fish 朗讀", customFish: "自訂 Fish Audio API", fishPlaceholder: "貼上 Fish Audio API Key", test: "測試", testing: "測試中", save: "儲存存檔", load: "載入存檔", support: "支持作者", about: "關於本站" },
    en: { file: "File", view: "View", role: "Role", language: "Language", model: "Model", help: "Help", interface: "Interface", video: "Video", multiSession: "Multiple chats (Beta)", background: "Background", aiModel: "AI model", fish: "Fish narration", customFish: "Custom Fish Audio API", fishPlaceholder: "Paste Fish Audio API Key", test: "Test", testing: "Testing", save: "Save archive", load: "Load archive", support: "Support the creator", about: "About this site" },
    ja: { file: "ファイル", view: "表示", role: "役割", language: "言語", model: "モデル", help: "ヘルプ", interface: "画面版", video: "動画版", multiSession: "複数チャット（テスト版）", background: "背景", aiModel: "AIモデル", fish: "Fish 読み上げ", customFish: "カスタム Fish Audio API", fishPlaceholder: "Fish Audio API Key を貼り付け", test: "テスト", testing: "テスト中", save: "アーカイブを保存", load: "アーカイブを読込", support: "作者を応援", about: "このサイトについて" }
  }[language];

  const roleChoices: RoleChoice[] = storyPackage === "jojo"
    ? jojoRoleChoices.map((choice) => ({ id: choice.roleId, label: choice.label }))
    : viralRoleChoices.map((choice) => ({ id: choice.id, label: choice.label }));
  const activeRoleId = storyPackage === "jojo" ? activePresetRole.jojoRole : activePresetRole.viralRole;

  function clearCloseTimer() {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function closeCurrentMenu() {
    if (!openMenu) return;
    clearCloseTimer();
    const menu = openMenu;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setOpenMenu(null);
    setClosingMenu(menu);
    closeTimerRef.current = window.setTimeout(() => {
      setClosingMenu((current) => current === menu ? null : current);
      closeTimerRef.current = null;
    }, reduceMotion ? 0 : 140);
  }

  function openNextMenu(menu: MenuId) {
    clearCloseTimer();
    setClosingMenu(null);
    setOpenMenu(menu);
  }

  useEffect(() => {
    if (!openMenu && !closingMenu) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeCurrentMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCurrentMenu();
    };
    document.addEventListener("pointerdown", closeOnPointerDown, true);
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown, true);
      document.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [closingMenu, openMenu]);

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    const handleOpenModelMenu = () => openNextMenu("model");
    window.addEventListener(betaModelMenuOpenEvent, handleOpenModelMenu);
    return () => window.removeEventListener(betaModelMenuOpenEvent, handleOpenModelMenu);
  }, []);

  function choose(action: () => void) {
    action();
    closeCurrentMenu();
  }

  function renderMenu(id: MenuId) {
    if (id === "file") {
      return (
        <>
          <MenuItem label={text.save} shortcut="⌘S" onClick={() => choose(onExportArchive)} />
          <MenuItem label={text.load} shortcut="⌘I" onClick={() => choose(onImportArchive)} />
          <div className="beta-menu-separator" role="separator" />
          <a className="beta-menu-link" href={switchLink.href} target="_blank" rel="noreferrer" onClick={closeCurrentMenu}>
            <span className="beta-menu-check" />
            <span className="beta-menu-label">{switchLink.label}</span>
          </a>
        </>
      );
    }

    if (id === "view") {
      return (
        <>
          <div className="beta-menu-section-label">{text.view}</div>
          <MenuItem checked={previewMode === "wechat"} label={text.interface} onClick={() => choose(() => onChoosePreviewMode("wechat"))} />
          <MenuItem checked={previewMode === "video"} label={text.video} onClick={() => choose(() => onChoosePreviewMode("video"))} />
          {storyPackage === "viral" ? (
            <MenuItem checked={allowMultiSession} disabled={multiSessionToggleDisabled} label={text.multiSession} onClick={() => choose(onToggleMultiSession)} />
          ) : null}
          <div className="beta-menu-separator" role="separator" />
          <div className="beta-menu-section-label">{text.background}</div>
          {ambientSkins.map((skin) => (
            <MenuItem key={skin.id} checked={ambientSkin === skin.id} label={skin.label} onClick={() => choose(() => onSelectAmbientSkin(skin.id))} />
          ))}
          <div className="beta-menu-separator" role="separator" />
          <div className="beta-menu-section-label">{text.language}</div>
          <MenuItem checked={languagePreference === "auto"} label={`${copy.followBrowser} (${languageLabels[language]})`} onClick={() => choose(() => onChangeLanguage("auto"))} />
          {appLanguages.map((item) => (
            <MenuItem key={item} checked={languagePreference === item} label={languageLabels[item]} onClick={() => choose(() => onChangeLanguage(item))} />
          ))}
        </>
      );
    }

    if (id === "role") {
      return roleChoices.map((choice) => (
        <MenuItem
          key={choice.id}
          checked={activeRoleId === choice.id}
          label={choice.label}
          onClick={() => choose(() => storyPackage === "jojo"
            ? onSwitchPresetRole({ jojoRole: choice.id as JojoPresetRole })
            : onSwitchPresetRole({ viralRole: choice.id as ViralPresetRole }))}
        />
      ));
    }

    if (id === "model") {
      return (
        <>
          <div className="beta-menu-section-label">{text.aiModel}</div>
          {selectableAiProviders.map((provider) => (
            <MenuItem key={provider.id} checked={aiProviderId === provider.id} label={provider.label} onClick={() => choose(() => onSelectAiModel(provider.id))} />
          ))}
          <div className="beta-menu-separator" role="separator" />
          <MenuItem checked={fishAutoReadEnabled} label={text.fish} onClick={() => choose(onToggleFishAutoRead)} />
          <form
            className="beta-menu-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (fishApiTestState !== "testing" && fishApiKey.trim()) onTestFishApiKey();
            }}
          >
            <label className="beta-menu-inline-label" htmlFor="beta-fish-api-key">
              {text.customFish}
            </label>
            <div className="beta-menu-inline-control">
              <input
                id="beta-fish-api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={fishApiKey}
                placeholder={text.fishPlaceholder}
                onChange={(event) => onChangeFishApiKey(event.currentTarget.value)}
              />
              <button type="submit" disabled={fishApiTestState === "testing" || !fishApiKey.trim()}>
                {fishApiTestState === "testing" ? <LoaderCircle className="beta-menu-test-spinner" size={13} /> : null}
                {fishApiTestState === "testing" ? text.testing : text.test}
              </button>
            </div>
            {fishApiTestMessage ? (
              <span className="beta-menu-test-message" data-state={fishApiTestState} role="status">{fishApiTestMessage}</span>
            ) : null}
          </form>
        </>
      );
    }

    return (
      <>
        <MenuItem label={text.support} onClick={() => choose(onOpenAbout)} />
        <MenuItem label={text.about} onClick={() => choose(onOpenSiteAbout)} />
      </>
    );
  }

  const menus: Array<{ id: MenuId; label: string }> = [
    { id: "file", label: text.file },
    { id: "view", label: text.view },
    { id: "role", label: text.role },
    { id: "model", label: text.model },
    { id: "help", label: text.help }
  ];

  return (
    <header ref={rootRef} className="topbar beta-macos-menubar motion-in" aria-label={copy.settings}>
      <div className="beta-menu-brand" aria-label={copy.brandName}>
        <img className="beta-menu-brand-icon" src={brandIconSrc} alt="" aria-hidden="true" />
        <span className="beta-menu-brand-text">{copy.brandName}</span>
      </div>
      <nav className="beta-menu-nav" aria-label={copy.settings}>
        {menus.map((menu) => {
          const isOpen = openMenu === menu.id;
          const isClosing = closingMenu === menu.id;
          return (
            <div className="beta-menu-root" key={menu.id} onPointerEnter={() => openMenu && openMenu !== menu.id && openNextMenu(menu.id)}>
              <button
                className={isOpen ? "beta-menu-trigger beta-menu-trigger-open" : "beta-menu-trigger"}
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => isOpen ? closeCurrentMenu() : openNextMenu(menu.id)}
              >
                {menu.label}
              </button>
              {isOpen || isClosing ? (
                <div className={isClosing ? "beta-menu-popover beta-menu-popover-closing" : "beta-menu-popover"} role="menu" aria-label={menu.label}>
                  {renderMenu(menu.id)}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </header>
  );
}
