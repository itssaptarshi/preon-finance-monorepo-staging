// @ts-nocheck
import { createIcon } from "@chakra-ui/react";

const Success = createIcon({
  displayName: "SuccessIcon",
  viewBox: "0 0 64 64",
  path: (
    <>
      <circle cx="32" cy="32" r="32" fill="#58C576" />
      <path d="M29.5 38L39.5 26" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M29.5 38L23.5 32" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </>
  )
});

export default Success;
