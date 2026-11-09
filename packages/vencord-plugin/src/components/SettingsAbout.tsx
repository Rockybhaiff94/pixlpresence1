import { Forms, React } from "@webpack/common";
import { ConnectionState } from "../types";
import { ActionControls } from "./ActionControls";
import { StatusCard } from "./StatusCard";

interface SettingsAboutProps {
    state: ConnectionState;
    tokenConfigured: boolean;
    linkedUsername?: string | null;
    apiUrl: string;
    onSync: () => void;
    onClear: () => void;
    onLinkAccount: (code: string) => Promise<void>;
    onDisconnectAccount: () => Promise<void>;
}

export const SettingsAbout: React.FC<SettingsAboutProps> = ({
    state,
    tokenConfigured,
    linkedUsername,
    apiUrl,
    onSync,
    onClear,
    onLinkAccount,
    onDisconnectAccount
}) => {
    const handleOpenDashboard = () => {
        const url = apiUrl ? `${apiUrl}/account/rpc` : "https://pixlpresence1-web.vercel.app/account/rpc";
        window.open(url, "_blank");
    };

    return React.createElement(
        "div",
        { style: { marginTop: "16px", marginBottom: "8px" } },
        React.createElement(Forms.FormTitle, { tag: "h5" }, "PixelsRPC Connection"),
        React.createElement(StatusCard, {
            state,
            tokenConfigured,
            linkedUsername,
            apiUrl
        }),
        React.createElement(ActionControls, {
            isConnected: tokenConfigured,
            isSyncing: state.status === "connecting",
            onSync,
            onClear,
            onOpenDashboard: handleOpenDashboard,
            onLinkAccount,
            onDisconnectAccount
        }),
        React.createElement(
            Forms.FormText,
            { type: "description", style: { fontSize: "12px", color: "var(--text-muted, #949ba4)" } },
            "PixelsRPC links your Discord client directly to your PIXEL.GG profile using secure, revocable device credentials. No standalone background desktop apps required."
        )
    );
};
