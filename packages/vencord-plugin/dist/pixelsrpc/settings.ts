import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    deviceToken: {
        type: OptionType.STRING,
        description: "Secure Device Credential (managed automatically by Link Account)",
        default: "",
        restartNeeded: false
    },
    linkedUsername: {
        type: OptionType.STRING,
        description: "Connected PIXEL.GG Account",
        default: "",
        restartNeeded: false
    },
    apiUrl: {
        type: OptionType.STRING,
        description: "Pixel.gg API URL (e.g. https://pixlpresence1-web.vercel.app)",
        default: "https://pixlpresence1-web.vercel.app",
        restartNeeded: false
    },
    token: {
        type: OptionType.STRING,
        description: "Manual App Token (optional alternative to Quick Link)",
        default: "",
        restartNeeded: false
    },
    refreshInterval: {
        type: OptionType.NUMBER,
        description: "Sync interval in seconds (minimum 5s, recommended 15s)",
        default: 15,
        restartNeeded: false
    },
    activityVisibility: {
        type: OptionType.BOOLEAN,
        description: "Enable Rich Presence activity broadcast on your Discord profile",
        default: true,
        restartNeeded: false
    },
    fallbackAppName: {
        type: OptionType.STRING,
        description: "Default application name if not set on your web profile",
        default: "Pixel.gg",
        restartNeeded: false
    },
    showButtons: {
        type: OptionType.BOOLEAN,
        description: "Display custom profile links / buttons on your presence",
        default: true,
        restartNeeded: false
    },
    showTimestamps: {
        type: OptionType.BOOLEAN,
        description: "Display start / elapsed timestamps on your presence",
        default: true,
        restartNeeded: false
    },
    debugLogging: {
        type: OptionType.BOOLEAN,
        description: "Enable debug logs in Developer Tools console for troubleshooting",
        default: false,
        restartNeeded: false
    }
});
