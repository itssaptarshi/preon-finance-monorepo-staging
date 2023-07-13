// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";
import tokenData from "../../TokenData";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalCloseButton
} from "@chakra-ui/modal";
import {
  Flex,
  Text,
  Button,
  Spacer,
  VStack,
  HStack,
  Divider,
  Box,
  useTheme,
  useDisclosure
} from "@chakra-ui/react";
import CollateralItem from "./CollateralItem";
import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../../components/Transaction";
import { format, limitDecimals, getNum, formatWithDecimals } from "../../Utils/number";
import CoinAmount from "../../components/CoinAmount";
import {
  LiquityStoreState,
  TroveMappings,
  Decimal,
  TroveClosureUnleverUpParams
} from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import Tooltip from "../../components/Tooltip";
import Checkbox from "../../components/Checkbox";

export type ConfirmCloseTroveAutosellModalProps = {
  isOpen: boolean;
  onClose: () => void;
  values: { [key: string]: any };
  yusdFinal: number;
  debtRepay: number;
  yusdReceived: number;
  yusdAvailable: number;
};

const selector = ({
  trove,
  underlyingPrices,
  yusdBalance,
  tokenBalances,
  decimals
}: LiquityStoreState) => ({
  trove,
  underlyingPrices,
  yusdBalance,
  tokenBalances,
  decimals
});

const ConfirmCloseTroveAutosellModal: React.FC<ConfirmCloseTroveAutosellModalProps> = ({
  isOpen,
  onClose,
  values,
  yusdFinal,
  debtRepay,
  yusdReceived,
  yusdAvailable
}) => {
  const { yeti } = useTheme();
  const understandAutosellLabel =
    "I understand this will repay any YUSD debt associated with the collateral I'm choosing to sell. Deposit fees will have to be paid to reopen a trove if all collateral is sold.";
  const confirmAutosellLabel =
    "I confirm that I want to auto-sell the chosen collateral and use it to repay YUSD debt.";

  //   checkbox state
  const [understand, setUnderstand] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [understandError, setUnderstandError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const { trove, underlyingPrices, yusdBalance, tokenBalances, decimals } = useLiquitySelector(
    selector
  );
  const { liquity } = useLiquity();
  tokenData.map(
    token =>
      (token["troveBalance"] = formatWithDecimals(
        trove.collaterals[token.address],
        decimals[token.address].toNumber()
      ))
  );

  const collaterals = Object.keys(trove.collaterals);
  const collateral = tokenData.filter(collateral => collaterals.includes(collateral.address));

  const ratioMapping: TroveMappings = {};
  const [ratios, setRatios] = useState<TroveMappings>(ratioMapping);

  const withdrawCollateralsLeveragesTroveMapping: TroveMappings = {};
  const withdrawCollateralsMaxSlippagesTroveMapping: TroveMappings = {};

  collateral.map(token => {
    if (values[token.token] !== undefined && values[token.token] !== 0) {
      withdrawCollateralsLeveragesTroveMapping[token.address] = Decimal.from(values[token.token]);
      withdrawCollateralsMaxSlippagesTroveMapping[token.address] = Decimal.from(
        values[token.token + "tempSlippage"] / 100
      );
    }
  });

  let closeTroveUnleverUpParams: TroveClosureUnleverUpParams<TroveMappings> = {
    withdrawCollaterals: withdrawCollateralsLeveragesTroveMapping,
    withdrawCollateralsMaxSlippages: withdrawCollateralsMaxSlippagesTroveMapping
  };
  console.log("withdrawCollaterals", withdrawCollateralsLeveragesTroveMapping);
  console.log("withdrawCollateralsMaxSlippages", withdrawCollateralsMaxSlippagesTroveMapping);

  const [closeTroveUnlever] = useTransactionFunction(
    "close-trove-unlever",
    liquity.send.closeTroveUnleverUp.bind(liquity.send, closeTroveUnleverUpParams)
  );

  useEffect(() => {
    const newMapping: TroveMappings = {};
    let interval: any = undefined;
    interval = setInterval(async () => {
      for (let i = 0; i < collateral.length; i++) {
        if (collateral[i].underlying !== "") {
          let scaleReceiptDecimals = 18 - collateral[i].underlyingDecimals;
          newMapping[collateral[i].address] = (
            await liquity.getUnderlyingPerReceipt(collateral[i].address)
          ).mul(Decimal.from(10).pow(scaleReceiptDecimals));
        } else {
          // console.log("collateral[i].address", collateral[i].address)
          newMapping[collateral[i].address] = Decimal.ONE;
        }
      }
      // console.log(ratioMapping)
      setRatios(newMapping);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const totalCollateral = tokenData
    .map(token =>
      ratios[token.address] != undefined
        ? (token.troveBalance - values[token.token]) *
          format(underlyingPrices[token.address]) *
          format(ratios[token.address])
        : token.troveBalance *
          format(underlyingPrices[token.address]) *
          format(ratios[token.address])
    )
    .reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (understandError && understand) {
      setUnderstandError(false);
    }
  }, [understandError, understand]);

  useEffect(() => {
    if (confirmError && confirm) {
      setConfirmError(false);
    }
  }, [confirmError, confirm]);

  const onSubmit = (): void => {
    if (!understand) {
      setUnderstandError(true);
    }
    if (!confirm) {
      setConfirmError(true);
    }
    if (confirm && understand) {
      closeTroveUnlever();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="2xl" pb={1}>
          Close Trove Auto-Sell
          <ModalCloseButton />
        </ModalHeader>

        <ModalBody>
          <Divider />

          <Flex my={5} align="center">
            <Text textStyle="title4">Collaterals Received:</Text>
            <Spacer />
            <Text fontWeight="bold" fontSize="lg">
              ${getNum(totalCollateral, 2)} USD
            </Text>
          </Flex>
          <Box
            overflowY={collateral.length > 3 ? "scroll" : undefined}
            maxHeight="14rem"
            sx={yeti.scrollbar}
            mb={4}
          >
            {collateral.map(({ token, troveBalance, address }) =>
              values[token] !== undefined && troveBalance - values[token] == 0 ? (
                <></>
              ) : (
                <CollateralItem
                  token={token}
                  amount={values[token] == undefined ? troveBalance : troveBalance - values[token]}
                  ratio={format(ratios[address])}
                  mb={4}
                  pr={collateral.length > 3 ? 1.5 : 0}
                  key={token}
                  currencyType={"USD"}
                />
              )
            )}
          </Box>
          <VStack align="flex-start" spacing={3}></VStack>
          <Spacer />

          <Divider />

          <Flex my={5} align="center">
            <Text textStyle="title4">Collaterals Sold:</Text>
            <Spacer />
            <Text fontWeight="bold" fontSize="lg">
              {getNum(yusdReceived, 2)} YUSD
            </Text>
          </Flex>
          <Box
            overflowY={collateral.length > 3 ? "scroll" : undefined}
            maxHeight="14rem"
            sx={yeti.scrollbar}
            mb={4}
          >
            {collateral.map(({ token, address }) =>
              values[token] !== undefined ? (
                <CollateralItem
                  token={token}
                  amount={values[token]}
                  ratio={format(ratios[address])}
                  mb={4}
                  pr={collateral.length > 3 ? 1.5 : 0}
                  key={token}
                  currencyType={"YUSDEarned"}
                />
              ) : (
                <></>
              )
            )}
          </Box>

          <Divider />

          <Flex mt={5} align="center">
            <Text textStyle="title4">
              Total Available YUSD{" "}
              <Tooltip>Current YUSD balance + YUSD gained from auto-sell</Tooltip>
            </Text>
            <Spacer />

            <Text fontWeight="bold" fontSize="lg">
              {getNum(yusdReceived + yusdAvailable)} YUSD
              {/* - 200 here for the YUSD Gas compensation that will be paid back on close trove. */}
            </Text>
          </Flex>

          <Flex mt={4} align="center">
            <Text color="red.500" textStyle="title4">
              Debt to Repay
            </Text>
            <Spacer />

            <Text color="red.500" fontWeight="bold" fontSize="lg">
              {getNum(debtRepay)} YUSD
              {/* - 200 here for the YUSD Gas compensation that will be paid back on close trove. */}
            </Text>
          </Flex>

          <Flex my={4} align="center">
            <Text textStyle="title4" color="green.400">
              YUSD After Close Trove{" "}
            </Text>
            <Text ml={1} textStyle="title4">
              <Tooltip>
                YUSD you will have in your wallet after the transaction (this is subject to
                slippage).
              </Tooltip>
            </Text>

            <Spacer />
            <Text fontWeight="bold" fontSize="lg" color="green.400">
              {getNum(yusdFinal, 2)} YUSD
            </Text>
          </Flex>

          <VStack align="flex-start" spacing={5}>
            <Checkbox
              isChecked={understand}
              onChange={() => setUnderstand(!understand)}
              error={understandError}
              label={understandAutosellLabel}
            />
            <Checkbox
              isChecked={confirm}
              onChange={() => setConfirm(!confirm)}
              error={confirmError}
              label={confirmAutosellLabel}
            />
          </VStack>
        </ModalBody>
        <ModalFooter flexDirection="column">
          <HStack spacing={6}>
            <Button variant="primary" onClick={onSubmit}>
              Close Trove
            </Button>
            {/* <Button variant="noYUSD">
              Additional {getNum(totalDebt - yusdAvailable - 200, 2)} YUSD required to close trove
            </Button> */}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmCloseTroveAutosellModal;
