// src/lib/server/appwrite.js
"use server";
import {
  Account,
  Client,
  Databases,
  Permission,
  Role,
  TablesDB,
  Users,
} from "node-appwrite";
import { cookies } from "next/headers";

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(getRequiredEnv("APPWRITE_ENDPOINT"))
    .setProject(getRequiredEnv("APPWRITE_PROJECT_ID"));

  const session = (await cookies()).get("appwrite-session");
  if (!session || !session.value) {
    throw new Error("No session");
  }

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get database() {
      return new Databases(client);
    },
    get user() {
      return new Users(client);
    }
    
  };
}

export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(getRequiredEnv("APPWRITE_ENDPOINT"))
    .setProject(getRequiredEnv("APPWRITE_PROJECT_ID"))
    .setKey(getRequiredEnv("APPWRITE_API_KEY"));

  return {
    get account() {
      return new Account(client);
    },
    get tables() {
      return new TablesDB(client);
    },
    get users() {
      return new Users(client);
    },
    get profileTable() {
      return {
        databaseId: getRequiredEnv("APPWRITE_Database_ID"),
        tableId: getRequiredEnv("APPWRITE_User_Table_ID"),
      };
    },
    get profilePermissions() {
      return (userId: string) => [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
      ];
    },
  };
}