"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  usePlaidLink,
  type PlaidLinkOnSuccess,
} from "react-plaid-link";

import {
  createBankUpdateLinkToken,
  createLinkToken,
  exchangePublicToken,
} from "@/lib/actions/user.actions";
import { Button } from "./button";

interface PlaidLinkProps {
  user: {
    email: string;
  };
  variant?: "primary" | "ghost";
  updateBankRowId?: string;
}

const PlaidLink = ({
  user,
  variant = "primary",
  updateBankRowId,
}: PlaidLinkProps) => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    (updateBankRowId
      ? createBankUpdateLinkToken(updateBankRowId)
      : createLinkToken())
      .then((linkToken) => {
        if (isActive) setToken(linkToken);
      })
      .catch((error: unknown) => {
        console.error("Failed to create Plaid Link token:", error);
        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Bank linking is unavailable. Please try again.",
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [updateBankRowId]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, { accounts }) => {
      if (updateBankRowId) {
        setToken(null);
        setErrorMessage("");

        try {
          const refreshedToken =
            await createBankUpdateLinkToken(updateBankRowId);
          setToken(refreshedToken);
        } catch (error) {
          console.error("Failed to refresh Plaid update Link token:", error);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "The bank was updated, but another update session could not be prepared.",
          );
        }

        router.refresh();
        return;
      }

      const accountId = accounts[0]?.id;

      if (!publicToken || !accountId) {
        setErrorMessage("Plaid did not return the selected account details.");
        return;
      }

      try {
        await exchangePublicToken({
          publicToken,
          accountId,
        });
        router.refresh();
      } catch (error) {
        console.error("Failed to connect the bank account:", error);
        setErrorMessage("We couldn't connect this bank account. Please try again.");
      }
    },
    [router, updateBankRowId],
  );

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
  });

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={() => open()}
        disabled={!ready || !token}
        variant={variant === "primary" ? "default" : "ghost"}
        className="w-full rounded-xl px-5 py-3.5 text-sm font-semibold"
        aria-label={
          updateBankRowId
            ? "Grant transaction access for this bank"
            : `Connect a bank account${user.email ? ` for ${user.email}` : ""}`
        }
      >
        {updateBankRowId
          ? "Grant transaction access"
          : "Connect your bank account"}
      </Button>
      {errorMessage && (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default PlaidLink;