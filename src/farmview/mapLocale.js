// The map library's own button labels and tooltips ("Zoom in"...), in the visitor's language.
// Handed to new maplibregl.Map({ locale: mapLocale() }); only the texts the app shows are listed.

import { t } from "../i18n";

export const mapLocale = () => ({
  "AttributionControl.ToggleAttribution": t("mapControls.toggleAttribution"),
  "AttributionControl.MapFeedback": t("mapControls.mapFeedback"),
  "Map.Title": t("mapControls.map"),
  "Marker.Title": t("mapControls.marker"),
  "NavigationControl.ResetBearing": t("mapControls.resetBearing"),
  "NavigationControl.ZoomIn": t("mapControls.zoomIn"),
  "NavigationControl.ZoomOut": t("mapControls.zoomOut"),
  "Popup.Close": t("mapControls.closePopup"),
});
