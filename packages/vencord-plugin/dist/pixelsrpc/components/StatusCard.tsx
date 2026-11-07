import { React } from "@webpack/common";
import { ConnectionState } from "../types";

interface StatusCardProps {
    state: ConnectionState;
    tokenConfigured: boolean;
    apiUrl: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({ state, tokenConfigured, apiUrl }) => {
    const getStatusBadge = () => {
        switch (state.status) {
            case "connected":
                return {
                    label: "Connected & Synced",
                    color: "var(--status-positive, #23a55a)",
                    bg: "rgba(35, 165, 90, 0.15)",
                    border: "rgba(35, 165, 90, 0.4)"
                };
            case "connecting":
                return {
                    label: "Connecting / Syncing...",
                    color: "var(--status-warning, #f0b232)",
                    bg: "rgba(240, 178, 50, 0.15)",
                    border: "rgba(240, 178, 50, 0.4)"
                };
            case "unauthorized":
                return {
                    label: "Unauthorized — Invalid Token",
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
                    label: tokenConfigured ? "Idle" : "Awaiting App Token",
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
                padding: "16px",
                border: "1px solid var(--background-tertiary, #1e1f22)",
                marginBottom: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
            }
        },
        React.createElement(
            "div",
            {
                style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px"
                }
            },
            React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "8px" } },
                React.createElement("div", {
                    style: {
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: badge.color,
                        boxShadow: `0 0 6px ${badge.color}`
                    }
                }),
                React.createElement(
                    "span",
                    {
                        style: {
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "var(--header-primary, #f2f3f5)"
                        }
                    },
                    "PixelsRPC Live Status"
                )
            ),
            React.createElement(
                "span",
                {
                    style: {
                        fontSize: "12px",
                        fontWeight: 500,
                        padding: "3px 8px",
                        borderRadius: "12px",
                        color: badge.color,
                        backgroundColor: badge.bg,
                        border: `1px solid ${badge.border}`
                    }
                },
                badge.label
            )
        ),
        React.createElement(
            "div",
            {
                style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "8px",
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "var(--text-muted, #949ba4)"
                }
            },
            React.createElement(
                "div",
                null,
                React.createElement("strong", { style: { color: "var(--text-normal, #dbdee1)" } }, "App Token: "),
                tokenConfigured ? "Configured ✓" : "Not Configured ✗"
            ),
            React.createElement(
                "div",
                null,
                React.createElement("strong", { style: { color: "var(--text-normal, #dbdee1)" } }, "Backend: "),
                apiUrl
            ),
            React.createElement(
                "div",
                null,
                React.createElement("strong", { style: { color: "var(--text-normal, #dbdee1)" } }, "Last Synced: "),
                state.lastSync ? state.lastSync.toLocaleTimeString() : "Never"
            ),
            React.createElement(
                "div",
                null,
                React.createElement("strong", { style: { color: "var(--text-normal, #dbdee1)" } }, "Active Presence: "),
                state.activeTitle || "None"
            )
        )
    );
};

