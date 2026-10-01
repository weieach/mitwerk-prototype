export function VersionPanelSwitch({onClick, target}: {onClick?:()=>void; target:string}) {
 return onClick ? <button type="button" className="version-panel-switch" aria-label={`Show ${target}`} title={`Show ${target}`} onClick={onClick}><i className="ph ph-arrows-left-right" aria-hidden="true"/></button> : null;
}
export const versionPanelLayout = { compactWidth: 650, transitionMs: 160 };
