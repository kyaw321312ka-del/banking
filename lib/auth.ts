import "server-only";

import { AppwriteException } from "node-appwrite";

import { createSessionClient } from "./appwrite";

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    return await account.get();
  } catch (error) {
    if (error instanceof Error && error.message === "No session") {
      return null;
    }

    if (error instanceof AppwriteException && error.code === 401) {
      return null;
    }

    console.error("Failed to get the logged-in user:", error);
    throw error;
  }
}
