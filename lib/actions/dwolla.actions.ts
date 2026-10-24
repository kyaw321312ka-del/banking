
import "server-only";

import { normalizeUsState } from "../us-states";

interface DwollaResponse {
  headers: Headers;
  body: unknown;
}

interface DwollaApiClient {
  get(path: string): Promise<DwollaResponse>;
  post(
    path: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<DwollaResponse>;
}

interface AccessTokenCache {
  environment: string;
  key: string;
  token: string;
  expiresAt: number;
}

interface PendingTokenRequest {
  environment: string;
  key: string;
  promise: Promise<string>;
}

let cachedAccessToken: AccessTokenCache | undefined;
let pendingTokenRequest: PendingTokenRequest | undefined;

class DwollaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "DwollaApiError";
  }
}

function getDwollaClient(): DwollaApiClient {
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

  const configuredKey = key;
  const configuredSecret = secret;
  const configuredEnvironment = environment;
  const apiUrl =
    configuredEnvironment === "sandbox"
      ? "https://api-sandbox.dwolla.com"
      : "https://api.dwolla.com";

  async function getAccessToken(): Promise<string> {
    if (
      cachedAccessToken &&
      cachedAccessToken.environment === configuredEnvironment &&
      cachedAccessToken.key === configuredKey &&
      cachedAccessToken.expiresAt > Date.now() + 60_000
    ) {
      return cachedAccessToken.token;
    }

    if (
      pendingTokenRequest &&
      pendingTokenRequest.environment === configuredEnvironment &&
      pendingTokenRequest.key === configuredKey
    ) {
      return pendingTokenRequest.promise;
    }

    const promise = (async () => {
      const response = await fetch(`${apiUrl}/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${configuredKey}:${configuredSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/vnd.dwolla.v1.hal+json",
        },
        body: "grant_type=client_credentials",
        cache: "no-store",
      });
      const responseText = await response.text();
      let body: unknown;

      try {
        body = responseText ? JSON.parse(responseText) : {};
      } catch {
        body = { message: responseText || "Dwolla returned an invalid response." };
      }

      if (!response.ok) {
        const providerMessage =
          isRecord(body) && typeof body.error_description === "string"
            ? body.error_description
            : isRecord(body) && typeof body.message === "string"
              ? body.message
              : undefined;
        const providerCode =
          isRecord(body) && typeof body.code === "string"
            ? body.code
            : isRecord(body) && typeof body.error === "string"
              ? body.error
              : undefined;
        const invalidCredentials =
          response.status === 401 ||
          providerCode?.toLowerCase().includes("credential") === true;
        const message =
          invalidCredentials
            ? "Dwolla rejected the API credentials. Check that DWOLLA_KEY and DWOLLA_SECRET are a matching pair for the configured DWOLLA_ENV (sandbox or production)."
            : providerMessage ??
              (providerCode
                ? `Dwolla token request failed with status ${response.status} (${providerCode}).`
                : `Dwolla token request failed with status ${response.status}.`);
        throw new DwollaApiError(message, response.status, body);
      }

      if (
        !isRecord(body) ||
        typeof body.access_token !== "string" ||
        typeof body.expires_in !== "number"
      ) {
        throw new Error("Dwolla returned an invalid access token response.");
      }

      cachedAccessToken = {
        environment: configuredEnvironment,
        key: configuredKey,
        token: body.access_token,
        expiresAt: Date.now() + body.expires_in * 1000,
      };
      return body.access_token;
    })();
    const request = {
      environment: configuredEnvironment,
      key: configuredKey,
      promise,
    };
    pendingTokenRequest = request;

    try {
      return await promise;
    } finally {
      if (pendingTokenRequest === request) {
        pendingTokenRequest = undefined;
      }
    }
  }

  async function request(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): Promise<DwollaResponse> {
    const url = new URL(path, `${apiUrl}/`);
    if (url.origin !== new URL(apiUrl).origin) {
      throw new Error("Dwolla request URL does not match the configured environment.");
    }

    const headers = new Headers({
      Authorization: `Bearer ${await getAccessToken()}`,
      Accept: "application/vnd.dwolla.v1.hal+json",
      ...extraHeaders,
    });
    if (body) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const responseText = await response.text();
    let responseBody: unknown;

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = { message: responseText || "Dwolla returned an invalid response." };
    }

    if (!response.ok) {
      const message =
        isRecord(responseBody) && typeof responseBody.message === "string"
          ? responseBody.message
          : `Dwolla API request failed with status ${response.status}.`;
      throw new DwollaApiError(message, response.status, responseBody);
    }

    return { headers: response.headers, body: responseBody };
  }

  return {
    get: (path) => request(path, "GET"),
    post: (path, body, headers) => request(path, "POST", body, headers),
  };
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
  | { status: "not_configured" }
  | { status: "not_available" }
  | { status: "error"; message: string };

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
    const cause = isRecord(error) && isRecord(error.cause)
      ? error.cause
      : undefined;
    const status =
      isRecord(error) && typeof error.status === "number"
        ? error.status
        : undefined;
    const errorCode =
      isRecord(error) && typeof error.code === "string"
        ? error.code
        : isRecord(error) &&
            isRecord(error.body) &&
            typeof error.body.code === "string"
          ? error.body.code
          : undefined;
    const message =
      status === 401 || errorCode === "InvalidCredentials"
        ? "Dwolla rejected the API credentials. Verify that DWOLLA_KEY and DWOLLA_SECRET are a matching pair for the configured DWOLLA_ENV, then restart the server."
        : status === 403
          ? "Dwolla denied access to this balance. Confirm the customer is verified and the credentials belong to the same Dwolla environment."
          : cause && typeof cause.code === "string"
            ? `Dwolla could not be reached (${cause.code}). Check the server's network connection and try again.`
            : status
              ? `Dwolla could not load the balance (HTTP ${status}). Try again later.`
              : "Dwolla could not load the balance. Check the server log and try again.";

    console.error(`Failed to retrieve the Dwolla customer balance: ${message}`);
    return { status: "error", message };
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
