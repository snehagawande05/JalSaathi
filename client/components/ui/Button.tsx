import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-white text-brand border border-line hover:bg-brand-light",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export default function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
