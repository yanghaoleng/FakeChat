import { ArrowUpRight, ChevronDown, FileDown, FileUp, FlaskConical, Globe2, Heart, Info, Settings, UserRound, X } from "lucide-react";
import type { KeyboardEventHandler, RefObject } from "react";
import { appLanguages, languageLabels, type AppCopy, type AppLanguage, type LanguagePreference } from "../../shared/i18n";
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
  storyPackage: StoryPackage;
  activePresetRole: PresetRoleSelection;
  jojoRoleChoices: JojoRoleChoice[];
  viralRoleChoices: ViralRoleChoice[];
  switchLink: { href: string; label: string };
  languagePreference: LanguagePreference;
  resolvedLanguage: AppLanguage;
  copy: AppCopy;
  onClose: () => void;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onSwitchPresetRole: (selection: Partial<PresetRoleSelection>) => void;
  onOpenLab: () => void;
  onOpenAbout: () => void;
  onOpenSiteAbout: () => void;
  onChangeLanguage: (preference: LanguagePreference) => void;
  onExportArchive: () => void;
  onImportArchive: () => void;
};

export function SettingsDialog({
  open,
  closing,
  suspended,
  dialogRef,
  storyPackage,
  activePresetRole,
  jojoRoleChoices,
  viralRoleChoices,
  switchLink,
  languagePreference,
  resolvedLanguage,
  copy,
  onClose,
  onKeyDown,
  onSwitchPresetRole,
  onOpenLab,
  onOpenAbout,
  onOpenSiteAbout,
  onChangeLanguage,
  onExportArchive,
  onImportArchive
}: SettingsDialogProps) {
  const roleSettingLabel = storyPackage === "jojo" ? copy.role : copy.gender;

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
            <h2 id="settings-dialog-title">{copy.settings}</h2>
            <p id="settings-dialog-hint">{copy.settingsHint}</p>
          </div>
          <button className="settings-dialog-close" type="button" aria-label={copy.closeSettings} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="settings-dialog-body">
          <div className="settings-option-list" aria-label={copy.basicSettings}>
            <label className="settings-option-row">
              <span className="settings-option-label">
                <Globe2 size={16} />
                <span>{copy.language}</span>
              </span>
              <span className="settings-option-control">
                <select
                  aria-label={copy.selectLanguage}
                  value={languagePreference}
                  onChange={(event) => onChangeLanguage(event.currentTarget.value as LanguagePreference)}
                >
                  <option value="auto">{copy.followBrowser} · {languageLabels[resolvedLanguage]}</option>
                  {appLanguages.map((language) => (
                    <option key={language} value={language}>{languageLabels[language]}</option>
                  ))}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
            <label className="settings-option-row">
              <span className="settings-option-label">
                <UserRound size={16} />
                <span>{roleSettingLabel}</span>
              </span>
              <span className="settings-option-control">
                {storyPackage === "jojo" ? (
                  <select
                    aria-label={copy.selectRole}
                    value={activePresetRole.jojoRole}
                    onChange={(event) => onSwitchPresetRole({ jojoRole: event.currentTarget.value as JojoPresetRole })}
                  >
                    {jojoRoleChoices.map((character) => (
                      <option key={character.roleId} value={character.roleId}>{character.label}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    aria-label={copy.selectGender}
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
          </div>
          <button className="title-menu-item" type="button" data-settings-lab onClick={onOpenLab}>
            <FlaskConical size={16} />
            <span>{copy.lab}</span>
          </button>
          <a className="title-menu-item" href={switchLink.href} target="_blank" rel="noreferrer" onClick={onClose}>
            <ArrowUpRight size={16} />
            <span>{switchLink.label}</span>
          </a>
          <button className="title-menu-item" type="button" data-settings-about onClick={onOpenAbout}>
            <Heart size={16} />
            <span>{copy.supportAuthor}</span>
          </button>
          <button className="title-menu-item" type="button" data-settings-site-about onClick={onOpenSiteAbout}>
            <Info size={16} />
            <span>{copy.aboutSite}</span>
          </button>
          <div className="title-menu-separator" />
          <button className="title-menu-item" type="button" onClick={onExportArchive}>
            <FileDown size={16} />
            <span>{copy.saveArchive}</span>
            <small>⌘ S</small>
          </button>
          <button className="title-menu-item" type="button" onClick={onImportArchive}>
            <FileUp size={16} />
            <span>{copy.loadArchive}</span>
            <small>⌘ I</small>
          </button>
        </div>
      </section>
    </div>
  );
}
