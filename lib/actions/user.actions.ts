"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppwriteException, ID } from "node-appwrite";
import { z } from "zod";

import { createAdminClient, createSessionClient } from "../appwrite";

interface Credentials {
  email: string;
  password: string;
}

const signUpSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(256),
  firstName: z.string().trim().min(1).max(128),
  lastName: z.string().trim().min(1).max(128),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  dateOfBirth: z.string().min(1),
});

export type SignUpParams = z.infer<typeof signUpSchema>;

const setSessionCookie = async (secret: string, expires: string) => {
  const cookieStore = await cookies();

  cookieStore.set("appwrite-session", secret, {
    expires: new Date(expires),
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
};

export const signIn = async ({ email, password }: Credentials) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession({
      email: email.trim(),
      password,
    });

    await setSessionCookie(session.secret, session.expire);

    return { success: true as const };
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 401) {
      return {
        success: false as const,
        message: "Incorrect email or password. Please try again.",
      };
    }

    console.error("Sign-in failed:", error);
    return {
      success: false as const,
      message: "We couldn't sign you in. Please try again later.",
    };
  }
};

export const signUp = async (userData: SignUpParams) => {
  try {
    const input = signUpSchema.parse(userData);
    const { account, tables, profileTable, profilePermissions } =
      await createAdminClient();
    const {
      email,
      password,
      firstName,
      lastName,
      address,
      city,
      postalCode,
      dateOfBirth,
    } = input;

    let userId: string;
    let session: Awaited<
      ReturnType<typeof account.createEmailPasswordSession>
    > | undefined;

    try {
      const user = await account.create({
        userId: ID.unique(),
        email,
        password,
        name: `${firstName} ${lastName}`,
      });
      userId = user.$id;
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.type !== "user_already_exists") {
        throw error;
      }

      session = await account.createEmailPasswordSession({ email, password });
      userId = session.userId;
    }

    try {
      await tables.getRow({
        ...profileTable,
        rowId: userId,
      });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 404) {
        throw error;
      }

      await tables.createRow({
        ...profileTable,
        rowId: userId,
        data: {
          userId,
          firstName,
          lastName,
          email,
          address,
          city,
          postalCode,
          dateOfBirth,
          ssn: "",
          dwollaCustomerUrl: "",
          dwollaCustomerId: "",
        },
        permissions: profilePermissions(userId),
      });
    }

    session ??= await account.createEmailPasswordSession({ email, password });

    await setSessionCookie(session.secret, session.expire);

    return { success: true };
  } catch (error) {
    if (error instanceof AppwriteException) {
      console.error("Appwrite sign-up failed:", error.code, error.type, error.message);

      if (error.type === "user_invalid_credentials") {
        return {
          success: false,
          message:
            "An account with this email already exists. Sign in with its password or use account recovery.",
        };
      }

      return {
        success: false,
        message: `Appwrite couldn't save your account: ${error.message}`,
      };
    }

    console.error("Sign-up failed with an unexpected error:", error);
    return {
      success: false,
      message: "We couldn't create your account. Please try again later.",
    };
  }
};

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();

    return JSON.parse(JSON.stringify(user)) as typeof user;
  } catch (error) {
    if (error instanceof Error && error.message === "No session") {
      return null;
    }

    if (error instanceof AppwriteException && error.code === 401) {
      return null;
    }

    console.error("Failed to get the logged-in user:", error);
    throw error;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    await account.deleteSession({ sessionId: "current" });
  } catch (error) {
    const hasNoSession =
      (error instanceof Error && error.message === "No session") ||
      (error instanceof AppwriteException && error.code === 401);

    if (!hasNoSession) {
      console.error("Sign-out failed:", error);
      throw error;
    }
  } finally {
    const cookieStore = await cookies();
    cookieStore.delete("appwrite-session");
  }

  redirect("/sign-in");
};