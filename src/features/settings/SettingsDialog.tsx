import { ArrowUpRight, ChevronDown, FileDown, FileUp, Heart, MessageSquarePlus, Settings, Smartphone, Sparkles, UserRound, X } from "lucide-react";
import type { KeyboardEventHandler, RefObject } from "react";
import type { StoryPackage } from "../../shared/linearStory";
import type {
  JojoPresetRole,
  PresetRoleSelection,
  ViralPresetRole
} from "../../shared/presetStories";

export type SettingsAmbientSkinId = "brown" | "grid" | "nightmeadow";
export type SettingsPreviewMode = "wechat" | "video";

type JojoRoleChoice = {
  roleId: JojoPresetRole;
  label: string;
  avatarInitial: string;
  avatarUrl?: string;
};

type ViralRoleChoice = {
  id: ViralPresetRole;
  label: string;
  symbol: string;
};

type SettingsDialogProps = {
  open: boolean;
  closing: boolean;
  suspended: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  previewMode: SettingsPreviewMode;
  storyPackage: StoryPackage;
  activePresetRole: PresetRoleSelection;
  jojoRoleChoices: JojoRoleChoice[];
  viralRoleChoices: ViralRoleChoice[];
  ambientSkins: Array<{ id: SettingsAmbientSkinId; label: string }>;
  ambientSkin: SettingsAmbientSkinId;
  allowMultiSession: boolean;
  multiSessionToggleDisabled: boolean;
  switchLink: { href: string; label: string };
  onClose: () => void;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onChoosePreviewMode: (mode: SettingsPreviewMode) => void;
  onSwitchPresetRole: (selection: Partial<PresetRoleSelection>) => void;
  onSelectAmbientSkin: (skin: SettingsAmbientSkinId) => void;
  onToggleMultiSession: () => void;
  onOpenAbout: () => void;
  onExportArchive: () => void;
  onImportArchive: () => void;
};

export function SettingsDialog({
  open,
  closing,
  suspended,
  dialogRef,
  previewMode,
  storyPackage,
  activePresetRole,
  jojoRoleChoices,
  viralRoleChoices,
  ambientSkins,
  ambientSkin,
  allowMultiSession,
  multiSessionToggleDisabled,
  switchLink,
  onClose,
  onKeyDown,
  onChoosePreviewMode,
  onSwitchPresetRole,
  onSelectAmbientSkin,
  onToggleMultiSession,
  onOpenAbout,
  onExportArchive,
  onImportArchive
}: SettingsDialogProps) {
  if (!open) return null;

  return (
    <div className={closing ? "settings-dialog-layer settings-dialog-layer-closing" : "settings-dialog-layer"}>
      <div className="settings-dialog-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        id="settings-dialog"
        className="settings-dialog"
        role="dialog"
        aria-modal={suspended ? undefined : true}
        aria-hidden={suspended || undefined}
        inert={suspended}
        aria-labelledby="settings-dialog-title"
        aria-describedby="settings-dialog-hint"
        onKeyDown={onKeyDown}
      >
        <header className="settings-dialog-header">
          <span className="settings-dialog-heading-icon" aria-hidden="true"><Settings size={18} /></span>
          <div>
            <h2 id="settings-dialog-title">设置</h2>
            <p id="settings-dialog-hint">预览、角色和背景</p>
          </div>
          <button className="settings-dialog-close" type="button" aria-label="关闭设置" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="settings-dialog-body">
          <div className="settings-option-list" aria-label="基础设置">
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
                <UserRound size={16} />
                <span>角色</span>
              </span>
              <span className="settings-option-control">
                {storyPackage === "jojo" ? (
                  <select
                    aria-label="选择角色"
                    value={activePresetRole.jojoRole}
                    onChange={(event) => onSwitchPresetRole({ jojoRole: event.currentTarget.value as JojoPresetRole })}
                  >
                    {jojoRoleChoices.map((character) => (
                      <option key={character.roleId} value={character.roleId}>{character.label}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    aria-label="选择角色"
                    value={activePresetRole.viralRole}
                    onChange={(event) => onSwitchPresetRole({ viralRole: event.currentTarget.value as ViralPresetRole })}
                  >
                    {viralRoleChoices.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                )}
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
          {storyPackage === "viral" ? (
            <button
              className={allowMultiSession ? "title-menu-item title-menu-toggle title-menu-item-active" : "title-menu-item title-menu-toggle"}
              type="button"
              role="switch"
              aria-label="多会话（测试版）"
              aria-checked={allowMultiSession}
              aria-describedby="multi-session-beta-description"
              disabled={multiSessionToggleDisabled}
              onClick={onToggleMultiSession}
            >
              <MessageSquarePlus size={16} />
              <span className="title-menu-toggle-copy">
                <strong>多会话（测试版）</strong>
                <small id="multi-session-beta-description">允许 DeepSeek 按剧情新增私聊或群聊</small>
              </span>
              <span
                className={allowMultiSession ? "title-menu-toggle-indicator title-menu-toggle-indicator-active" : "title-menu-toggle-indicator"}
                aria-hidden="true"
              />
            </button>
          ) : null}
          <a className="title-menu-item" href={switchLink.href} target="_blank" rel="noreferrer" onClick={onClose}>
            <ArrowUpRight size={16} />
            <span>{switchLink.label}</span>
            <small>切换版本</small>
          </a>
          <button className="title-menu-item" type="button" data-settings-about onClick={onOpenAbout}>
            <Heart size={16} />
            <span>支持作者</span>
            <small>开源与打赏</small>
          </button>
          <div className="title-menu-separator" />
          <button className="title-menu-item" type="button" onClick={onExportArchive}>
            <FileDown size={16} />
            <span>存档</span>
            <small>⌘ S</small>
          </button>
          <button className="title-menu-item" type="button" onClick={onImportArchive}>
            <FileUp size={16} />
            <span>读档</span>
            <small>⌘ I</small>
          </button>
        </div>
      </section>
    </div>
  );
}
