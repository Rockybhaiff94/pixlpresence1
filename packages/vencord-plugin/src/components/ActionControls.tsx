import { Button, React } from "@webpack/common";

interface ActionControlsProps {
    onSync: () => void;
    onReconnect: () => void;
    onClear: () => void;
    onOpenDashboard: () => void;
    isSyncing: boolean;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
    onSync,
    onReconnect,
    onClear,
    onOpenDashboard,
    isSyncing
}) => {
    return React.createElement(
        "div",
        {
            style: {
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "12px",
                marginBottom: "16px"
            }
        },
        React.createElement(
            Button,
            {
                size: Button.Sizes.SMALL,
                color: Button.Colors.BRAND,
                disabled: isSyncing,
                onClick: onSync
            },
            isSyncing ? "Syncing..." : "Sync Now"
        ),
        React.createElement(
            Button,
            {
                size: Button.Sizes.SMALL,
                color: Button.Colors.PRIMARY,
                onClick: onReconnect
            },
            "Reconnect"
        ),
        React.createElement(
            Button,
            {
                size: Button.Sizes.SMALL,
                color: Button.Colors.RED,
                look: Button.Looks.OUTLINED,
                onClick: onClear
            },
            "Clear Presence"
        ),
        React.createElement(
            Button,
            {
                size: Button.Sizes.SMALL,
                color: Button.Colors.LINK,
                look: Button.Looks.LINK,
                onClick: onOpenDashboard
            },
            "Open Pixel.gg Dashboard ↗"
        )
    );
};

