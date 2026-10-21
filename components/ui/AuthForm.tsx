"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  UserRound,
  Mail,
  LockKeyhole,
  MapPin,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

import logo from "../icons/logo.png";
import CustomInput from "./CustomInput";
import { signIn, signUp } from "@/lib/actions/user.actions";

/* -------------------- Validation schemas -------------------- */

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  address: z.string().trim().min(1, "Address is required."),
  city: z.string().trim().min(1, "City is required."),
  state: z.string().trim().min(1, "State is required."),
  postalCode: z.string().trim().min(1, "Postal code is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters."),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

/* -------------------- Shared form layout -------------------- */

const AuthForm = ({ type }: { type: string }) => {
  const isSignIn = type === "sign-in";

  return (
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
      {/* Logo */}
      <header className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <Image
              src={logo}
              alt="NYX Banking logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>

          <div className="text-left">
            <p className="text-xl font-bold tracking-wide text-slate-900">
              NYX Banking
            </p>
            <p className="text-xs text-slate-500">
              Your money, simplified
            </p>
          </div>
        </Link>
      </header>

      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isSignIn ? "Welcome back" : "Create your account"}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isSignIn
            ? "Sign in to manage your finances with confidence."
            : "Join NYX Banking and start managing your finances today."}
        </p>
      </div>

      {isSignIn ? <SignInFields /> : <SignUpFields />}

      {/* Switch between forms */}
      <p className="mt-6 text-center text-sm text-slate-600">
        {isSignIn
          ? "New to NYX Banking?"
          : "Already have an account?"}{" "}
        <Link
          href={isSignIn ? "/sign-up" : "/sign-in"}
          className="font-semibold text-blue-600 transition hover:text-blue-700"
        >
          {isSignIn ? "Create an account" : "Sign in"}
        </Link>
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck size={15} />
        Your security matters to us
      </div>
    </section>
  );
};

/* -------------------- Sign in -------------------- */

const SignInFields = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignInValues) => {
    const result = await signIn(values);
    if (!result.success) {
      setError("root.server", { message: result.message });
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <CustomInput
        name="email"
        label="Email address"
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        icon={Mail}
        register={register}
        error={errors.email?.message}
      />

      <CustomInput
        name="password"
        label="Password"
        placeholder="Enter your password"
        type="password"
        autoComplete="current-password"
        icon={LockKeyhole}
        register={register}
        error={errors.password?.message}
      />

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Forgot password?
        </Link>
      </div>

      {errors.root?.server?.message && (
        <p role="alert" className="text-sm text-red-600">
          {errors.root.server.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
        {!isSubmitting && <ArrowRight size={17} />}
      </button>
    </form>
  );
};

/* -------------------- Sign up -------------------- */

const SignUpFields = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      dateOfBirth: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignUpValues) => {
    try {
      const result = await signUp(values);
      if (!result.success) {
        setError("root.server", { message: result.message });
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("root.server", {
        message: "We couldn't create your account. Please try again later.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CustomInput
          name="firstName"
          label="First name"
          placeholder="First name"
          autoComplete="given-name"
          icon={UserRound}
          register={register}
          error={errors.firstName?.message}
        />

        <CustomInput
          name="lastName"
          label="Last name"
          placeholder="Last name"
          autoComplete="family-name"
          register={register}
          error={errors.lastName?.message}
        />
      </div>

      {/* Address */}
      <CustomInput
        name="address"
        label="Street address"
        placeholder="Enter your street address"
        autoComplete="street-address"
        icon={MapPin}
        register={register}
        error={errors.address?.message}
      />

      {/* City, state, and postal code */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CustomInput
            name="city"
            label="City"
            placeholder="Enter your city"
            autoComplete="address-level2"
            register={register}
            error={errors.city?.message}
          />
        </div>

        <CustomInput
          name="state"
          label="State / Region"
          placeholder="State or region"
          autoComplete="address-level1"
          register={register}
          error={errors.state?.message}
        />

        <CustomInput
          name="postalCode"
          label="Postal code"
          placeholder="Postal code"
          autoComplete="postal-code"
          register={register}
          error={errors.postalCode?.message}
        />
      </div>

      {/* Date of birth */}
      <CustomInput
        name="dateOfBirth"
        label="Date of birth"
        placeholder=""
        type="date"
        autoComplete="bday"
        icon={CalendarDays}
        register={register}
        error={errors.dateOfBirth?.message}
      />

      {/* Email */}
      <CustomInput
        name="email"
        label="Email address"
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        icon={Mail}
        register={register}
        error={errors.email?.message}
      />

      {/* Password */}
      <CustomInput
        name="password"
        label="Password"
        placeholder="Create a password (8+ characters)"
        type="password"
        autoComplete="new-password"
        icon={LockKeyhole}
        register={register}
        error={errors.password?.message}
      />

      <p className="text-xs leading-5 text-slate-500">
        By creating an account, you agree to the applicable terms and
        privacy policy.
      </p>

      {errors.root?.server?.message && (
        <p role="alert" className="text-sm text-red-600">
          {errors.root.server.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating account..." : "Create Account"}
        {!isSubmitting && <ArrowRight size={17} />}
      </button>
    </form>
  );
};

export default AuthForm;