// @ts-nocheck
import { createIcon } from "@chakra-ui/react";

const Failure = createIcon({
  displayName: "FailureIcon",
  viewBox: "0 0 65 64",
  path: (
    <>
      <circle cx="32.5" cy="32" r="32" fill="#E83D3D" />
      <path
        d="M26.5 38L38.5 26"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M38.5 38L26.5 26"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        stroke-linejoin="round"
      />
    </>
  )
});

export default Failure;
