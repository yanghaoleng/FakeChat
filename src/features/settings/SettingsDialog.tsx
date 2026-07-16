import { ArrowUpRight, FileDown, FileUp, Info, MessageSquarePlus, Settings, Smartphone, Sparkles, Video, X } from "lucide-react";
import type { KeyboardEventHandler, RefObject } from "react";
import type { StoryPackage } from "../../shared/linearStory";
import { resolvePublicAssetPath } from "../../shared/publicPath";
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
            <p id="settings-dialog-hint">方向键切换，回车确认</p>
          </div>
          <button className="settings-dialog-close" type="button" aria-label="关闭设置" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="settings-dialog-body">
          <div className="title-menu-tabs" role="tablist" aria-label="预览模式">
            <button
              className={previewMode === "wechat" ? "title-menu-tab title-menu-tab-active" : "title-menu-tab"}
              type="button"
              role="tab"
              aria-selected={previewMode === "wechat"}
              onClick={() => onChoosePreviewMode("wechat")}
            >
              <Smartphone size={15} />
              <span>界面版</span>
            </button>
            <button
              className={previewMode === "video" ? "title-menu-tab title-menu-tab-active" : "title-menu-tab"}
              type="button"
              role="tab"
              aria-selected={previewMode === "video"}
              onClick={() => onChoosePreviewMode("video")}
            >
              <Video size={15} />
              <span>视频版</span>
            </button>
          </div>
          <div className="title-menu-panel" role="group" aria-label="选择角色">
            {storyPackage === "jojo" ? (
              <div className="title-role-avatar-grid">
                {jojoRoleChoices.map((character) => (
                  <button
                    key={character.roleId}
                    className={activePresetRole.jojoRole === character.roleId ? "title-role-avatar title-role-avatar-active" : "title-role-avatar"}
                    type="button"
                    onClick={() => onSwitchPresetRole({ jojoRole: character.roleId })}
                    aria-pressed={activePresetRole.jojoRole === character.roleId}
                  >
                    {character.avatarUrl ? <img src={resolvePublicAssetPath(character.avatarUrl)} alt="" /> : <span className="title-role-avatar-fallback">{character.avatarInitial}</span>}
                    <strong>{character.label}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <div className="title-role-avatar-grid title-role-symbol-grid">
                {viralRoleChoices.map((option) => (
                  <button
                    key={option.id}
                    className={activePresetRole.viralRole === option.id ? "title-role-avatar title-role-avatar-active" : "title-role-avatar"}
                    type="button"
                    onClick={() => onSwitchPresetRole({ viralRole: option.id })}
                    aria-pressed={activePresetRole.viralRole === option.id}
                    aria-label={option.label}
                    title={option.label}
                  >
                    <span className="title-role-symbol" aria-hidden="true">{option.symbol}</span>
                    <strong>{option.label}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="title-menu-panel title-ambient-panel" role="group" aria-label="切换背景">
            <div className="title-menu-section-label">
              <Sparkles size={14} />
              <span>背景</span>
            </div>
            <div className="title-ambient-grid">
              {ambientSkins.map((skin) => (
                <button
                  key={skin.id}
                  className={ambientSkin === skin.id ? "title-ambient-option title-ambient-option-active" : "title-ambient-option"}
                  type="button"
                  aria-pressed={ambientSkin === skin.id}
                  onClick={() => onSelectAmbientSkin(skin.id)}
                >
                  <span>{skin.label}</span>
                </button>
              ))}
            </div>
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
            <Info size={16} />
            <span>关于</span>
            <small>联系与支持</small>
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
