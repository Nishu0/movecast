import { AccountAddress } from "@aptos-labs/ts-sdk";

export const isValidMoveAddress = (address: string): boolean => {
  try {
    // AccountAddress.from() will throw if the address is invalid
    AccountAddress.from(address);
    return true;
  } catch (error) {
    return false;
  }
};