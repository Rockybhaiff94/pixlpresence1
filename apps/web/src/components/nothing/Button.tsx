import React from "react";
import Link from "next/link";

export type ButtonVariant =
  | "solid-white"
  | "solid-black"
  | "surface"
  | "outline"
  | "ghost"
  | "text"
  | "icon"
  | "circular"
  | "destructive"
  | "premium"
  | "compact"
  | "fab";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
  external?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "solid-white",
  href,
  external,
  icon,
  loading,
  className = "",
  children,
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "solid-white":
        return "bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium border border-white shadow-sm";
      case "solid-black":
        return "bg-black text-white hover:bg-neutral-900 active:bg-neutral-800 border border-neutral-700";
      case "surface":
        return "bg-[#181818] text-white hover:bg-[#222222] active:bg-[#282828] border border-[#2a2a2a]";
      case "outline":
        return "bg-transparent text-white hover:bg-white/10 active:bg-white/15 border border-white/30 hover:border-white/60";
      case "ghost":
        return "bg-transparent text-neutral-400 hover:text-white hover:bg-white/5 active:bg-white/10 border border-transparent";
      case "text":
        return "bg-transparent text-neutral-300 hover:text-white underline underline-offset-4 border-none p-0";
      case "icon":
        return "w-10 h-10 p-0 flex items-center justify-center bg-[#141414] hover:bg-[#202020] text-neutral-300 hover:text-white border border-[#262626] rounded-md";
      case "circular":
        return "w-11 h-11 p-0 flex items-center justify-center rounded-full bg-[#181818] hover:bg-[#252525] text-white border border-[#333333]";
      case "destructive":
        return "bg-transparent text-[#d71920] hover:bg-[#d71920]/10 border border-[#d71920]/40 hover:border-[#d71920]";
      case "premium":
        return "bg-white text-black hover:bg-neutral-100 font-mono tracking-tight border border-white relative overflow-hidden";
      case "compact":
        return "px-3 py-1 text-xs bg-[#161616] text-neutral-200 hover:bg-[#242424] border border-[#2e2e2e] rounded";
      case "fab":
        return "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full bg-white text-black hover:bg-neutral-200 shadow-2xl font-mono text-xs tracking-wider uppercase border border-white flex items-center gap-2";
      default:
        return "bg-white text-black hover:bg-neutral-200 border border-white";
    }
  };

  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-mono text-sm tracking-tight transition-all duration-150 select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]";

  const sizeStyles =
    variant === "icon" || variant === "circular" || variant === "text" || variant === "compact" || variant === "fab"
      ? ""
      : "px-5 py-2.5 rounded-lg";

  const combinedClasses = `${baseStyles} ${sizeStyles} ${getVariantStyles()} ${className}`;

  const content = (
    <>
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={combinedClasses}
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={combinedClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
};

