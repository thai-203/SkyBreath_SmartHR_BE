import { AsyncLocalStorage } from "node:async_hooks";

export const requestContext = new AsyncLocalStorage();

export const getRequestContext = () => requestContext.getStore();

export const setRequestContextValue = (key, value) => {
  const store = requestContext.getStore();
  if (store) {
    store[key] = value;
  }
};