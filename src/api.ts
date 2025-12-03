// src/api.ts
import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
import { ENV } from "./config/env";

const TOKEN_KEY = "connevia.access_token";

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAccessToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

// Create one Axios instance for the whole app
export const api: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
});

// Attach Authorization: Bearer <token> if available
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
