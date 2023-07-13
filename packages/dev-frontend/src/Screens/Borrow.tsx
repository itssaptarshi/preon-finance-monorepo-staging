// @ts-nocheck
import React, { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { Header, ConnectCard } from "../components";
import { AdjustTrove, CloseTroveAutosell, Trove } from "../PageComponents/Borrow";

export type BorrowProps = {
  disconnected?: boolean;
};

// const selector = ({ trove }: LiquityStoreState) => ({
//   trove
// });

const Borrow: React.FC<BorrowProps> = ({ disconnected = false }) => {
  const [borrowMode, setBorrowMode] = useState<"normal" | "lever" | "unlever" | "close">("normal");

  return (
    <Box>
      <Header title="borrow.png" />
      <Flex direction="column" flex={1} mt={6}>
        <Flex flex={1}>
          <Trove disconnected={disconnected} borrowMode={borrowMode} setBorrowMode={setBorrowMode} />
        </Flex>
        <Flex flex={1} mt={6}>
          {disconnected ? (
            <ConnectCard title="Create Trove" />
          ) : borrowMode === "close" ? (
            <CloseTroveAutosell setBorrowMode={setBorrowMode} />
          ) : (
            // ? (<CloseTroveAutosell borrowMode={borrowMode} setBorrowMode={setBorrowMode} />)
            <AdjustTrove
              disconnected={disconnected}
              borrowMode={borrowMode}
              setBorrowMode={setBorrowMode}
            />
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Borrow;
