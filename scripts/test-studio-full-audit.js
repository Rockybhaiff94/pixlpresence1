const fs = require('fs');
const path = require('path');

const webPath = path.join(__dirname, '../apps/web/src');
const studioTypes = fs.readFileSync(path.join(webPath, 'types/studio.ts'), 'utf8');
const leftWorkspace = fs.readFileSync(path.join(webPath, 'components/studio/StudioLeftWorkspace.tsx'), 'utf8');
const floatingDock = fs.readFileSync(path.join(webPath, 'components/studio/StudioFloatingDock.tsx'), 'utf8');
const canvasRenderer = fs.readFileSync(path.join(webPath, 'components/studio/CanvasObjectRenderer.tsx'), 'utf8');
const profilePreview = fs.readFileSync(path.join(webPath, 'components/studio/StudioProfilePreview.tsx'), 'utf8');
const pageCustomize = fs.readFileSync(path.join(webPath, 'app/customize/page.tsx'), 'utf8');
const profileClientView = fs.readFileSync(path.join(webPath, 'components/nothing/ProfileClientView.tsx'), 'utf8');

const findings = [];

function check(category, title, condition, severity, description) {
  if (!condition) {
    findings.push({ category, title, severity, description, status: 'FAIL' });
  } else {
    findings.push({ category, title, severity, description, status: 'PASS' });
  }
}

console.log('--- STARTING 18-CATEGORY AUDIT ---');

// Cat 1: Layout & Structure
check('1. Layout & Structure', 'Layout sliders in StudioLeftWorkspace', 
  leftWorkspace.includes('config.layout.maxWidth') && leftWorkspace.includes('config.layout.padding'),
  'HIGH', 'Layout controls exist in LeftWorkspace'
);

// Check if CanvasObjectRenderer synchronizes primary embed width/padding with config.layout
const syncsEmbedWidth = canvasRenderer.includes('config.layout.maxWidth') || 
  canvasRenderer.includes('config.layout?.maxWidth');
check('1. Layout & Structure', 'CanvasObjectRenderer syncs primary embed with config.layout.maxWidth',
  syncsEmbedWidth,
  'HIGH', 'Primary embed in Canvas mode should respect config.layout.maxWidth when not manually customized'
);

const syncsEmbedPadding = canvasRenderer.includes('config.layout.padding') || 
  canvasRenderer.includes('config.layout?.padding');
check('1. Layout & Structure', 'CanvasObjectRenderer syncs primary embed with config.layout.padding',
  syncsEmbedPadding,
  'HIGH', 'Primary embed in Canvas mode should respect config.layout.padding when not manually customized'
);

// Cat 2: Profile Identity & Avatar
check('2. Profile Identity & Avatar', 'Avatar controls in StudioLeftWorkspace',
  leftWorkspace.includes('config.avatar.shape') && leftWorkspace.includes('config.avatar.size'),
  'HIGH', 'Avatar controls exist in LeftWorkspace'
);

// Cat 3: Typography & Fonts
const textInheritsFont = canvasRenderer.includes('config.typography') || canvasRenderer.includes('config.identity?.titleFont');
check('3. Typography & Fonts', 'Canvas text elements inherit global typography',
  textInheritsFont,
  'HIGH', 'Canvas text elements should dynamically inherit headingFont, bodyFont, and identity fonts when hasCustomTypographyOverride is false'
);

// Cat 4: Discord Rich Presence
const rpcIndependentSwitches = pageCustomize.includes('showProfileRpc') && pageCustomize.includes('enableDiscordRpc');
check('4. Discord Rich Presence', 'Independent website & Discord RPC switches',
  rpcIndependentSwitches,
  'HIGH', 'RPC switches are independent in state and API calls'
);

// Cat 5: Background Customization
check('5. Background Customization', 'Background modal & customizer integration',
  leftWorkspace.includes('BackgroundCustomizerModal') || leftWorkspace.includes('isBgModalOpen'),
  'HIGH', 'Background modal is integrated into workspace'
);

// Cat 6: Buttons & Links
check('6. Buttons & Links', 'Buttons config in LeftWorkspace and Canvas',
  leftWorkspace.includes('config.buttons.variant') && canvasRenderer.includes('case "button":'),
  'HIGH', 'Button variants and styling exist and render in canvas'
);

// Cat 7: Social Integrations
check('7. Social Integrations', 'Social account selection & canvas placement',
  pageCustomize.includes('handleAddSocialIcon') && pageCustomize.includes('handleAddSocialPill'),
  'HIGH', 'Social icons can be added to canvas from account selector'
);

// Cat 8: Visual Effects & Particles
check('8. Visual Effects', 'Particles canvas & effect toggles',
  profilePreview.includes('ParticlesCanvas') && leftWorkspace.includes('config.effects.glassmorphism'),
  'HIGH', 'Visual effects & particles properly configured and rendered'
);

// Cat 9: Embed Editor & Components
check('9. Embed Editor', 'Multi-embed support in CanvasObjectRenderer',
  canvasRenderer.includes('embeds.map') && pageCustomize.includes('handleAddEmbed'),
  'HIGH', 'Multi-embed creation and rendering in canvas'
);

// Cat 10: Layer Management
check('10. Layer Management', 'Layer visibility, locking & ordering',
  pageCustomize.includes('handleToggleLayerVisibility') && pageCustomize.includes('handleToggleLayerLock') && pageCustomize.includes('handleMoveLayer'),
  'HIGH', 'Layer management actions implemented in page'
);

// Cat 11: Templates & Presets
const templateSyncsCanvas = pageCustomize.includes('updateConfigWithHistory') && 
  pageCustomize.includes('synchronizedCanvas = next.canvas');
check('11. Templates & Presets', 'Template application synchronizes canvas elements',
  templateSyncsCanvas,
  'MEDIUM', 'Applying a template should synchronize canvas colors, typography and dimensions'
);

// Cat 12: Advanced Settings
check('12. Advanced Settings', 'More Options panel size (40-100%)',
  floatingDock.includes('panelSize') && leftWorkspace.includes('moreOptionsPanelSize'),
  'HIGH', 'More Options panel resizing supported'
);

// Cat 13: Workspace Appearance & Transparency
check('13. Workspace Appearance', 'Transparency modes (solid, transparent, glass, floating)',
  leftWorkspace.includes('case "glass":') && leftWorkspace.includes('case "floating":'),
  'MEDIUM', 'Transparency modes properly styled in workspace'
);

// Cat 14: Floating Dock Customization
check('14. Floating Dock Customization', 'Dock position, lock & size customization',
  floatingDock.includes('isDockLocked') && floatingDock.includes('dockLockShortcut'),
  'HIGH', 'Floating dock controls and shortcuts properly implemented'
);

// Cat 15: Dock Positioning & Snapping
check('15. Dock Snapping', 'Dock edge snapping and free float',
  floatingDock.includes('snapThreshold') && floatingDock.includes('handlePointerDown'),
  'HIGH', 'Dock dragging and edge snapping implemented'
);

// Cat 16: Preview Controls & Device Modes
check('16. Preview Controls', 'Device modes (desktop, tablet, mobile) and fullscreen',
  pageCustomize.includes('deviceMode') && pageCustomize.includes('isFullscreenPreview'),
  'HIGH', 'Device mode switcher and fullscreen preview functional'
);

// Cat 17: Save, Reset, Undo & Redo
check('17. Save, Reset, Undo/Redo', 'Undo, Redo, Reset and Save Draft / Publish',
  pageCustomize.includes('handleUndo') && pageCustomize.includes('handleRedo') && pageCustomize.includes('handleResetToDefault') && pageCustomize.includes('executeSave'),
  'CRITICAL', 'Core state history and persistence lifecycle functional'
);

// Cat 18: Publishing & Live Sync
check('18. Publishing & Live Sync', 'ProfileClientView parses and renders designConfig',
  profileClientView.includes('activeConfig: ProfileDesignConfig') && profileClientView.includes('StudioProfilePreview'),
  'CRITICAL', 'Published live profile renders exact studio design configuration'
);

console.log('\n--- AUDIT RESULTS ---');
const passed = findings.filter(f => f.status === 'PASS');
const failed = findings.filter(f => f.status === 'FAIL');

console.log(`Passed: ${passed.length} / ${findings.length}`);
console.log(`Failed: ${failed.length} / ${findings.length}\n`);

if (failed.length > 0) {
  console.log('FAILURES DETECTED:');
  failed.forEach(f => console.log(`[${f.severity}] ${f.category} - ${f.title}: ${f.description}`));
}
