"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";
import {
  UserRound,
  Mail,
  LockKeyhole,
  MapPin,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

import logo from "../icons/logo.png";
import heroImage from "../icons/auth-hero.jpg";
import CustomInput from "./CustomInput";
import { signIn, signUp } from "@/lib/actions/user.actions";

/* -------------------- Types & constants -------------------- */

type AuthType = "sign-in" | "sign-up";

const GENERIC_ERROR = "Something went wrong. Please try again in a moment.";

/** Latest allowed birth date (user must be 18+), formatted YYYY-MM-DD. */
const maxBirthDate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split("T")[0];
})();

/* -------------------- Validation schemas -------------------- */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

const required = (label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(100, `${label} is too long.`);

const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});

const signUpSchema = z.object({
  firstName: required("First name"),
  lastName: required("Last name"),
  address: required("Address"),
  city: required("City"),
  postalCode: z
    .string()
    .trim()
    .min(3, "Enter a valid postal code.")
    .max(10, "Enter a valid postal code.")
    .regex(/^[A-Za-z0-9\- ]+$/, "Enter a valid postal code."),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((v) => v <= maxBirthDate, "You must be at least 18 years old."),
  email,
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

/* -------------------- Shared helpers -------------------- */

/** Runs a server action and maps failures to a root form error. */
async function runAction<T extends FieldValues>(
  action: () => Promise<{ success: boolean; message?: string }>,
  setError: UseFormSetError<T>,
): Promise<boolean> {
  try {
    const result = await action();
    if (!result.success) {
      setError("root.server" as never, { message: result.message ?? GENERIC_ERROR });
      return false;
    }
    return true;
  } catch {
    setError("root.server" as never, { message: GENERIC_ERROR });
    return false;
  }
}

const FormError = ({ message }: { message?: string }) =>
  message ? (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  ) : null;

const SubmitButton = ({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) => (
  <button
    type="submit"
    disabled={loading}
    aria-busy={loading}
    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  >
    {loading ? (
      <>
        <Loader2 size={17} className="animate-spin" />
        {loadingLabel}
      </>
    ) : (
      <>
        {label}
        <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
      </>
    )}
  </button>
);

/* -------------------- Shared form layout -------------------- */

const AuthForm = ({ type }: { type: string }) => {
  const isSignIn = type === "sign-in";

  return (
    <main className="min-h-screen w-full bg-white lg:grid lg:h-screen lg:grid-cols-[minmax(420px,0.88fr)_minmax(0,1.12fr)]">
      {/* LEFT: Authentication */}
      <section
        className={`relative flex min-h-screen justify-center overflow-y-auto bg-white px-5 py-8 sm:px-10 lg:h-screen lg:px-12 lg:py-10 xl:px-16 ${
          isSignIn ? "items-center" : "items-start"
        } ${isSignIn ? "" : "auth-signup-scrollbar"}`}
      >
        <div className="my-auto w-full max-w-[440px] py-4">
          {/* Brand */}
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
              <Image
                src={logo}
                alt="NYX Banking"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight text-slate-950">
                NYX Banking
              </p>
              <p className="text-xs text-slate-500">
                Your money, simplified
              </p>
            </div>
          </Link>

          {/* Form heading */}
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              {isSignIn ? "Welcome back" : "Get started"}
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {isSignIn
                ? "Good to see you again."
                : "Your financial future starts here."}
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
              {isSignIn
                ? "Sign in to your account and stay in control of your money."
                : "Create your account to manage your money in one secure place."}
            </p>
          </div>

          {/* Existing form components */}
          {isSignIn ? <SignInFields /> : <SignUpFields />}

          {/* Form switch */}
          <p className="mt-7 text-center text-sm text-slate-500">
            {isSignIn
              ? "Don't have an account yet?"
              : "Already have an account?"}{" "}
            <Link
              href={isSignIn ? "/sign-up" : "/sign-in"}
              className="font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              {isSignIn ? "Create an account" : "Sign in"}
            </Link>
          </p>

          {/* Trust note */}
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400">
            <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
            <span>Protected access. Your privacy matters.</span>
          </div>
        </div>
      </section>

      {/* RIGHT: Full-height promotional panel */}
      <aside className="relative hidden min-h-0 overflow-hidden bg-[#07152E] lg:block">
        {/* Background image */}
        <Image
          src={heroImage}
          alt="Modern digital banking experience"
          fill
          priority
          sizes="56vw"
          className="object-cover object-center"
        />

        {/* Contrast overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06142b]/80 via-[#06142b]/25 to-[#06142b]/90" />

        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Promotional content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14 2xl:p-16">
          {/* Top label */}
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium tracking-wide text-white backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              BANKING, REIMAGINED
            </span>

            <span className="text-sm font-semibold tracking-wider text-white/70">
              NYX / 01
            </span>
          </div>

          {/* Main message */}
          <div className="max-w-2xl pb-4">
            <p className="mb-5 text-sm font-semibold tracking-[0.18em] text-cyan-300">
              YOUR MONEY. YOUR FUTURE.
            </p>

            <h2 className="max-w-xl text-4xl font-bold leading-[1.12] tracking-tight text-white xl:text-5xl 2xl:text-6xl">
              A smarter way to
              <span className="block bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                move forward.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-sm leading-7 text-slate-200/90 xl:text-base">
              Manage your finances, move money, and follow your goals with a
              banking experience designed around you.
            </p>

            {/* Feature highlights */}
            <div className="mt-9 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
                  <ArrowRight size={19} />
                </div>
                <p className="text-sm font-semibold text-white">
                  Easy transfers
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Move money with ease.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <ShieldCheck size={19} />
                </div>
                <p className="text-sm font-semibold text-white">
                  Security first
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Account protection matters.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/15 text-blue-300">
                  <ArrowRight size={19} />
                </div>
                <p className="text-sm font-semibold text-white">
                  More control
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Stay on top of spending.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom note */}
          <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs text-slate-300">
            <span>Built for your everyday finances.</span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={15} />
              Security-conscious design
            </span>
          </div>
        </div>
      </aside>
    </main>
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
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    const ok = await runAction(() => signIn(values), setError);
    if (!ok) return;
    router.replace("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <CustomInput<SignInValues>
        name="email"
        label="Email address"
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        icon={Mail}
        register={register}
        error={errors.email?.message}
      />

      <CustomInput<SignInValues>
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
        <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
          Forgot password?
        </Link>
      </div>

      <FormError message={errors.root?.server?.message} />

      <SubmitButton loading={isSubmitting} label="Sign In" loadingLabel="Signing in..." />
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
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      city: "",
      postalCode: "",
      dateOfBirth: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignUpValues) => {
    const ok = await runAction(() => signUp(values), setError);
    if (!ok) return;
    router.replace("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <fieldset className="space-y-5" disabled={isSubmitting}>
        <legend className="sr-only">Personal details</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CustomInput<SignUpValues> name="firstName" label="First name" placeholder="First name" autoComplete="given-name" icon={UserRound} register={register} error={errors.firstName?.message} />
          <CustomInput<SignUpValues> name="lastName" label="Last name" placeholder="Last name" autoComplete="family-name" register={register} error={errors.lastName?.message} />
        </div>

        <CustomInput<SignUpValues> name="address" label="Street address" placeholder="Enter your street address" autoComplete="street-address" icon={MapPin} register={register} error={errors.address?.message} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CustomInput<SignUpValues> name="city" label="City" placeholder="City" autoComplete="address-level2" register={register} error={errors.city?.message} />
          <CustomInput<SignUpValues> name="postalCode" label="Postal code" placeholder="Postal code" autoComplete="postal-code" register={register} error={errors.postalCode?.message} />
        </div>

        <CustomInput<SignUpValues> name="dateOfBirth" label="Date of birth" placeholder="Date of birth" type="date" autoComplete="bday" icon={CalendarDays} register={register} error={errors.dateOfBirth?.message} />

        <CustomInput<SignUpValues> name="email" label="Email address" placeholder="you@example.com" type="email" autoComplete="email" icon={Mail} register={register} error={errors.email?.message} />

        <CustomInput<SignUpValues>
          name="password"
          label="Password"
          placeholder="8+ characters, 1 uppercase, 1 number"
          type="password"
          autoComplete="new-password"
          icon={LockKeyhole}
          register={register}
          error={errors.password?.message}
        />
      </fieldset>

      <p className="text-xs leading-5 text-slate-500">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="font-medium text-blue-600 hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="font-medium text-blue-600 hover:underline">Privacy Policy</Link>.
      </p>

      <FormError message={errors.root?.server?.message} />

      <SubmitButton loading={isSubmitting}  label="Create Account" loadingLabel="Creating account..." />
    </form>
  );
};

export default AuthForm;