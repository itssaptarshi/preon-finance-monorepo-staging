// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";

import CoinAmount from "../../components/CoinAmount";
import Checkbox from "../../components/Checkbox";
import ProgressBar from "../../components/ProgressBar";
import { useTransactionFunction, useMyTransactionState } from "../../components/Transaction";
import { useLiquity } from "../../hooks/LiquityContext";
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
  useDisclosure
} from "@chakra-ui/react";
import { useLiquitySelector } from "@liquity/lib-react";
import { LiquityStoreState, TroveMappings, Decimal } from "@liquity/lib-base";
import { format, limitDecimals, getNum, formatWithDecimals } from "../../Utils/number";
import TransactionModal from "../../components/TransactionModal";

export type ConfirmCloseTroveModalProps = {
  isOpen: boolean;
  onClose: () => void;
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

const ConfirmCloseTroveModal: React.FC<ConfirmCloseTroveModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<0 | 1>(0);
  const { liquity } = useLiquity();
  const { trove, underlyingPrices, yusdBalance, tokenBalances, decimals } = useLiquitySelector(
    selector
  );

  const { isOpen: isTxModalOpen, onOpen: onTxModalOpen, onClose: onTxModalClosed } = useDisclosure();

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
        ? token.troveBalance *
          format(underlyingPrices[token.address]) *
          format(ratios[token.address])
        : token.troveBalance *
          format(underlyingPrices[token.address]) *
          format(ratios[token.address])
    )
    .reduce((a, b) => a + b, 0);
  const totalDebt = limitDecimals(+trove.debt["debt"].toString());
  const yusdAvailable = limitDecimals(+yusdBalance.toString());

  const [understand, setUnderstand] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [understandError, setUnderstandError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);

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

  // const onApprove = () => {
  //   if (!understand) {
  //     setUnderstandError(true);
  //   }
  //   if (!confirm) {
  //     setConfirmError(true);
  //   }
  //   if (confirm && understand) {
  //     setStep(1);
  //   }
  // };

  // Close Trove
  const [close] = useTransactionFunction("close-trove", liquity.send.closeTrove.bind(liquity.send));

  const transactionId = "close-trove";
  const myTransactionState = useMyTransactionState(transactionId);

  const onSubmit = (): void => {
    if (!understand) {
      setUnderstandError(true);
    }
    if (!confirm) {
      setConfirmError(true);
    }
    if (confirm && understand) {
      close();
      onClose();
    }
  };
  const confirm1String =
    "I understand this will repay my YUSD debt and return all collateral back to my wallet. Deposit fees will have to be paid to reopen a trove.";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="2xl" pb={1}>
          Close Trove
          <ModalCloseButton />
        </ModalHeader>

        <ModalBody>
          <Divider />

          <Flex my={5} align="center">
            <Text color="green.400" textStyle="title4">
              Collateral Received:
            </Text>
            <Spacer />
            <Text color="green.400" fontWeight="bold" fontSize="lg">
              ${getNum(totalCollateral, 2)} USD
            </Text>
          </Flex>
          <VStack align="flex-start" spacing={3}>
            {collateral.map(({ token, troveBalance, address }) => {
              return (
                <CoinAmount
                  icon
                  token={token}
                  amount={troveBalance * format(ratios[address])}
                  key={token}
                  fontWeight="bold"
                />
              );
            })}
          </VStack>
          <Flex mt={5} align="center">
            <Text color="red.500" textStyle="title4">
              Debt to Repay:
            </Text>
            <Spacer />

            <Text color="red.500" fontWeight="bold" fontSize="lg">
              ${getNum(totalDebt - 200, 2)} YUSD
              {/* - 200 here for the YUSD Gas compensation that will be paid back on close trove. */}
            </Text>
          </Flex>
          {totalDebt - 200 > yusdAvailable ? (
            <Flex justify="flex-end">
              <Text color="brand.300" fontWeight="light" fontSize="xs">
                ${getNum(yusdAvailable)} YUSD Available
              </Text>
            </Flex>
          ) : (
            <>
              <Flex justify="flex-end" mb={5}>
                <Text color="brand.300" fontWeight="light" fontSize="xs">
                  ${getNum(yusdAvailable)} YUSD Available
                </Text>
              </Flex>
              <VStack align="flex-start" spacing={5}>
                <Checkbox
                  isChecked={understand}
                  onChange={() => setUnderstand(!understand)}
                  error={understandError}
                  label={confirm1String}
                />
                <Checkbox
                  isChecked={confirm}
                  onChange={() => setConfirm(!confirm)}
                  error={confirmError}
                  label="I confirm that I want to liquify and close my trove."
                />
              </VStack>
            </>
          )}
        </ModalBody>
        <ModalFooter flexDirection="column">
          <HStack spacing={6}>
            {totalDebt - 200 > yusdAvailable ? (
              <Button variant="noYUSD">
                Additional {getNum(totalDebt - yusdAvailable - 200, 2)} YUSD required to close trove
                {/* - 200 here for the YUSD Gas compensation that will be paid back on close trove. */}
              </Button>
            ) : (
              <Button variant="primary" onClick={onSubmit}>
                Close Trove
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmCloseTroveModal;
