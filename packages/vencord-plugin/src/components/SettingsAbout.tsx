import { Forms, React } from "@webpack/common";
import { ConnectionState } from "../types";
import { ActionControls } from "./ActionControls";
import { StatusCard } from "./StatusCard";

interface SettingsAboutProps {
    state: ConnectionState;
    tokenConfigured: boolean;
    apiUrl: string;
    onSync: () => void;
    onReconnect: () => void;
    onClear: () => void;
}

export const SettingsAbout: React.FC<SettingsAboutProps> = ({
    state,
    tokenConfigured,
    apiUrl,
    onSync,
    onReconnect,
    onClear
}) => {
    const handleOpenDashboard = () => {
        window.open("https://pixlpresence1-web.vercel.app/account/rpc", "_blank");
    };

    return React.createElement(
        "div",
        { style: { marginTop: "16px", marginBottom: "8px" } },
        React.createElement(Forms.FormTitle, { tag: "h5" }, "PixelsRPC Connection"),
        React.createElement(StatusCard, {
            state,
            tokenConfigured,
            apiUrl
        }),
        React.createElement(ActionControls, {
            onSync,
            onReconnect,
            onClear,
            onOpenDashboard: handleOpenDashboard,
            isSyncing: state.status === "connecting"
        }),
        React.createElement(
            Forms.FormText,
            { type: "description", style: { fontSize: "12px", color: "var(--text-muted, #949ba4)" } },
            "Configure your presence and copy your App Token at ",
            React.createElement(
                "a",
                {
                    href: "https://pixlpresence1-web.vercel.app/account/rpc",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    style: { color: "var(--text-link, #00a8fc)", textDecoration: "underline" }
                },
                "pixlpresence1-web.vercel.app/account/rpc"
            ),
            ". PixelsRPC securely connects directly to your backend and updates your local Discord client without modifying external clients."
        )
    );
};

