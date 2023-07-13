import { createContext } from "react";
import { TokenInfo } from "../Types";

export const TokenInfoContext = createContext<Record<string, TokenInfo>>({});
