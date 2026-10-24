"use server";

import {
  AppwriteException,
  Models,
  Permission,
  Query,
  Role,
} from "node-appwrite";
import { z } from "zod";

import { createAdminClient, createSessionClient } from "../appwrite";
import {
  createDwollaBalanceTransfer,
  createTransfer,
} from "./dwolla.actions";

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const createTransactionSchema = z.object({
  senderAccountId: z.string().trim().min(1).max(100),
  recipientEmail: z.string().trim().email().max(320),
  recipientShareableId: z.string().trim().min(1).max(100),
  idempotencyKey: z.string().uuid(),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to two decimals.")
    .refine((amount) => Number(amount) > 0, "Amount must be greater than zero.")
    .refine(
      (amount) => Number(amount) <= 1_000_000,
      "Amount cannot exceed $1,000,000.",
    ),
  note: z.string().trim().max(100).optional(),
});

const createDwollaBalanceTransactionSchema = z.object({
  destinationBankRowId: z.string().trim().min(1).max(100),
  idempotencyKey: z.string().uuid(),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to two decimals.")
    .refine((amount) => Number(amount) > 0, "Amount must be greater than zero.")
    .refine(
      (amount) => Number(amount) <= 1_000_000,
      "Amount cannot exceed $1,000,000.",
    ),
  note: z.string().trim().max(100).optional(),
});

export type CreateTransactionProps = z.infer<
  typeof createTransactionSchema
>;

interface BankRow extends Models.Row {
  userId: string;
  accountId: string;
  shareabaleId: string;
  fundingSourceUrl: string;
}

interface UserProfileRow extends Models.Row {
  dwollaCustomerUrl: string;
}

export async function createDwollaBalanceTransaction(input: {
  destinationBankRowId: string;
  idempotencyKey: string;
  amount: string;
  note?: string;
}) {
  const values = createDwollaBalanceTransactionSchema.parse(input);
  const { account } = await createSessionClient();
  const sender = await account.get();
  const { tables, profileTable } = await createAdminClient();
  const databaseId = getRequiredEnv("APPWRITE_Database_ID");
  const bankTableId = getRequiredEnv("APPWRITE_Bank_Table_ID");
  const transactionTableId = getRequiredEnv("APPWRITE_Transaction_Table_ID");

  try {
    await tables.getRow({
      databaseId,
      tableId: transactionTableId,
      rowId: values.idempotencyKey,
    });
    throw new Error(
      "This transfer request was already submitted. Check your transaction history before trying again.",
    );
  } catch (error) {
    if (
      !(error instanceof AppwriteException) ||
      error.code !== 404
    ) {
      throw error;
    }
  }

  const [profile, destinationBank] = await Promise.all([
    tables.getRow<UserProfileRow>({
      ...profileTable,
      rowId: sender.$id,
    }),
    tables.getRow<BankRow>({
      databaseId,
      tableId: bankTableId,
      rowId: values.destinationBankRowId,
    }),
  ]);

  if (destinationBank.userId !== sender.$id) {
    throw new Error("You can only transfer to one of your own bank accounts.");
  }
  if (!destinationBank.fundingSourceUrl) {
    throw new Error(
      "The selected destination bank is not set up for Dwolla transfers yet.",
    );
  }
  if (!profile.dwollaCustomerUrl?.trim()) {
    throw new Error("Your Dwolla customer account is not set up yet.");
  }

  const matchingSources = await tables.listRows<BankRow>({
    databaseId,
    tableId: bankTableId,
    queries: [
      Query.equal("userId", sender.$id),
      Query.equal("fundingSourceUrl", destinationBank.fundingSourceUrl),
      Query.limit(2),
    ],
    total: false,
    ttl: 0,
  });
  if (
    matchingSources.rows.some((row) => row.$id !== destinationBank.$id)
  ) {
    throw new Error(
      "This destination shares a Dwolla funding source with another linked account. Resolve the account mapping in My Banks before transferring.",
    );
  }

  const amount = Number(values.amount).toFixed(2);
  const { transferUrl } = await createDwollaBalanceTransfer({
    customerUrl: profile.dwollaCustomerUrl,
    destinationFundingSourceUrl: destinationBank.fundingSourceUrl,
    amount,
    idempotencyKey: values.idempotencyKey,
  });

  try {
    const transaction = await tables.createRow({
      databaseId,
      tableId: transactionTableId,
      rowId: values.idempotencyKey,
      data: {
        name: values.note || "Transfer from Dwolla Balance",
        amount,
        channel: "online",
        category: "Transfer",
        senderId: sender.$id,
        recieverId: sender.$id,
        senderBankId: "Dwolla Balance",
        receiverBankId: destinationBank.$id,
        email: sender.email.toLowerCase(),
      },
      permissions: [Permission.read(Role.user(sender.$id))],
    });

    return {
      success: true as const,
      transactionId: transaction.$id,
      message: "Transfer initiated from your Dwolla Balance to your bank.",
    };
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) {
      return {
        success: true as const,
        transactionId: values.idempotencyKey,
        message: "Transfer initiated from your Dwolla Balance to your bank.",
      };
    }

    console.error("Dwolla Balance transfer started but its record failed:", {
      error,
      transferUrl,
      transactionId: values.idempotencyKey,
    });
    throw new Error(
      "The transfer was initiated, but its history record could not be saved. Do not submit again; contact support with the transfer time.",
    );
  }
}

export async function createTransaction(input: CreateTransactionProps) {
  const values = createTransactionSchema.parse(input);
  const { account } = await createSessionClient();
  const sender = await account.get();
  const { tables, users } = await createAdminClient();
  const databaseId = getRequiredEnv("APPWRITE_Database_ID");
  const bankTableId = getRequiredEnv("APPWRITE_Bank_Table_ID");
  const transactionTableId = getRequiredEnv("APPWRITE_Transaction_Table_ID");

  try {
    const existingTransaction = await tables.getRow({
      databaseId,
      tableId: transactionTableId,
      rowId: values.idempotencyKey,
    });

    if (existingTransaction) {
      throw new Error(
        "This transfer request was already submitted. Check your transaction history before trying again.",
      );
    }
  } catch (error) {
    if (
      !(error instanceof AppwriteException) ||
      error.code !== 404
    ) {
      throw error;
    }
  }

  const [senderBankResult, receiverBankResult] = await Promise.all([
    tables.listRows<BankRow>({
      databaseId,
      tableId: bankTableId,
      queries: [
        Query.equal("userId", sender.$id),
        Query.equal("accountId", values.senderAccountId),
        Query.limit(1),
      ],
      total: false,
      ttl: 0,
    }),
    tables.listRows<BankRow>({
      databaseId,
      tableId: bankTableId,
      queries: [
        Query.equal("shareabaleId", values.recipientShareableId),
        Query.limit(1),
      ],
      total: false,
      ttl: 0,
    }),
  ]);

  const senderBank = senderBankResult.rows[0];
  if (!senderBank) {
    throw new Error("The selected source bank account is not linked to you.");
  }
  if (!senderBank.fundingSourceUrl) {
    throw new Error(
      "This source bank is linked to Plaid but does not have a Dwolla funding source yet. Complete Dwolla bank setup before transferring.",
    );
  }

  const receiverBank = receiverBankResult.rows[0];
  if (!receiverBank) {
    throw new Error(
      "Bank shareable ID not found. Ask the recipient to copy the Bank shareable ID from My Banks; it is different from the Plaid account ID.",
    );
  }
  if (!receiverBank.fundingSourceUrl) {
    throw new Error(
      "The recipient bank is not set up to receive transfers yet. Ask the recipient to complete Dwolla bank setup.",
    );
  }

  const receiver = await users.get({ userId: receiverBank.userId });
  if (receiver.email.toLowerCase() !== values.recipientEmail.toLowerCase()) {
    throw new Error(
      "The recipient email does not match the owner of that shareable ID.",
    );
  }

  if (receiverBank.$id === senderBank.$id) {
    throw new Error(
      "The destination shareable ID is for your selected source account. Choose another bank account that you own.",
    );
  }
  if (senderBank.fundingSourceUrl === receiverBank.fundingSourceUrl) {
    throw new Error(
      "Both bank records point to the same Dwolla funding source, so this transfer cannot be made. Set up a different destination bank account or contact support if these should be separate accounts.",
    );
  }

  const amount = Number(values.amount).toFixed(2);
  const transferUrl = await createTransfer({
    sourceFundingSourceUrl: senderBank.fundingSourceUrl,
    destinationFundingSourceUrl: receiverBank.fundingSourceUrl,
    amount,
    idempotencyKey: values.idempotencyKey,
  });
  const isSelfTransfer = receiver.$id === sender.$id;
  const name =
    values.note ||
    (isSelfTransfer
      ? "Transfer between your bank accounts"
      : `Transfer to ${receiver.name}`);

  try {
    const transaction = await tables.createRow({
      databaseId,
      tableId: transactionTableId,
      rowId: values.idempotencyKey,
      data: {
        name,
        amount,
        channel: "online",
        category: "Transfer",
        senderId: sender.$id,
        recieverId: receiver.$id,
        senderBankId: senderBank.$id,
        receiverBankId: receiverBank.$id,
        email: values.recipientEmail.toLowerCase(),
      },
      permissions: [
        Permission.read(Role.user(sender.$id)),
        Permission.read(Role.user(receiver.$id)),
      ],
    });

    return {
      success: true as const,
      transactionId: transaction.$id,
      message: "Transfer initiated. Your bank may take time to settle it.",
    };
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) {
      return {
        success: true as const,
        transactionId: values.idempotencyKey,
        message: "Transfer initiated. Your bank may take time to settle it.",
      };
    }

    console.error("Transfer started but its transaction record failed:", {
      error,
      transferUrl,
      transactionId: values.idempotencyKey,
    });
    throw new Error(
      "The transfer was initiated, but its history record could not be saved. Do not submit again; contact support with the transfer time.",
    );
  }
}
