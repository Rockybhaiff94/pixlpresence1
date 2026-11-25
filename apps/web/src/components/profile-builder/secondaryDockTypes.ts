export type SecondaryDockSection = "properties" | "layers" | "add-elements";
export type SecondaryDockEdge = "left" | "right" | "top" | "bottom";
export type SecondaryDockOrientation = "vertical" | "horizontal";

export interface SecondaryDockPosition {
  ratioX: number;
  ratioY: number;
}

export interface SecondaryDockState {
  isPanelOpen: boolean;
  activeSection: SecondaryDockSection;
  isLocked: boolean;
  position: SecondaryDockPosition;
  attachedEdge: SecondaryDockEdge;
}

export interface EditorPanelState {
  propertiesExpanded: boolean;
  layersExpanded: boolean;
  dividerRatio: number;
  propertiesScrollTop: number;
  layersScrollTop: number;
}

export const SECONDARY_DOCK_STORAGE_KEY = "pixel_studio_secondary_dock_state_v1";
export const SECONDARY_PANEL_STORAGE_KEY = "pixel_studio_secondary_panel_state_v1";

export const DEFAULT_SECONDARY_DOCK_STATE: SecondaryDockState = {
  isPanelOpen: false,
  activeSection: "properties",
  isLocked: false,
  position: { ratioX: 0.5, ratioY: 0.5 },
  attachedEdge: "right",
};

export const DEFAULT_EDITOR_PANEL_STATE: EditorPanelState = {
  propertiesExpanded: true,
  layersExpanded: true,
  dividerRatio: 0.54,
  propertiesScrollTop: 0,
  layersScrollTop: 0,
};
