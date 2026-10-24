"use server";

import { Models, Query } from "node-appwrite";
import {
  CountryCode,
  ProcessorTokenCreateRequestProcessorEnum,
} from "plaid";
import { z } from "zod";

import { createAdminClient, createSessionClient } from "../appwrite";
import { plaidClient } from "../plaid";
import { normalizeUsState } from "../us-states";
import {
  createDwollaCustomer,
  createFundingSource,
  DwollaDuplicateFundingSourceError,
} from "./dwolla.actions";

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const bankRowIdSchema = z.string().trim().min(1);
const stateSchema = z.string().trim().min(1).max(100).optional();
const ssnSchema = z.string().regex(/^\d{9}$/, "Enter all 9 digits of your SSN.");

interface ProviderErrorDetails {
  status?: number;
  code?: string;
  message: string;
  requestId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getProviderErrorDetails(error: unknown): ProviderErrorDetails {
  const errorRecord = isRecord(error) ? error : {};
  const response = isRecord(errorRecord.response) ? errorRecord.response : {};
  let payload = response.data ?? errorRecord.body;

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      payload = undefined;
    }
  }

  const payloadRecord = isRecord(payload) ? payload : {};
  const embedded = isRecord(payloadRecord._embedded)
    ? payloadRecord._embedded
    : {};
  const embeddedErrors = Array.isArray(embedded.errors)
    ? embedded.errors
        .filter(isRecord)
        .map((detail) => {
          const path = typeof detail.path === "string" ? detail.path : "";
          const message =
            typeof detail.message === "string" ? detail.message : "";
          return [path, message].filter(Boolean).join(": ");
        })
        .filter(Boolean)
    : [];
  const plaidMessage =
    typeof payloadRecord.error_message === "string"
      ? payloadRecord.error_message
      : undefined;
  const message =
    embeddedErrors.length > 0
      ? embeddedErrors.join("; ")
      : plaidMessage ??
        (typeof payloadRecord.message === "string"
          ? payloadRecord.message
          : undefined) ??
        (error instanceof Error ? error.message : "Unknown provider error");
  const status =
    typeof errorRecord.status === "number"
      ? errorRecord.status
      : typeof response.status === "number"
        ? response.status
        : undefined;
  const code =
    typeof payloadRecord.error_code === "string"
      ? payloadRecord.error_code
      : typeof payloadRecord.code === "string"
        ? payloadRecord.code
        : undefined;
  const requestId =
    typeof payloadRecord.request_id === "string"
      ? payloadRecord.request_id
      : undefined;

  return { status, code, message, requestId };
}

function formatProviderError(details: ProviderErrorDetails): string {
  const qualifiers = [
    details.code,
    details.status ? `HTTP ${details.status}` : undefined,
  ].filter(Boolean);
  const providerReference = details.requestId
    ? ` Request ID: ${details.requestId}.`
    : "";

  return `${qualifiers.length ? `(${qualifiers.join(", ")}) ` : ""}${details.message}${providerReference}`;
}

interface BankRow extends Models.Row {
  userId: string;
  bankId: string;
  accountId: string;
  accessToken: string;
  fundingSourceUrl: string;
}

export async function resolveFundingSourceConflict(bankRowId: string) {
  const validatedBankRowId = bankRowIdSchema.parse(bankRowId);
  const { account } = await createSessionClient();
  const user = await account.get();
  const { tables } = await createAdminClient();
  const databaseId = getRequiredEnv("APPWRITE_Database_ID");
  const bankTableId = getRequiredEnv("APPWRITE_Bank_Table_ID");
  const bank = await tables.getRow<BankRow>({
    databaseId,
    tableId: bankTableId,
    rowId: validatedBankRowId,
  });

  if (bank.userId !== user.$id) {
    throw new Error("You are not authorized to update this bank account.");
  }
  if (!bank.fundingSourceUrl) {
    throw new Error("This bank account has no Dwolla funding source to keep.");
  }

  const userBankRows: BankRow[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const page = await tables.listRows<BankRow>({
      databaseId,
      tableId: bankTableId,
      queries: [
        Query.equal("userId", user.$id),
        Query.limit(pageSize),
        Query.offset(offset),
      ],
      total: false,
      ttl: 0,
    });
    userBankRows.push(...page.rows);
    if (page.rows.length < pageSize) break;
  }

  const rowsToDetach = userBankRows.filter(
    (row) =>
      row.$id !== bank.$id &&
      row.accountId !== bank.accountId &&
      row.fundingSourceUrl === bank.fundingSourceUrl,
  );
  if (rowsToDetach.length === 0) {
    throw new Error(
      "No other bank account shares this funding source. Refresh My Banks and try again.",
    );
  }

  for (const row of rowsToDetach) {
    await tables.updateRow({
      databaseId,
      tableId: bankTableId,
      rowId: row.$id,
      data: { fundingSourceUrl: "" },
    });
  }

  return {
    success: true as const,
    detachedAccountCount: rowsToDetach.length,
    message:
      "The existing Dwolla source is kept on this account. Other account records can now be set up separately.",
  };
}

interface UserProfileRow extends Models.Row {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  dateOfBirth: string;
  dwollaCustomerUrl: string;
  dwollaCustomerId: string;
}

export async function setupDwollaFundingSource(
  bankRowId: string,
  stateInput?: string,
  ssnInput?: string,
) {
  const validatedBankRowId = bankRowIdSchema.parse(bankRowId);
  const validatedState = stateSchema.parse(stateInput);
  const validatedSsn = ssnInput ? ssnSchema.parse(ssnInput) : undefined;
  const stateCode = validatedState
    ? normalizeUsState(validatedState)
    : undefined;
  if (!stateCode) {
    throw new Error("Select a valid U.S. state before setting up transfers.");
  }
  const { account } = await createSessionClient();
  const user = await account.get();
  const { tables, profileTable } = await createAdminClient();
  const databaseId = getRequiredEnv("APPWRITE_Database_ID");
  const bankTableId = getRequiredEnv("APPWRITE_Bank_Table_ID");

  const bank = await tables.getRow<BankRow>({
    databaseId,
    tableId: bankTableId,
    rowId: validatedBankRowId,
  });

  if (bank.userId !== user.$id) {
    throw new Error("You are not authorized to set up this bank account.");
  }
  if (bank.fundingSourceUrl) {
    const linkedRows = await tables.listRows<BankRow>({
      databaseId,
      tableId: bankTableId,
      queries: [
        Query.equal("userId", user.$id),
        Query.equal("fundingSourceUrl", bank.fundingSourceUrl),
        Query.limit(100),
      ],
      total: false,
      ttl: 0,
    });
    if (
      linkedRows.rows.some(
        (row) => row.$id !== bank.$id && row.accountId !== bank.accountId,
      )
    ) {
      throw new Error(
        "This Dwolla funding source is also linked to a different bank account. Contact support to verify the account mapping before transferring.",
      );
    }
    return { success: true as const, message: "Transfers are already set up." };
  }
  const profile = await tables.getRow<UserProfileRow>({
    ...profileTable,
    rowId: user.$id,
  });
  const requiredProfileFields = [
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.address,
    profile.city,
    profile.postalCode,
    profile.dateOfBirth,
  ];

  if (requiredProfileFields.some((value) => !value?.trim())) {
    throw new Error(
      "Complete your name, address, postal code, and date of birth in your profile before setting up bank transfers.",
    );
  }

  let dwollaCustomerUrl = profile.dwollaCustomerUrl?.trim();

  if (!dwollaCustomerUrl) {
    if (!validatedSsn) {
      return {
        success: false as const,
        requiresSsn: true as const,
        message: "Dwolla requires your SSN to create a customer profile.",
      };
    }

    const customerParams = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      type: "personal" as const,
      address1: profile.address,
      city: profile.city,
      state: stateCode,
      postalCode: profile.postalCode,
      dateOfBirth: profile.dateOfBirth,
      ssn: validatedSsn,
    };

    try {
      dwollaCustomerUrl = await createDwollaCustomer(customerParams);
    } catch (error) {
      const details = getProviderErrorDetails(error);
      console.error("Dwolla customer creation failed:", {
        userId: user.$id,
        status: details.status,
        code: details.code,
        message: details.message,
        requestId: details.requestId,
      });
      throw new Error(
        `Dwolla could not create your customer profile: ${formatProviderError(details)}`,
      );
    }
    const customerId = new URL(dwollaCustomerUrl).pathname.split("/").pop();
    if (!customerId) {
      throw new Error("Dwolla returned an invalid customer URL.");
    }

    try {
      await tables.updateRow({
        ...profileTable,
        rowId: user.$id,
        data: {
          dwollaCustomerUrl,
          dwollaCustomerId: customerId,
        },
      });
    } catch (error) {
      console.error("Dwolla customer created but could not be saved:", {
        userId: user.$id,
        error,
      });
      throw new Error(
        "Dwolla created your customer profile, but it could not be saved. Contact support before retrying to avoid creating a duplicate.",
      );
    }
  }

  let processorToken: string;
  try {
    const processorResponse = await plaidClient.processorTokenCreate({
      access_token: bank.accessToken,
      account_id: bank.accountId,
      processor: ProcessorTokenCreateRequestProcessorEnum.Dwolla,
    });
    processorToken = processorResponse.data.processor_token;
  } catch (error) {
    const details = getProviderErrorDetails(error);
    console.error("Plaid processor token creation failed:", {
      userId: user.$id,
      bankRowId: validatedBankRowId,
      status: details.status,
      code: details.code,
      message: details.message,
      requestId: details.requestId,
    });
    throw new Error(
      `Plaid could not prepare this bank account for Dwolla: ${formatProviderError(details)}`,
    );
  }

  let bankName: string;
  let plaidAccount: {
    name: string;
    official_name: string | null;
    subtype: string | null;
    mask: string | null;
  };
  try {
    const [institution, accounts] = await Promise.all([
      plaidClient.institutionsGetById({
        institution_id: bank.bankId,
        country_codes: [CountryCode.Us],
      }),
      plaidClient.accountsGet({ access_token: bank.accessToken }),
    ]);
    const matchingAccount = accounts.data.accounts.find(
      (account) => account.account_id === bank.accountId,
    );
    if (!matchingAccount) {
      throw new Error(
        "The selected Plaid account is no longer available for this bank connection.",
      );
    }
    bankName = institution.data.institution.name;
    plaidAccount = {
      name: matchingAccount.name,
      official_name: matchingAccount.official_name,
      subtype: matchingAccount.subtype,
      mask: matchingAccount.mask,
    };
  } catch (error) {
    const details = getProviderErrorDetails(error);
    console.error("Plaid institution lookup failed during Dwolla setup:", {
      userId: user.$id,
      bankRowId: validatedBankRowId,
      status: details.status,
      code: details.code,
      message: details.message,
      requestId: details.requestId,
    });
    throw new Error(
      `Plaid could not identify this bank for Dwolla setup: ${formatProviderError(details)}`,
    );
  }

  if (plaidAccount.subtype !== "checking" && plaidAccount.subtype !== "savings") {
    throw new Error(
      `Dwolla bank funding sources require a checking or savings account. The selected Plaid account type is "${plaidAccount.subtype ?? "unknown"}".`,
    );
  }

  let fundingSourceUrl: string;
  try {
    fundingSourceUrl = await createFundingSource({
      dwollaCustomerUrl,
      processorToken,
      bankName,
      bankAccountType: plaidAccount.subtype,
      accountName: plaidAccount.official_name || plaidAccount.name,
    });
  } catch (error) {
    if (error instanceof DwollaDuplicateFundingSourceError) {
      const accountLabel = [
        plaidAccount.official_name || plaidAccount.name,
        plaidAccount.subtype,
        plaidAccount.mask ? `ending in ${plaidAccount.mask}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      throw new Error(
        `${error.message} Selected Plaid institution: ${bankName}; account: ${accountLabel}. Dwolla does not expose bank-account digits for a direct match. If this is a different bank or account from the existing source, contact Dwolla support with the duplicate-resource error details.`,
      );
    }

    const details = getProviderErrorDetails(error);
    console.error("Dwolla bank funding-source setup failed:", {
      userId: user.$id,
      bankRowId: validatedBankRowId,
      status: details.status,
      code: details.code,
      message: details.message,
      requestId: details.requestId,
    });
    if (details.code === "DuplicateResource") {
      throw new Error(
        "Dwolla says this bank is already linked to your customer. The existing funding source was not reused automatically because that could link two different bank accounts to the same destination. Contact support to verify the Dwolla funding sources before retrying.",
      );
    }
    throw new Error(
      `Dwolla could not set up this bank account for transfers: ${formatProviderError(details)}`,
    );
  }

  const existingBankRows: BankRow[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const page = await tables.listRows<BankRow>({
      databaseId,
      tableId: bankTableId,
      queries: [
        Query.equal("userId", user.$id),
        Query.limit(pageSize),
        Query.offset(offset),
      ],
      total: false,
      ttl: 0,
    });
    existingBankRows.push(...page.rows);
    if (page.rows.length < pageSize) break;
  }

  const alreadyLinkedBank = existingBankRows.find(
    (row) =>
      row.$id !== validatedBankRowId &&
      row.accountId !== bank.accountId &&
      row.fundingSourceUrl === fundingSourceUrl,
  );

  if (alreadyLinkedBank) {
    console.error("Dwolla funding source is already linked to another account:", {
      userId: user.$id,
      bankRowId: validatedBankRowId,
      existingBankRowId: alreadyLinkedBank.$id,
    });
    throw new Error(
      "This Dwolla funding source is already associated with a different linked bank account. It was not saved twice. Contact support to reconcile the bank records before transferring.",
    );
  }

  try {
    await tables.updateRow({
      databaseId,
      tableId: bankTableId,
      rowId: validatedBankRowId,
      data: { fundingSourceUrl },
    });
  } catch (error) {
    console.error("Dwolla funding source created but could not be saved:", {
      userId: user.$id,
      bankRowId: validatedBankRowId,
      error,
    });
    throw new Error(
      "Dwolla created the funding source, but it could not be saved to your bank record. Contact support before retrying to avoid creating a duplicate.",
    );
  }

  return {
    success: true as const,
    requiresSsn: false as const,
    message: "This bank account is ready for transfers.",
  };
}
