export { cn } from "cn"

export const getUserNameParts = (name: string) => {
  const [firstName = "", ...lastNameParts] = name.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
};
