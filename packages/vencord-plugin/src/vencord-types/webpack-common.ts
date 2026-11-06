import * as React from "react";

export interface Dispatcher {
    dispatch(event: { type: string; [key: string]: any }): void;
    subscribe(type: string, callback: (event: any) => void): void;
    unsubscribe(type: string, callback: (event: any) => void): void;
}

export const FluxDispatcher: Dispatcher = {
    dispatch: () => {},
    subscribe: () => {},
    unsubscribe: () => {}
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    size?: string;
    color?: string;
    look?: string;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode;
}

export interface ButtonComponent extends React.FC<ButtonProps> {
    Sizes: {
        NONE: string;
        TINY: string;
        SMALL: string;
        MEDIUM: string;
        LARGE: string;
        MIN: string;
        MAX: string;
    };
    Colors: {
        BRAND: string;
        RED: string;
        GREEN: string;
        YELLOW: string;
        PRIMARY: string;
        LINK: string;
        WHITE: string;
        TRANSPARENT: string;
    };
    Looks: {
        FILLED: string;
        OUTLINED: string;
        LINK: string;
        BLANK: string;
    };
}

export const Button: ButtonComponent = ((props: ButtonProps) => React.createElement("button", props)) as any;
Button.Sizes = {
    NONE: "",
    TINY: "tiny",
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "large",
    MIN: "min",
    MAX: "max"
};
Button.Colors = {
    BRAND: "brand",
    RED: "red",
    GREEN: "green",
    YELLOW: "yellow",
    PRIMARY: "primary",
    LINK: "link",
    WHITE: "white",
    TRANSPARENT: "transparent"
};
Button.Looks = {
    FILLED: "filled",
    OUTLINED: "outlined",
    LINK: "link",
    BLANK: "blank"
};

export const Forms = {
    FormTitle: (props: any) => React.createElement("div", props),
    FormText: (props: any) => React.createElement("div", props),
    FormDivider: (props: any) => React.createElement("hr", props),
    FormItem: (props: any) => React.createElement("div", props),
    FormNotice: (props: any) => React.createElement("div", props),
    FormSection: (props: any) => React.createElement("div", props)
};

export const Text = (props: any) => React.createElement("span", props);

export { React };
