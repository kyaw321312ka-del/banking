"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import type {
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

interface CustomInputProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  placeholder: string;
  type?: string;
  register: UseFormRegister<T>;
  error?: string;
  icon?: LucideIcon;
  autoComplete?: string;
}

const CustomInput = <T extends FieldValues>({
  name,
  label,
  placeholder,
  type = "text",
  register,
  error,
  icon: Icon,
  autoComplete,
}: CustomInputProps<T>) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType =
    isPassword && showPassword ? "text" : type;

  return (
    <div className="w-full">
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div
        className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 transition focus-within:ring-4 ${
          error
            ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-100"
            : "border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-50"
        }`}
      >
        {Icon && (
          <Icon
            size={18}
            className="shrink-0 text-slate-400"
            aria-hidden="true"
          />
        )}

        <input
          id={name}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          {...register(name)}
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="shrink-0 text-slate-400 transition hover:text-slate-700"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <p
          id={`${name}-error`}
          className="mt-1.5 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default CustomInput;