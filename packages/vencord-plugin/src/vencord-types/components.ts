import * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "dangerPrimary" | "dangerSecondary" | "overlayPrimary" | "positive" | "link" | "none";
export type ButtonSize = "min" | "xs" | "small" | "medium" | "iconOnly";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = (props) => React.createElement("button", props);

export type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
    tag?: HeadingTag;
    children?: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({ tag = "h5", ...rest }) => React.createElement(tag, rest);

export interface ParagraphProps extends React.HTMLAttributes<HTMLParagraphElement> {
    children?: React.ReactNode;
}

export const Paragraph: React.FC<ParagraphProps> = (props) => React.createElement("p", props);

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: string;
    children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = (props) => React.createElement("div", props);

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
    flexDirection?: string;
    gap?: string;
    children?: React.ReactNode;
}

export const Flex: React.FC<FlexProps> = (props) => React.createElement("div", props);
