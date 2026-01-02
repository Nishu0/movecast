import { LocalStorage } from "@raycast/api";
import { ApiResponse } from "./api-wrapper";
import { STORAGE_KEYS } from "./constants";
import axios from "axios";
import { URL_ENDPOINTS } from "../constants/endpoints";
import { PriceHistory } from "../type";

export async function getPriceHistory({
  address,
  timeFrom,
  timeTo,
  timeInterval,
}: {
  address: string;
  timeFrom: number;
  timeTo: number;
  timeInterval: string;
  size?: "small" | "large";
}): Promise<ApiResponse<PriceHistory>> {
  try {
    const token = await LocalStorage.getItem<string>(STORAGE_KEYS.BACKEND_SESSION_TOKEN);
    const response = await axios.post<ApiResponse<PriceHistory>>(
      `${URL_ENDPOINTS.MOVECAST_API_URL}/get-price-history`,
      {
        address,
        timeFrom,
        timeTo,
        timeInterval,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.data.status === "error") {
      throw new Error(response.data.message || "API request failed");
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const backendError = error.response.data;
      console.error(backendError);
      if (backendError.status === "error" && backendError.message) {
        throw new Error(backendError.message);
      }
      if (backendError.message) {
        throw new Error(backendError.message);
      }
    }
    throw new Error("Unknown error occurred");
  }
}