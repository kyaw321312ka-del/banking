import * as Sentry from "@sentry/nextjs";
import { connection } from "next/server";
class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

// A faulty API route to test Sentry's error monitoring
export async function GET() {
  // Opt out of prerendering so the test runs at request time
  await connection();
  Sentry.logger.info("Sentry example API called");
  const error = new SentryExampleAPIError(
    "This error is raised on the backend called by the example page.",
  );
  Sentry.captureException(error);
  await Sentry.flush(2000);

  return Response.json({ error: error.message }, { status: 500 });
}
