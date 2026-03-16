import React from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-accent text-bg-primary hover:bg-accent-hover font-semibold",
  secondary: "bg-bg-surface text-text-primary hover:bg-bg-hover border border-border",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
};

const sizes = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button: React.FC<Props> = ({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) => (
  <button
    className={`rounded-lg transition-colors duration-150 cursor-pointer
      disabled:opacity-40 disabled:cursor-not-allowed
      ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {children}
  </button>
);
