import type { Owner } from "solid-js";

let appOwner: Owner | null = null;
export const getAppOwner = () => appOwner;
export const setAppOwner = (owner: Owner | null) => (appOwner = owner);