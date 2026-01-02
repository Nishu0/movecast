import { Toast } from "@raycast/api";

export function getErrorMessage(error: unknown, defaultMsg: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return defaultMsg;
}

export function createErrorToast(title: string, error: unknown, defaultMessage = "An unexpected error occurred") {
  return {
    style: Toast.Style.Failure,
    title,
    message: getErrorMessage(error, defaultMessage),
  };
}

export function createSuccessToast(title: string, message: string) {
  return {
    style: Toast.Style.Success,
    title,
    message,
  };
}