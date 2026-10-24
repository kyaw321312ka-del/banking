# NYX Banking

NYX Banking is a full-stack banking dashboard for viewing linked financial
accounts, balances, and transactions. It uses Plaid to connect bank accounts
and retrieve account and transaction data, Appwrite for authentication and
application data, and Dwolla for bank-to-bank transfers.

> **Important:** This application handles financial data and transfer flows.
> Use sandbox credentials while developing. Sandbox activity is simulated and
> does not move money or change a real bank account balance. Do not use this
> project to handle real funds without completing the necessary security,
> compliance, and production-readiness reviews.

## Features

- Sign-up, sign-in, and sign-out with Appwrite.
- Link financial institutions with Plaid Link.
- View linked accounts and current balances on the dashboard and My Banks page.
- Review recent transactions and a combined transaction history that includes
  app-recorded transfers.
- See spending by category for the last 30 days, including each category's
  amount and percentage of categorized spending.
- Set up Dwolla funding sources and initiate bank-to-bank transfers.
- Responsive dashboard UI with transaction and bank-account summaries.

## Technology

- [Next.js](https://nextjs.org/) 16 with the App Router and React 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Plaid](https://plaid.com/) for account linking and financial data
- [Appwrite](https://appwrite.io/) for authentication and application storage
- [Dwolla](https://www.dwolla.com/) for transfer processing
- [Sentry](https://sentry.io/) for error monitoring

## Requirements

- Node.js 20.9 or newer
- npm
- Appwrite, Plaid, and Dwolla developer accounts for the features you want to
  run

## Getting started

1. Clone the repository and enter its directory.

   ```bash
   git clone <repository-url>
   cd banking
   ```

2. Install dependencies.

   ```bash
   npm ci
   ```

3. Create a `.env.local` file in the project root and add the environment
   variables described below. Keep real credentials out of source control.

4. Configure the required Appwrite project, database, tables, and API key.
   Configure Plaid and Dwolla for their sandbox environments while developing.

5. Start the development server.

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Environment variables

The following variables are read by the server. Use the exact variable names
shown; names are case-sensitive.

| Variable | Required | Description |
| --- | --- | --- |
| `APPWRITE_ENDPOINT` | Yes | Appwrite API endpoint for the project. |
| `APPWRITE_PROJECT_ID` | Yes | Appwrite project ID. |
| `APPWRITE_API_KEY` | Yes | Server-side Appwrite API key with the permissions needed by the app. Never expose it to browser code. |
| `APPWRITE_Database_ID` | Yes | Appwrite database ID. The `D` is uppercase in this variable name. |
| `APPWRITE_User_Table_ID` | Yes | Appwrite table ID used for user profile data. |
| `APPWRITE_Bank_Table_ID` | Yes | Appwrite table ID used for linked-bank records. |
| `APPWRITE_Transaction_Table_ID` | Yes | Appwrite table ID used for transfer records. |
| `PLAID_ENV` | Yes | `sandbox` or `production`. |
| `PLAID_CLIENT_ID` | Yes | Plaid client ID. |
| `PLAID_SECRET` | Yes | Plaid secret matching the selected Plaid environment. |
| `PLAID_REDIRECT_URI` | No | Redirect URI for Plaid Link configurations that require one. |
| `DWOLLA_ENV` | Yes for transfer features | `sandbox` or `production`. |
| `DWOLLA_KEY` | Yes for transfer features | Dwolla application key matching the selected environment. |
| `DWOLLA_SECRET` | Yes for transfer features | Dwolla application secret matching the selected environment. |

Example `.env.local` template (replace placeholders with your own values):

```dotenv
APPWRITE_ENDPOINT=https://<your-appwrite-endpoint>/v1
APPWRITE_PROJECT_ID=<your-appwrite-project-id>
APPWRITE_API_KEY=<your-server-side-appwrite-api-key>
APPWRITE_Database_ID=<your-appwrite-database-id>
APPWRITE_User_Table_ID=<your-user-table-id>
APPWRITE_Bank_Table_ID=<your-bank-table-id>
APPWRITE_Transaction_Table_ID=<your-transaction-table-id>

PLAID_ENV=sandbox
PLAID_CLIENT_ID=<your-plaid-client-id>
PLAID_SECRET=<your-plaid-sandbox-secret>
# Set this if required by your Plaid Link configuration.
# PLAID_REDIRECT_URI=http://localhost:3000

DWOLLA_ENV=sandbox
DWOLLA_KEY=<your-dwolla-sandbox-key>
DWOLLA_SECRET=<your-dwolla-sandbox-secret>
```

Do not commit `.env.local`, paste secrets into issues, or prefix server
credentials with `NEXT_PUBLIC_`. Plaid and Dwolla credentials must belong to
the same environment selected by their respective `*_ENV` variable.

## Appwrite setup

Create an Appwrite project and configure the endpoint, project ID, server-side
API key, database, and table IDs listed above. The app uses separate tables for
user profiles, linked bank records, and transfer records. Ensure the API key
has only the permissions required for the operations used by the app, and
configure the project for the authentication methods you intend to support.

Keep Appwrite session authentication enabled for the app's session-based user
flows. The API key is used only by server-side code; never make it available to
the client.

## Plaid and Dwolla setup

- Create Plaid credentials for the selected environment and configure the
  products and redirect settings required by your Plaid dashboard.
- Create Dwolla application credentials for the selected environment.
- Use sandbox credentials and sandbox customer/bank data during development.
- A successful test transfer in a sandbox is not a real-world bank debit.
- Before switching either provider to production, verify your account,
  credentials, customer verification requirements, and provider configuration.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run the Next.js development server. |
| `npm run lint` | Run ESLint. |
| `npx tsc --noEmit` | Check TypeScript types without emitting files. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build locally. |

## Main routes

| Route | Description |
| --- | --- |
| `/` | Authenticated dashboard with account balances and recent activity. |
| `/my-banks` | Linked institutions, accounts, and recent spending categories. |
| `/transaction-history` | Transaction and transfer history. |
| `/payment-transfer` | Bank-to-bank transfer form. |
| `/sign-in` | Sign in to an account. |
| `/sign-up` | Create an account. |

## Project structure

```text
app/
  (auth)/                 Sign-in and sign-up pages
  (root)/                 Dashboard and authenticated pages
components/ui/            Application UI components
lib/
  actions/                Server actions for banks, users, and transfers
  appwrite.ts             Appwrite server clients
  plaid.ts                Plaid API client
```

## Data and reporting notes

- Plaid transaction data is requested for the app's recent-history window.
- Category percentages are calculated per linked bank using categorized
  spending transactions from the last 30 days. They are shares of the
  categorized spending total, not percentages of account balance or income.
- Bank balances and transaction data depend on the linked institution and
  provider environment. Sandbox data is simulated.
- Transfer history records the app's transfer activity. Check the provider's
  transfer status before retrying a transfer that appears delayed or pending.

## Troubleshooting

- **Missing environment variable:** Confirm `.env.local` is in the project
  root, contains the required key, and restart the dev server after editing it.
- **Plaid authentication error:** Verify `PLAID_CLIENT_ID` and `PLAID_SECRET`
  are a matching pair for the value of `PLAID_ENV`.
- **Dwolla authentication error:** Verify `DWOLLA_KEY` and `DWOLLA_SECRET` are a
  matching pair for `DWOLLA_ENV`.
- **No linked accounts or transactions:** Confirm the user has completed the
  provider's linking flow and that the provider environment contains data.
- **Transfer did not debit a real bank:** Check whether the app is configured
  for sandbox. Sandbox transfers are simulated and do not withdraw real money.

## Security

- Keep all provider and Appwrite server credentials private.
- Use least-privilege API keys and rotate credentials if they are exposed.
- Do not log access tokens, session secrets, account numbers, or other sensitive
  financial data.
- Do not use sandbox credentials for production or production credentials in
  local development.
- Review applicable provider terms, privacy obligations, and regulatory
  requirements before any production financial use.
