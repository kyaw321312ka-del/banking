"use server";

import { Models, Query } from "node-appwrite";
import { CountryCode } from "plaid";
import { z } from "zod";

import { createAdminClient, createSessionClient } from "../appwrite";
import { plaidClient } from "../plaid";

interface BankRow extends Models.Row {
  userId: string;
  bankId: string;
  accountId: string;
  accessToken: string;
  fundingSourceUrl: string;
  shareabaleId: string;
}

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

async function getCurrentUserBankRows(): Promise<BankRow[]> {
  const { account } = await createSessionClient();
  const user = await account.get();
  const { tables } = await createAdminClient();
  const databaseId = getRequiredEnv("APPWRITE_Database_ID");
  const tableId = getRequiredEnv("APPWRITE_Bank_Table_ID");
  const pageSize = 100;
  const rows: BankRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await tables.listRows<BankRow>({
      databaseId,
      tableId,
      queries: [
        Query.equal("userId", user.$id),
        Query.limit(pageSize),
        Query.offset(offset),
      ],
      total: false,
      ttl: 0,
    });

    rows.push(...page.rows);
    if (page.rows.length < pageSize) break;
  }

  return Promise.all(
    rows.map(async (row) => {
      if (row.shareabaleId?.trim()) {
        return row;
      }

      const shareabaleId = row.$id;
      await tables.updateRow({
        databaseId,
        tableId,
        rowId: row.$id,
        data: { shareabaleId },
      });

      return { ...row, shareabaleId };
    }),
  );
}

const getInstitutionInputSchema = z.string().trim().min(1);

export async function getAccounts() {
  const bankRows = await getCurrentUserBankRows();

  return Promise.all(
    bankRows.map(async (bank) => {
      const response = await plaidClient.accountsGet({
        access_token: bank.accessToken,
      });
      const account = response.data.accounts.find(
        (candidate) => candidate.account_id === bank.accountId,
      );

      if (!account) {
        throw new Error(
          `Plaid account ${bank.accountId} was not found for connected bank ${bank.$id}.`,
        );
      }

      return {
        bankId: bank.$id,
        institutionId: bank.bankId,
        account,
      };
    }),
  );
}

export async function getAccount(accountId: string) {
  const validatedAccountId = z.string().trim().min(1).parse(accountId);
  const bankRows = await getCurrentUserBankRows();

  for (const bank of bankRows) {
    if (bank.accountId !== validatedAccountId) continue;

    const response = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });
    const account = response.data.accounts.find(
      (candidate) => candidate.account_id === validatedAccountId,
    );

    if (account) {
      return {
        bankId: bank.$id,
        institutionId: bank.bankId,
        account,
      };
    }
  }

  return null;
}

export async function getInstitution(institutionId: string) {
  const validatedInstitutionId =
    getInstitutionInputSchema.parse(institutionId);
  const bankRows = await getCurrentUserBankRows();

  if (!bankRows.some((bank) => bank.bankId === validatedInstitutionId)) {
    return null;
  }

  const response = await plaidClient.institutionsGetById({
    institution_id: validatedInstitutionId,
    country_codes: [CountryCode.Us],
  });

  return response.data.institution;
}

const transactionRangeSchema = z
  .object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || startDate <= endDate,
    "Start date must be on or before end date.",
  );

const plaidErrorBodySchema = z.object({
  error_type: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  request_id: z.string().optional(),
});

function getPlaidErrorDetails(error: unknown) {
  const errorObject =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : undefined;
  const response =
    typeof errorObject?.response === "object" &&
    errorObject.response !== null
      ? (errorObject.response as Record<string, unknown>)
      : undefined;
  const responseBody = plaidErrorBodySchema.safeParse(response?.data);
  const body = responseBody.success ? responseBody.data : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof errorObject?.message === "string"
        ? errorObject.message
        : typeof error === "string"
          ? error
          : "Unknown Plaid error";

  return {
    status:
      typeof response?.status === "number" ? response.status : undefined,
    errorType: body?.error_type,
    errorCode:
      body?.error_code ??
      (typeof errorObject?.error_code === "string"
        ? errorObject.error_code
        : undefined),
    errorMessage: body?.error_message ?? message,
    requestId:
      body?.request_id ??
      (typeof errorObject?.request_id === "string"
        ? errorObject.request_id
        : undefined),
    causeName: error instanceof Error ? error.name : undefined,
    causeMessage: message,
    axiosCode:
      typeof errorObject?.code === "string" ? errorObject.code : undefined,
  };
}

export async function getTransactions(dateRange?: {
  startDate?: string;
  endDate?: string;
}) {
  const { startDate, endDate } = transactionRangeSchema.parse(dateRange ?? {});
  const end = endDate ?? new Date().toISOString().slice(0, 10);
  const defaultStart = new Date();
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 30);
  const start =
    startDate ?? defaultStart.toISOString().slice(0, 10);
  const bankRows = await getCurrentUserBankRows();
  const itemsByAccessToken = new Map<string, BankRow[]>();

  for (const bank of bankRows) {
    const itemRows = itemsByAccessToken.get(bank.accessToken) ?? [];
    itemRows.push(bank);
    itemsByAccessToken.set(bank.accessToken, itemRows);
  }

  const transactionGroups = await Promise.all(
    Array.from(itemsByAccessToken, async ([accessToken, itemRows]) => {
      const accountRows = new Map(
        itemRows.map((row) => [row.accountId, row]),
      );
      const transactions = [];

      try {
        const firstPage = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: start,
          end_date: end,
          options: { count: 500, offset: 0 },
        });
        transactions.push(...firstPage.data.transactions);

        for (
          let offset = transactions.length;
          offset < firstPage.data.total_transactions;
          offset += 500
        ) {
          const page = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: start,
            end_date: end,
            options: { count: 500, offset },
          });
          transactions.push(...page.data.transactions);
        }

        return {
          transactions: transactions.flatMap((transaction) => {
            const bank = accountRows.get(transaction.account_id);
            return bank
              ? [
                  {
                    ...transaction,
                    bankId: bank.$id,
                    institutionId: bank.bankId,
                  },
                ]
              : [];
          }),
          error: null,
        };
      } catch (error) {
        const details = getPlaidErrorDetails(error);
        const requiresConsent =
          details.errorCode === "ADDITIONAL_CONSENT_REQUIRED";
        const requiresReconnect =
          details.errorCode === "ITEM_LOGIN_REQUIRED";
        const productNotReady = details.errorCode === "PRODUCT_NOT_READY";
        const dnsUnavailable =
          details.axiosCode === "ENOTFOUND" ||
          details.axiosCode === "EAI_AGAIN";

        if (
          !requiresConsent &&
          !requiresReconnect &&
          !productNotReady &&
          !dnsUnavailable
        ) {
          console.error(
            "Plaid transaction retrieval failed:",
            JSON.stringify(details),
          );
        }

        return {
          transactions: [],
          error: {
            code: details.errorCode ?? "UNKNOWN",
            requestId: details.requestId,
            message:
              requiresConsent
                ? "Transactions access has not been approved for this bank. Open My Banks and select Grant transaction access; complete Plaid Link to give consent."
                : productNotReady
                ? "Plaid has not enabled transaction data for this bank yet. Open My Banks and choose Enable transactions for the linked bank, then try again."
                : requiresReconnect
                  ? "This bank needs you to reconnect. Open My Banks and refresh its connection, then try again."
                    : dnsUnavailable
                      ? "The server temporarily could not resolve Plaid's hostname. Check your server's DNS and internet connection, then retry. If this continues, contact your hosting provider."
                    : `Plaid couldn't load transactions for one of your linked banks${
                        details.status ? ` (HTTP ${details.status})` : ""
                      }. ${
                      details.errorMessage !== "Unknown Plaid error"
                        ? details.errorMessage
                        : "See server logs for the Plaid error details."
                    }`,
          },
        };
      }
    }),
  );

  return {
    transactions: transactionGroups.flatMap((group) => group.transactions),
    errors: transactionGroups.flatMap((group) =>
      group.error ? [group.error] : [],
    ),
  };
}

const getBanksInputSchema = z.object({
  userId: z.string().trim().min(1),
});

export async function getBanks(input: { userId: string }) {
  const { userId } = getBanksInputSchema.parse(input);
  const { account } = await createSessionClient();
  const user = await account.get();

  if (user.$id !== userId) {
    throw new Error("You are not authorized to view these bank accounts.");
  }

  const bankRows = await getCurrentUserBankRows();
  const rowsByFundingSource = new Map<string, Set<string>>();
  for (const row of bankRows) {
    if (!row.fundingSourceUrl) continue;
    const accountIds =
      rowsByFundingSource.get(row.fundingSourceUrl) ?? new Set<string>();
    accountIds.add(row.accountId);
    rowsByFundingSource.set(row.fundingSourceUrl, accountIds);
  }

  const banksByInstitution = new Map<string, Map<string, BankRow[]>>();

  for (const bank of bankRows) {
    const items = banksByInstitution.get(bank.bankId) ?? new Map();
    const itemRows = items.get(bank.accessToken) ?? [];
    itemRows.push(bank);
    items.set(bank.accessToken, itemRows);
    banksByInstitution.set(bank.bankId, items);
  }

  return Promise.all(
    Array.from(banksByInstitution, async ([institutionId, items]) => {
      const institutionRows = Array.from(items.values()).flat();
      const [institutionResponse, itemAccounts] = await Promise.all([
        plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        }),
        Promise.all(
          Array.from(items, async ([accessToken, rows]) => {
            const response = await plaidClient.accountsGet({
              access_token: accessToken,
            });
            const connectedAccountIds = new Set(
              rows.map((row) => row.accountId),
            );
            const accounts = response.data.accounts.filter((account) =>
              connectedAccountIds.has(account.account_id),
            );
            const returnedAccountIds = new Set(
              accounts.map((account) => account.account_id),
            );
            const missingAccount = rows.find(
              (row) => !returnedAccountIds.has(row.accountId),
            );

            if (missingAccount) {
              throw new Error(
                `Plaid account ${missingAccount.accountId} was not found for connected bank ${missingAccount.$id}.`,
              );
            }

            return accounts.map((account) => {
              const bankRow = rows.find(
                (row) => row.accountId === account.account_id,
              );

              if (!bankRow) {
                throw new Error(
                  `Plaid account ${account.account_id} was not found in its linked bank records.`,
                );
              }

              return {
                ...account,
                bankRowId: bankRow.$id,
                bankShareableId: bankRow.shareabaleId,
                fundingSourceConflict:
                  Boolean(bankRow.fundingSourceUrl) &&
                  (rowsByFundingSource.get(bankRow.fundingSourceUrl)?.size ??
                    0) > 1,
                fundingSourceReady:
                  Boolean(bankRow.fundingSourceUrl) &&
                  (rowsByFundingSource.get(bankRow.fundingSourceUrl)?.size ??
                    0) <= 1,
              };
            });
          }),
        ),
      ]);
      const accounts = itemAccounts.flat();

      return {
        id: institutionRows[0].$id,
        bankIds: institutionRows.map((row) => row.$id),
        items: Array.from(items.values(), (rows) => ({ id: rows[0].$id })),
        institutionId,
        name: institutionResponse.data.institution.name,
        accounts,
      };
    }),
  );
}