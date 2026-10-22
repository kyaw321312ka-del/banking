import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const environment = process.env.PLAID_ENV?.trim();
const clientId = process.env.PLAID_CLIENT_ID?.trim();
const secret = process.env.PLAID_SECRET?.trim();

if (environment !== "sandbox" && environment !== "production") {
  throw new Error('PLAID_ENV must be either "sandbox" or "production".');
}

if (!clientId || !secret) {
  throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be configured.");
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[environment],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": clientId,
      "PLAID-SECRET": secret,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
