import { React } from "@webpack/common";
import { ConnectionState } from "../types";

interface StatusCardProps {
    state: ConnectionState;
    tokenConfigured: boolean;
    linkedUsername?: string | null;
    apiUrl: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
    state,
    tokenConfigured,
    linkedUsername,
    apiUrl
}) => {
    const isConnected = state.status === "connected" && tokenConfigured;
    const displayName = linkedUsername || state.linkedUsername;

    const getStatusBadge = () => {
        switch (state.status) {
            case "connected":
                return {
                    label: "Connected & Active",
                    color: "var(--status-positive, #23a55a)",
                    bg: "rgba(35, 165, 90, 0.15)",
                    border: "rgba(35, 165, 90, 0.4)"
                };
            case "connecting":
                return {
                    label: "Verifying / Syncing...",
                    color: "var(--status-warning, #f0b232)",
                    bg: "rgba(240, 178, 50, 0.15)",
                    border: "rgba(240, 178, 50, 0.4)"
                };
            case "unauthorized":
                return {
                    label: "Unauthorized (Session Expired)",
                    color: "var(--status-danger, #f23f43)",
                    bg: "rgba(242, 63, 67, 0.15)",
                    border: "rgba(242, 63, 67, 0.4)"
                };
            case "error":
                return {
                    label: state.lastError || "Connection Error",
                    color: "var(--status-danger, #f23f43)",
                    bg: "rgba(242, 63, 67, 0.15)",
                    border: "rgba(242, 63, 67, 0.4)"
                };
            case "rate_limited":
                return {
                    label: "Rate Limited (Backing Off)",
                    color: "var(--status-warning, #f0b232)",
                    bg: "rgba(240, 178, 50, 0.15)",
                    border: "rgba(240, 178, 50, 0.4)"
                };
            default:
                return {
                    label: tokenConfigured ? "Idle" : "Not Connected",
                    color: "var(--text-muted, #949ba4)",
                    bg: "rgba(148, 155, 164, 0.15)",
                    border: "rgba(148, 155, 164, 0.3)"
                };
        }
    };

    const badge = getStatusBadge();

    return React.createElement(
        "div",
        {
            style: {
                backgroundColor: "var(--background-secondary, #2b2d31)",
                borderRadius: "8px",
                padding: "14px 16px",
                border: "1px solid var(--background-tertiary, #1e1f22)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "10px",
                marginBottom: "12px"
            }
        },
        // Header Row: Account Status
        React.createElement(
            "div",
            {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }
            },
            React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: "2px" } },
                React.createElement(
                    "span",
                    {
                        style: {
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "var(--text-muted, #949ba4)"
                        }
                    },
                    "Account Status"
                ),
                React.createElement(
                    "span",
                    {
                        style: {
                            fontSize: "14px",
                            fontWeight: 700,
                            color: displayName ? "var(--header-primary, #ffffff)" : "var(--text-muted, #949ba4)"
                        }
                    },
                    displayName ? `Connected: @${displayName}` : "Not Connected"
                )
            ),
            React.createElement(
                "span",
                {
                    style: {
                        color: badge.color,
                        backgroundColor: badge.bg,
                        border: `1px solid ${badge.border}`,
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600
                    }
                },
                badge.label
            )
        ),
        // Active Activity Info
        state.activeTitle &&
            React.createElement(
                "div",
                {
                    style: {
                        fontSize: "12px",
                        color: "var(--text-normal, #dbdee1)",
                        backgroundColor: "var(--background-primary, #313338)",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }
                },
                React.createElement(
                    "span",
                    { style: { color: "var(--status-positive, #23a55a)", fontSize: "14px" } },
                    "●"
                ),
                React.createElement(
                    "span",
                    null,
                    "Broadcasting: ",
                    React.createElement(
                        "strong",
                        { style: { color: "var(--header-primary, #ffffff)" } },
                        state.activeTitle
                    )
                )
            ),
        // Footer: Last Sync
        state.lastSync &&
            React.createElement(
                "div",
                {
                    style: {
                        fontSize: "11px",
                        color: "var(--text-muted, #949ba4)",
                        display: "flex",
                        justifyContent: "space-between"
                    }
                },
                React.createElement("span", null, "Last Sync:"),
                React.createElement(
                    "span",
                    null,
                    state.lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                )
            )
    );
};
