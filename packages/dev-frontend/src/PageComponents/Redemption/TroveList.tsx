import React, { useState, useEffect } from "react";
import { Box, Button, Flex, Spacer, Text, useDisclosure, Tr, Td, useTheme } from "@chakra-ui/react";
import { TokenTable, Loader } from "../../components";
import Tooltip from "../../components/Tooltip";

import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { getNum, format } from "../../Utils/number";
import { useLiquity } from "../../hooks/LiquityContext";
import { TroveData, getNextTenTroves } from "./RedemptionUtils";

export type TroveListProps = {
  firstTenTroves: TroveData[];
};

var dataSelector = useLiquitySelector;

const TroveList: React.FC<TroveListProps> = ({ firstTenTroves }) => {
  const { liquity, account } = useLiquity();

  const [numberOfTroves, setNumberOfTroves] = useState<number>(0);

  useEffect(() => {
    const getSetNumberOfTroves = async () => {
      setNumberOfTroves(await liquity.getNumberOfTroves());
    };

    getSetNumberOfTroves();
  }, []);

  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();

  const [idx, setIdx] = useState<number>(0);
  const [maxIdx, setMaxIdx] = useState<number>(0);

  const [cachedTroves, setCachedTroves] = useState<Array<TroveData>>(firstTenTroves);

  useEffect(() => {
    const getSetNextTenTroves = async () => {
      let currTail: string = "";

      if (maxIdx !== 0) {
        currTail = cachedTroves[cachedTroves.length - 1].owner;
      }

      const nextTen = await getNextTenTroves(liquity, currTail, maxIdx);

      setCachedTroves(cachedTroves.concat(nextTen));
    };

    getSetNextTenTroves();
  }, [maxIdx]);

  const onClickLeft = () => {
    if (idx > 0) {
      setIdx(idx - 1);
    }
  };

  const onClickRight = () => {
    if (idx < numberOfTroves / 10) {
      setIdx(idx + 1);
      if (idx + 1 > maxIdx) {
        setMaxIdx(idx + 1);
      }
    }
  };

  return (
    <>
      <Box layerStyle="card" flex={1}>
        <Flex flex={2}>
          <Text textStyle="title3">
            Sorted Troves <Tooltip> Sorted by AICR</Tooltip>
          </Text>
          <Spacer />
          <Button mr={2} colorScheme="brand" onClick={onClickLeft}>
            {" "}
            <Text> {"<"} </Text>{" "}
          </Button>
          <Text textStyle="title3" mr={2}>
            {" "}
            {idx}{" "}
          </Text>
          <Button
            colorScheme="brand"
            onClick={onClickRight}
            disabled={cachedTroves.length <= idx * 10}
          >
            {" "}
            <Text> {">"} </Text>{" "}
          </Button>
        </Flex>
        {cachedTroves.length <= maxIdx * 10 ? (
          <Flex flexDirection="column" alignItems="center" gap={4}>
            <Loader />
            <Text textStyle="title4">Fetching Data</Text>
          </Flex>
        ) : (
          <TokenTable
            headers={["Index", "Trove Owner", "", "Outstanding Debt", "AICR", "ICR"]}
            tooltips={[
              "",
              "",
              "",
              "Trove's debt - 200",
              "A trove's Adjusted Individual Collateral Ratio or AICR is a ratio between collateral and debt giving additional weight to stablecoins.",
              ""
            ]}
            width={6}
            display={["none", "block"]}
          >
            {cachedTroves.slice(idx * 10, idx * 10 + 10).map(currTroveData => (
              <Tr key={currTroveData.owner}>
                <Td pb={0} pt={4}>
                  {currTroveData.index}
                </Td>

                <Td pb={0} pt={4}>
                  {currTroveData.owner}
                </Td>
                {[...new Array(1)].map(_ => (
                  <Td pb={0} pt={4} />
                ))}
                <Td pb={0} pt={4}>
                  {getNum(currTroveData.outstandingDebt, 3)}
                </Td>
                <Td pb={0} pt={4}>
                  {getNum(currTroveData.aicr, 3)}
                </Td>

                <Td pb={0} pt={4}>
                  {getNum(currTroveData.icr, 3)}
                </Td>
              </Tr>
            ))}
          </TokenTable>
        )}
      </Box>
    </>
  );
};

export default TroveList;
