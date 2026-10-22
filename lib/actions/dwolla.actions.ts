
import "server-only";

import { Client } from "dwolla-v2";

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
  ssn?: string;
}

/**
 * Creates a Dwolla customer and returns the customer's resource URL.
 * Call this from trusted server-side code after validating the user.
 */
export async function createDwollaCustomer(
  data: CreateDwollaCustomerParams,
): Promise<string> {
  const dwolla = getDwollaClient();

  const response = await dwolla.post("customers", data);

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
}): Promise<string> {
  const dwolla = getDwollaClient();
  const customerUrl = getResourceUrl(params.dwollaCustomerUrl);

  if (!params.processorToken.trim() || !params.bankName.trim()) {
    throw new Error("A processor token and bank name are required.");
  }

  const response = await dwolla.post(
    `${customerUrl}/funding-sources`,
    {
      plaidToken: params.processorToken,
      name: params.bankName.trim(),
    },
  );

  return getResourceUrl(response.headers.get("location"));
}

/**
 * Initiates a transfer between two Dwolla funding sources.
 * Validate ownership, authorization, and available funds before calling.
 */
export async function createTransfer(params: {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: string;
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
      "Idempotency-Key": crypto.randomUUID(),
    },
  );

  return getResourceUrl(response.headers.get("location"));
}
