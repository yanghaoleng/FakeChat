import { Check, ChevronRight, CircleHelp, FileDown, FileUp, FlaskConical, Heart, Info, Languages, MonitorPlay, Palette, Settings2, UserRound, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { aiProviders, type AiModelChoiceId, type AiProviderId } from "../../shared/aiProviders";
import { appLanguages, languageLabels, type AppCopy, type AppLanguage, type LanguagePreference } from "../../shared/i18n";
import type { StoryPackage } from "../../shared/linearStory";
import type { JojoPresetRole, PresetRoleSelection, ViralPresetRole } from "../../shared/presetStories";
import type { SettingsAmbientSkinId, SettingsPreviewMode } from "./SettingsDialog";

type MenuId = "file" | "view" | "role" | "language" | "lab" | "help";

type RoleChoice = {
  id: string;
  label: string;
};

type BetaMenuBarProps = {
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
  customModelPanelOpen: boolean;
  fishAutoReadEnabled: boolean;
  switchLink: { href: string; label: string };
  onChoosePreviewMode: (mode: SettingsPreviewMode) => void;
  onSelectAmbientSkin: (skin: SettingsAmbientSkinId) => void;
  onSwitchPresetRole: (selection: Partial<PresetRoleSelection>) => void;
  onChangeLanguage: (preference: LanguagePreference) => void;
  onSelectAiModel: (model: AiModelChoiceId) => void;
  onToggleFishAutoRead: () => void;
  onOpenAdvancedLab: () => void;
  onOpenAbout: () => void;
  onOpenSiteAbout: () => void;
  onExportArchive: () => void;
  onImportArchive: () => void;
};

type MenuItemProps = {
  checked?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  shortcut?: string;
  submenu?: boolean;
  onClick?: () => void;
};

function MenuItem({ checked, disabled, icon, label, shortcut, submenu, onClick }: MenuItemProps) {
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
      <span className="beta-menu-icon" aria-hidden="true">{icon}</span>
      <span className="beta-menu-label">{label}</span>
      {shortcut ? <kbd>{shortcut}</kbd> : null}
      {submenu ? <ChevronRight className="beta-menu-submenu-arrow" size={14} aria-hidden="true" /> : null}
    </button>
  );
}

export function BetaMenuBar({
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
  customModelPanelOpen,
  fishAutoReadEnabled,
  switchLink,
  onChoosePreviewMode,
  onSelectAmbientSkin,
  onSwitchPresetRole,
  onChangeLanguage,
  onSelectAiModel,
  onToggleFishAutoRead,
  onOpenAdvancedLab,
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
    "zh-CN": { file: "文件", view: "显示", role: "角色", language: "语言", lab: "实验室", help: "帮助", interface: "界面版", video: "视频版", background: "背景", aiModel: "AI 模型", custom: "自定义模型...", fish: "Fish 朗读", advanced: "实验室设置...", save: "保存存档", load: "载入存档", support: "支持作者", about: "关于本站" },
    "zh-TW": { file: "檔案", view: "顯示", role: "角色", language: "語言", lab: "實驗室", help: "說明", interface: "介面版", video: "影片版", background: "背景", aiModel: "AI 模型", custom: "自訂模型...", fish: "Fish 朗讀", advanced: "實驗室設定...", save: "儲存存檔", load: "載入存檔", support: "支持作者", about: "關於本站" },
    en: { file: "File", view: "View", role: "Role", language: "Language", lab: "Lab", help: "Help", interface: "Interface", video: "Video", background: "Background", aiModel: "AI model", custom: "Custom model...", fish: "Fish narration", advanced: "Lab settings...", save: "Save archive", load: "Load archive", support: "Support the creator", about: "About this site" },
    ja: { file: "ファイル", view: "表示", role: "役割", language: "言語", lab: "ラボ", help: "ヘルプ", interface: "画面版", video: "動画版", background: "背景", aiModel: "AIモデル", custom: "カスタムモデル...", fish: "Fish 読み上げ", advanced: "ラボ設定...", save: "アーカイブを保存", load: "アーカイブを読込", support: "作者を応援", about: "このサイトについて" }
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

  function choose(action: () => void) {
    action();
    closeCurrentMenu();
  }

  function renderMenu(id: MenuId) {
    if (id === "file") {
      return (
        <>
          <MenuItem icon={<FileDown size={14} />} label={text.save} shortcut="⌘S" onClick={() => choose(onExportArchive)} />
          <MenuItem icon={<FileUp size={14} />} label={text.load} shortcut="⌘I" onClick={() => choose(onImportArchive)} />
          <div className="beta-menu-separator" role="separator" />
          <a className="beta-menu-link" href={switchLink.href} target="_blank" rel="noreferrer" onClick={closeCurrentMenu}>
            <span className="beta-menu-check" />
            <span className="beta-menu-icon"><MonitorPlay size={14} /></span>
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
          <div className="beta-menu-separator" role="separator" />
          <div className="beta-menu-section-label"><Palette size={12} />{text.background}</div>
          {ambientSkins.map((skin) => (
            <MenuItem key={skin.id} checked={ambientSkin === skin.id} label={skin.label} onClick={() => choose(() => onSelectAmbientSkin(skin.id))} />
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

    if (id === "language") {
      return (
        <>
          <MenuItem checked={languagePreference === "auto"} label={`${copy.followBrowser} (${languageLabels[language]})`} onClick={() => choose(() => onChangeLanguage("auto"))} />
          <div className="beta-menu-separator" role="separator" />
          {appLanguages.map((item) => (
            <MenuItem key={item} checked={languagePreference === item} label={languageLabels[item]} onClick={() => choose(() => onChangeLanguage(item))} />
          ))}
        </>
      );
    }

    if (id === "lab") {
      return (
        <>
          <div className="beta-menu-section-label"><FlaskConical size={12} />{text.aiModel}</div>
          {aiProviders.map((provider) => (
            <MenuItem key={provider.id} checked={!customModelPanelOpen && aiProviderId === provider.id} label={provider.label} onClick={() => choose(() => onSelectAiModel(provider.id))} />
          ))}
          <MenuItem checked={customModelPanelOpen} label={text.custom} onClick={() => choose(() => {
            onSelectAiModel("custom");
            onOpenAdvancedLab();
          })} />
          <div className="beta-menu-separator" role="separator" />
          <MenuItem checked={fishAutoReadEnabled} icon={<Volume2 size={14} />} label={text.fish} onClick={() => choose(onToggleFishAutoRead)} />
          <MenuItem icon={<Settings2 size={14} />} label={text.advanced} onClick={() => choose(onOpenAdvancedLab)} />
        </>
      );
    }

    return (
      <>
        <MenuItem icon={<Heart size={14} />} label={text.support} onClick={() => choose(onOpenAbout)} />
        <MenuItem icon={<Info size={14} />} label={text.about} onClick={() => choose(onOpenSiteAbout)} />
      </>
    );
  }

  const menus: Array<{ id: MenuId; label: string; icon: ReactNode }> = [
    { id: "file", label: text.file, icon: <FileDown size={13} /> },
    { id: "view", label: text.view, icon: <MonitorPlay size={13} /> },
    { id: "role", label: text.role, icon: <UserRound size={13} /> },
    { id: "language", label: text.language, icon: <Languages size={13} /> },
    { id: "lab", label: text.lab, icon: <FlaskConical size={13} /> },
    { id: "help", label: text.help, icon: <CircleHelp size={13} /> }
  ];

  return (
    <header ref={rootRef} className="topbar beta-macos-menubar motion-in" aria-label="Beta app menu bar">
      <div className="beta-menu-brand" aria-label={copy.brandName}>{copy.brandName}</div>
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
                <span className="beta-menu-trigger-icon" aria-hidden="true">{menu.icon}</span>
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
      <span className="beta-menu-current-model" title={text.aiModel}>
        {customModelPanelOpen ? text.custom.replace("...", "") : aiProviders.find((provider) => provider.id === aiProviderId)?.label}
      </span>
    </header>
  );
}
