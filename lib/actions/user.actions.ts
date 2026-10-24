"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AppwriteException,
  ID,
  Models,
  Permission,
  Role,
} from "node-appwrite";
import { z } from "zod";

import { createAdminClient, createSessionClient } from "../appwrite";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "../plaid";

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

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

const bankRowIdSchema = z.string().trim().min(1);

interface LinkedBankRow extends Models.Row {
  userId: string;
  accessToken: string;
}

export async function createBankUpdateLinkToken(bankRowId: string) {
  const validatedRowId = bankRowIdSchema.parse(bankRowId);
  const { account } = await createSessionClient();
  const user = await account.get();
  const { tables } = await createAdminClient();
  const row = await tables.getRow<LinkedBankRow>({
    databaseId: getRequiredEnv("APPWRITE_Database_ID"),
    tableId: getRequiredEnv("APPWRITE_Bank_Table_ID"),
    rowId: validatedRowId,
  });

  if (row.userId !== user.$id) {
    throw new Error("You are not authorized to update this bank connection.");
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.$id },
      client_name: "NYX Banking",
      access_token: row.accessToken,
      additional_consented_products: [Products.Transactions],
      language: "en",
      country_codes: [CountryCode.Us],
    });

    return response.data.link_token;
  } catch (error) {
    const plaidError = error as {
      response?: {
        status?: number;
        data?: {
          error_code?: string;
          error_message?: string;
          request_id?: string;
        };
      };
    };
    const details = plaidError.response?.data;

    console.error("Plaid update Link token creation failed:", {
      status: plaidError.response?.status,
      errorCode: details?.error_code,
      errorMessage: details?.error_message,
      requestId: details?.request_id,
    });

    throw new Error(
      details?.error_code
        ? `Plaid couldn't prepare this bank connection for update (${details.error_code}).`
        : "Plaid couldn't prepare this bank connection for update. Please try again.",
    );
  }
}

const exchangePlaidInputSchema = z.object({
  publicToken: z.string().min(1),
  accountId: z.string().min(1),
});

export async function createLinkToken() {
  const { account } = await createSessionClient();
  const user = await account.get();

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.$id },
      client_name: "NYX Banking",
      products: [Products.Auth, Products.Transactions],
      language: "en",
      country_codes: [CountryCode.Us],
      ...(process.env.PLAID_REDIRECT_URI
        ? { redirect_uri: process.env.PLAID_REDIRECT_URI }
        : {}),
    });

    return response.data.link_token;
  } catch (error) {
    const plaidError = error as {
      response?: {
        status?: number;
        data?: {
          error_type?: string;
          error_code?: string;
          error_message?: string;
          display_message?: string | null;
          request_id?: string;
        };
      };
    };
    const details = plaidError.response?.data;

    console.error("Plaid link token creation failed:", {
      status: plaidError.response?.status,
      errorType: details?.error_type,
      errorCode: details?.error_code,
      errorMessage: details?.error_message,
      requestId: details?.request_id,
    });

    throw new Error(
      details?.display_message ||
        (details?.error_code
          ? `Plaid could not create a link token (${details.error_code}). Check your Plaid environment, credentials, product access, and redirect URI settings.`
          : "Plaid could not create a link token. Check the server logs for details."),
    );
  }
}

export async function exchangePublicToken(input: {
  publicToken: string;
  accountId: string;
}) {
  const { publicToken, accountId } = exchangePlaidInputSchema.parse(input);
  const { account } = await createSessionClient();
  const user = await account.get();
  const { tables } = await createAdminClient();

  const exchange = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  const accessToken = exchange.data.access_token;
  const accounts = await plaidClient.accountsGet({
    access_token: accessToken,
  });
  const item = await plaidClient.itemGet({ access_token: accessToken });
  const selectedAccount = accounts.data.accounts.find(
    (plaidAccount) => plaidAccount.account_id === accountId,
  );

  if (!selectedAccount || !item.data.item.institution_id) {
    throw new Error("The selected account was not returned by Plaid.");
  }

  await tables.createRow({
    databaseId: getRequiredEnv("APPWRITE_Database_ID"),
    tableId: getRequiredEnv("APPWRITE_Bank_Table_ID"),
    rowId: ID.unique(),
    data: {
      userId: user.$id,
      bankId: item.data.item.institution_id,
      accountId: selectedAccount.account_id,
      accessToken,
      fundingSourceUrl: "",
      shareabaleId: ID.unique(),
    },
    permissions: [Permission.read(Role.user(user.$id))],
  });

  return { success: true };
}