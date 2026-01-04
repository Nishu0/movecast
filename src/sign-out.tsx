import { showToast, Toast, closeMainWindow, popToRoot } from "@raycast/api";
import { provider } from "./utils/auth";

export default async function Command() {
  await showToast(Toast.Style.Animated, "Signing Out...");

  try {
    await provider.signOut();
    await showToast({
      style: Toast.Style.Success,
      title: "Signed Out",
      message: "You have been signed out. Please sign in again.",
    });
    await popToRoot();
    await closeMainWindow();
  } catch (error) {
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Failed to sign out",
    });
  }
}

