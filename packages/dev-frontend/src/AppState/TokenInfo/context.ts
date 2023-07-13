import { createContext } from "react";
import { TokenInfo } from "./types";

export const TokenInfoContext = createContext<Record<string, TokenInfo>>({});
