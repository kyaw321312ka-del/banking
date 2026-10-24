
import "server-only";

import { Client } from "dwolla-v2";
import { normalizeUsState } from "../us-states";

function getDwollaClient() {
  const key = process.env.DWOLLA_KEY;
  const secret = process.env.DWOLLA_SECRET;
  const environment = process.env.DWOLLA_ENV;

  if (!key || !secret) {
    throw new Error("Missing Dwolla API credentials.");
  }

  if (environment !== "sandbox" && environment !== "production") {
    throw new Error(
      'DWOLLA_ENV must be "sandbox" or "production".',
    );
  }

  return new Client({
    environment,
    key,
    secret,
  });
}

function getResourceUrl(location: string | null): string {
  if (!location) {
    throw new Error("Dwolla did not return a resource URL.");
  }

  const url = new URL(location);

  // Only accept Dwolla resource URLs.
  if (
    url.protocol !== "https:" ||
    !["api.dwolla.com", "api-sandbox.dwolla.com"].includes(url.hostname)
  ) {
    throw new Error("Unexpected Dwolla resource URL.");
  }

  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export interface DwollaBalance {
  available: number;
  total: number;
  lastUpdated: string | null;
}

export type DwollaBalanceResult =
  | { status: "available"; balance: DwollaBalance }
  | { status: "not_configured" | "not_available" | "error" };

function getBalanceAmount(value: unknown): number {
  if (!isRecord(value) || typeof value.value !== "string") {
    throw new Error("Dwolla returned an invalid balance amount.");
  }

  const amount = Number(value.value);
  if (!Number.isFinite(amount)) {
    throw new Error("Dwolla returned an invalid balance amount.");
  }

  return amount;
}

export class DwollaDuplicateFundingSourceError extends Error {
  readonly code = "DuplicateResource";
  readonly status = 400;

  constructor(details: string) {
    super(
      `Dwolla already has this bank linked to the customer. ${details} No funding-source mapping was changed.`,
    );
    this.name = "DwollaDuplicateFundingSourceError";
  }
}

function getDuplicateFundingSourceId(error: unknown): string | undefined {
  if (!isRecord(error) || !isRecord(error.body)) return undefined;
  const body = error.body;

  if (body.code !== "DuplicateResource" || typeof body.message !== "string") {
    return undefined;
  }

  return body.message.match(/\bid=([a-zA-Z0-9-]+)\b/)?.[1];
}

function getFundingSourceDetails(value: unknown): string {
  if (!isRecord(value)) return "Dwolla did not return source details.";

  const bankName = typeof value.bankName === "string" ? value.bankName : "";
  const type =
    typeof value.bankAccountType === "string" ? value.bankAccountType : "";
  const name = typeof value.name === "string" ? value.name : "";
  const status = typeof value.status === "string" ? value.status : "";
  const description = [bankName, type, name && name !== bankName ? name : ""]
    .filter(Boolean)
    .join(" / ");

  return (
    [
      description ? `Existing source: ${description}.` : "",
      status ? `Dwolla status: ${status}.` : "",
    ]
      .filter(Boolean)
      .join(" ") || "Dwolla did not return source details."
  );
}

export interface CreateDwollaCustomerParams {
  firstName: string;
  lastName: string;
  email: string;
  type: "personal";
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
}

/**
 * Creates a Dwolla customer and returns the customer's resource URL.
 * Call this from trusted server-side code after validating the user.
 */
export async function createDwollaCustomer(
  data: CreateDwollaCustomerParams,
): Promise<string> {
  const dwolla = getDwollaClient();

  const state = normalizeUsState(data.state);
  if (!state) {
    throw new Error(
      "Dwolla customer state must be a valid two-letter U.S. state abbreviation.",
    );
  }

  const response = await dwolla.post("customers", { ...data, state });

  return getResourceUrl(response.headers.get("location"));
}

/**
 * Adds a bank funding source using a Plaid processor token.
 * The token must be generated securely on your server.
 */
export async function createFundingSource(params: {
  dwollaCustomerUrl: string;
  processorToken: string;
  bankName: string;
  bankAccountType: "checking" | "savings";
  accountName: string;
}): Promise<string> {
  const dwolla = getDwollaClient();
  const customerUrl = getResourceUrl(params.dwollaCustomerUrl);

  if (
    !params.processorToken.trim() ||
    !params.bankName.trim() ||
    !params.accountName.trim()
  ) {
    throw new Error(
      "A processor token, bank name, and account name are required.",
    );
  }

  const partnersResponse = await dwolla.get("exchange-partners");
  const embedded = isRecord(partnersResponse.body) &&
    isRecord(partnersResponse.body._embedded)
    ? partnersResponse.body._embedded
    : {};
  const partners = Array.isArray(embedded["exchange-partners"])
    ? embedded["exchange-partners"].filter(isRecord)
    : [];
  const plaidPartner = partners.find(
    (partner) =>
      typeof partner.name === "string" &&
      partner.name.toLowerCase() === "plaid",
  );
  const partnerHref =
    plaidPartner && isRecord(plaidPartner._links)
      ? plaidPartner._links
      : undefined;
  const partnerSelf = partnerHref && isRecord(partnerHref.self)
    ? partnerHref.self.href
    : undefined;

  if (typeof partnerSelf !== "string") {
    throw new Error(
      "Dwolla does not list Plaid as an exchange partner for this environment. Confirm the Plaid integration is enabled for the configured Dwolla account.",
    );
  }

  const exchangeResponse = await dwolla.post(`${customerUrl}/exchanges`, {
    _links: {
      "exchange-partner": { href: getResourceUrl(partnerSelf) },
    },
    token: params.processorToken,
  });
  const exchangeUrl = getResourceUrl(
    exchangeResponse.headers.get("location"),
  );

  try {
    const response = await dwolla.post(
      `${customerUrl}/funding-sources`,
      {
        _links: {
          exchange: { href: exchangeUrl },
        },
        bankAccountType: params.bankAccountType,
        name: `${params.bankName.trim()} ${params.accountName.trim()}`,
      },
    );

    return getResourceUrl(response.headers.get("location"));
  } catch (error) {
    const existingFundingSourceId = getDuplicateFundingSourceId(error);
    if (!existingFundingSourceId) {
      throw error;
    }

    let details: string;
    try {
      const existing = await dwolla.get(
        `funding-sources/${existingFundingSourceId}`,
      );
      details = getFundingSourceDetails(existing.body);
    } catch (lookupError) {
      console.error("Could not retrieve duplicate Dwolla source details:", {
        status:
          isRecord(lookupError) && typeof lookupError.status === "number"
            ? lookupError.status
            : undefined,
      });
      details = "Dwolla could not return details for the existing source.";
    }

    throw new DwollaDuplicateFundingSourceError(details);
  }
}

export async function getDwollaCustomerBalance(
  customerUrl: string,
): Promise<DwollaBalanceResult> {
  const dwolla = getDwollaClient();
  const safeCustomerUrl = getResourceUrl(customerUrl);

  try {
    const sourcesResponse = await dwolla.get(
      `${safeCustomerUrl}/funding-sources`,
    );
    const responseBody = sourcesResponse.body;
    const embedded =
      isRecord(responseBody) && isRecord(responseBody._embedded)
        ? responseBody._embedded
        : undefined;
    const sources = Array.isArray(embedded?.["funding-sources"])
      ? embedded["funding-sources"].filter(isRecord)
      : [];
    const balanceSource = sources.find(
      (source) => source.type === "balance" && source.removed !== true,
    );

    if (!balanceSource || typeof balanceSource.id !== "string") {
      return { status: "not_available" };
    }

    const balanceResponse = await dwolla.get(
      `funding-sources/${encodeURIComponent(balanceSource.id)}/balance`,
    );
    const balanceBody = balanceResponse.body;

    if (!isRecord(balanceBody)) {
      throw new Error("Dwolla returned an invalid balance response.");
    }

    return {
      status: "available",
      balance: {
        available: getBalanceAmount(balanceBody.balance),
        total: getBalanceAmount(balanceBody.total),
        lastUpdated:
          typeof balanceBody.lastUpdated === "string"
            ? balanceBody.lastUpdated
            : null,
      },
    };
  } catch (error) {
    console.error("Failed to retrieve the Dwolla customer balance.", {
      status:
        isRecord(error) && typeof error.status === "number"
          ? error.status
          : undefined,
    });
    return { status: "error" };
  }
}

export async function createDwollaBalanceTransfer(params: {
  customerUrl: string;
  destinationFundingSourceUrl: string;
  amount: string;
  idempotencyKey: string;
}): Promise<{ transferUrl: string; balanceFundingSourceId: string }> {
  const dwolla = getDwollaClient();
  const customerUrl = getResourceUrl(params.customerUrl);
  const destinationUrl = getResourceUrl(params.destinationFundingSourceUrl);
  const amount = Number(params.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const sourcesResponse = await dwolla.get(`${customerUrl}/funding-sources`);
  const responseBody = sourcesResponse.body;
  const embedded =
    isRecord(responseBody) && isRecord(responseBody._embedded)
      ? responseBody._embedded
      : undefined;
  const sources = Array.isArray(embedded?.["funding-sources"])
    ? embedded["funding-sources"].filter(isRecord)
    : [];
  const balanceSource = sources.find(
    (source) => source.type === "balance" && source.removed !== true,
  );

  if (!balanceSource || typeof balanceSource.id !== "string") {
    throw new Error("A Dwolla Balance is not available for this customer.");
  }

  const sourceLinks = isRecord(balanceSource._links)
    ? balanceSource._links
    : undefined;
  const selfLink = sourceLinks && isRecord(sourceLinks.self)
    ? sourceLinks.self.href
    : undefined;
  if (typeof selfLink !== "string") {
    throw new Error("Dwolla did not return the balance funding-source URL.");
  }
  const sourceUrl = getResourceUrl(selfLink);
  const balanceResponse = await dwolla.get(
    `funding-sources/${encodeURIComponent(balanceSource.id)}/balance`,
  );
  const balanceBody = balanceResponse.body;

  if (!isRecord(balanceBody)) {
    throw new Error("Dwolla returned an invalid balance response.");
  }

  const available = getBalanceAmount(balanceBody.balance);
  if (amount > available) {
    throw new Error("The transfer amount exceeds your available Dwolla Balance.");
  }

  const transferUrl = await createTransfer({
    sourceFundingSourceUrl: sourceUrl,
    destinationFundingSourceUrl: destinationUrl,
    amount: amount.toFixed(2),
    idempotencyKey: params.idempotencyKey,
  });

  return { transferUrl, balanceFundingSourceId: balanceSource.id };
}

/**
 * Initiates a transfer between two Dwolla funding sources.
 * Validate ownership, authorization, and available funds before calling.
 */
export async function createTransfer(params: {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: string;
  idempotencyKey: string;
}): Promise<string> {
  const dwolla = getDwollaClient();

  const sourceUrl = getResourceUrl(params.sourceFundingSourceUrl);
  const destinationUrl = getResourceUrl(
    params.destinationFundingSourceUrl,
  );

  const amount = Number(params.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  if (sourceUrl === destinationUrl) {
    throw new Error("Source and destination must be different.");
  }

  if (!params.idempotencyKey.trim()) {
    throw new Error("A transfer idempotency key is required.");
  }

  const formattedAmount = amount.toFixed(2);

  const response = await dwolla.post(
    "transfers",
    {
      _links: {
        source: { href: sourceUrl },
        destination: { href: destinationUrl },
      },
      amount: {
        currency: "USD",
        value: formattedAmount,
      },
    },
    {
      "Idempotency-Key": params.idempotencyKey,
    },
  );

  return getResourceUrl(response.headers.get("location"));
}
