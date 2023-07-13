// @ts-nocheck
import React from "react";

import { CircularProgress } from "@chakra-ui/react";

export type LoaderProps = {};

const Loader: React.FC<LoaderProps> = () => <CircularProgress isIndeterminate />;

export default Loader;
