// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";

import { useLiquity } from "../../hooks/LiquityContext";
import { useMyTransactionState, useTransactionFunction } from "../../components/Transaction";
import { capitalizeFirstLetter } from "../../Utils/string";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { format } from "../../Utils/number";

import ProgressBar from "../../components/ProgressBar";
import { CoinAmount } from "../../components";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalCloseButton
} from "@chakra-ui/modal";
import { Flex, Text, Button, Spacer, HStack, useDisclosure } from "@chakra-ui/react";
import { Decimal } from "@liquity/lib-base";
import TransactionModal from "../../components/TransactionModal";

export type ConfirmDepositModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "deposit" | "withdraw";
  amount: string;
  total: number;
  values: Record<string, any>;
  name: string;
};

const selector = ({ yusdBalance, stabilityDeposit }: LiquityStoreState) => ({
  yusdBalance,
  stabilityDeposit
});

const ConfirmDepositModal: React.FC<ConfirmDepositModalProps> = ({
  isOpen,
  onClose,
  mode,
  amount,
  total,
  values,
  name
}) => {
  const { yusdBalance, stabilityDeposit } = useLiquitySelector(selector);
  const { isOpen: isTxModalOpen, onOpen: onTxModalOpen, onClose: onTxModalClosed } = useDisclosure();

  const { liquity, account } = useLiquity();

  let newAmount;

  const getFormattedValue = (value: string): number => {
    if (/^[0-9.]*$/.test(value)) {
      return +value;
    }
    return 0;
  };
  const formatedAmount = getFormattedValue(amount);
  if (mode === "deposit" && formatedAmount === format(yusdBalance)) {
    newAmount = yusdBalance;
  } else {
    if (
      mode === "withdraw" &&
      Decimal.from(formatedAmount).add(Decimal.from(".000009")).gte(stabilityDeposit.currentYUSD)
    ) {
      newAmount = stabilityDeposit.currentYUSD;
    } else if (
      mode === "deposit" &&
      Decimal.from(formatedAmount).add(Decimal.from(".000009")).gte(yusdBalance)
    ) {
      newAmount = yusdBalance;
    } else {
      newAmount = Decimal.from(formatedAmount);
    }
  }

  const transactionId = "stability-deposit";
  const [sendTransaction] = useTransactionFunction(
    transactionId,
    mode === "deposit"
      ? liquity.send.depositYUSDInStabilityPool.bind(liquity.send, newAmount)
      : liquity.send.withdrawYUSDFromStabilityPool.bind(liquity.send, newAmount)
  );

  const onDeposit = () => {
    sendTransaction();

    onClose();
    onTxModalOpen();
    delete values[name];
  };

  const action = capitalizeFirstLetter(mode) == "Deposit" ? "Stake" : "Unstake";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="2xl" pb={1}>
          Confirm {action}
          <ModalCloseButton />
        </ModalHeader>

        <ModalBody>
          <Flex>
            <Text fontSize="lg">{action} Amount:</Text>
            <Spacer />
            <CoinAmount
              amount={formatedAmount}
              token="YUSD"
              fontWeight="bold"
              color="white"
              fontSize="md"
            />
          </Flex>
          <Flex mt={3}>
            <Text color="brand.200">Total Staked</Text>
            <Spacer />
            <CoinAmount amount={total} token="YUSD" fontWeight="bold" />
          </Flex>
        </ModalBody>

        <ModalFooter flexDirection="column">
          <HStack spacing={6}>
            <Button variant={"primary"} onClick={onDeposit}>
              {action}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmDepositModal;
