import { Button } from "@components/Button";
import { React } from "@webpack/common";

interface ActionControlsProps {
    isConnected: boolean;
    isSyncing: boolean;
    onSync: () => void;
    onClear: () => void;
    onOpenDashboard: () => void;
    onLinkAccount: (code: string) => Promise<void>;
    onDisconnectAccount: () => Promise<void>;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
    isConnected,
    isSyncing,
    onSync,
    onClear,
    onOpenDashboard,
    onLinkAccount,
    onDisconnectAccount
}) => {
    const [code, setCode] = React.useState("");
    const [isLinking, setIsLinking] = React.useState(false);
    const [linkError, setLinkError] = React.useState<string | null>(null);

    const handleLink = async () => {
        if (!code.trim()) {
            setLinkError("Please enter the 8-character linking code.");
            return;
        }
        setIsLinking(true);
        setLinkError(null);
        try {
            await onLinkAccount(code.trim().toUpperCase());
            setCode("");
        } catch (err: any) {
            setLinkError(err?.message || "Failed to verify linking code.");
        } finally {
            setIsLinking(false);
        }
    };

    if (!isConnected) {
        return React.createElement(
            "div",
            {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginTop: "8px",
                    marginBottom: "16px",
                    padding: "14px",
                    backgroundColor: "var(--background-secondary-alt, #1e1f22)",
                    borderRadius: "8px",
                    border: "1px dashed var(--background-tertiary, #35373c)"
                }
            },
            React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: "2px" } },
                React.createElement(
                    "span",
                    {
                        style: {
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "var(--header-primary, #ffffff)"
                        }
                    },
                    "Connect your PIXEL.GG Account"
                ),
                React.createElement(
                    "span",
                    {
                        style: {
                            fontSize: "11px",
                            color: "var(--text-muted, #949ba4)"
                        }
                    },
                    "Generate a 2-minute linking code in your web dashboard, then enter it below."
                )
            ),
            React.createElement(
                "div",
                {
                    style: {
                        display: "flex",
                        gap: "8px",
                        alignItems: "center"
                    }
                },
                React.createElement(
                    "input",
                    {
                        type: "text",
                        placeholder: "e.g. ABCD-1234",
                        value: code,
                        onChange: (e: any) => setCode(e.target.value.toUpperCase()),
                        maxLength: 12,
                        style: {
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: "4px",
                            backgroundColor: "var(--input-background, #1e1f22)",
                            color: "var(--text-normal, #dbdee1)",
                            border: "1px solid var(--background-tertiary, #3b3e45)",
                            fontFamily: "monospace",
                            fontSize: "13px",
                            letterSpacing: "1.5px",
                            textTransform: "uppercase"
                        }
                    }
                ),
                React.createElement(
                    Button,
                    {
                        variant: "primary",
                        size: "small",
                        disabled: isLinking || !code.trim(),
                        onClick: handleLink
                    },
                    isLinking ? "Verifying..." : "Link Account"
                )
            ),
            linkError &&
                React.createElement(
                    "span",
                    {
                        style: {
                            fontSize: "11px",
                            color: "var(--status-danger, #f23f43)",
                            fontWeight: 600
                        }
                    },
                    linkError
                ),
            React.createElement(
                "div",
                { style: { marginTop: "4px" } },
                React.createElement(
                    Button,
                    {
                        variant: "link",
                        size: "xs",
                        onClick: onOpenDashboard
                    },
                    "Open PIXEL.GG to generate linking code →"
                )
            )
        );
    }

    // Connected State Controls
    return React.createElement(
        "div",
        {
            style: {
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "10px",
                marginBottom: "16px"
            }
        },
        React.createElement(
            Button,
            {
                variant: "primary",
                size: "small",
                disabled: isSyncing,
                onClick: onSync
            },
            isSyncing ? "Syncing..." : "Sync Now"
        ),
        React.createElement(
            Button,
            {
                variant: "dangerSecondary",
                size: "small",
                onClick: onClear
            },
            "Clear Presence"
        ),
        React.createElement(
            Button,
            {
                variant: "secondary",
                size: "small",
                onClick: onOpenDashboard
            },
            "Open Studio"
        ),
        React.createElement(
            Button,
            {
                variant: "link",
                size: "small",
                onClick: onDisconnectAccount,
                style: { color: "var(--status-danger, #f23f43)" }
            },
            "Disconnect Account"
        )
    );
};
