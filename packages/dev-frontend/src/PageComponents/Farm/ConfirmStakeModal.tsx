// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";

import ProgressBar from "../../components/ProgressBar";
import CoinAmount from "../../components/CoinAmount";
import { useTransactionFunction, useMyTransactionState } from "../../components/Transaction";
import { capitalizeFirstLetter } from "../../Utils/string";
import { Decimal, Farm } from "@liquity/lib-base";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { format } from "../../Utils/number";

import { useLiquity } from "../../hooks/LiquityContext";

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
import { SiEventstore } from "react-icons/si";
import Tooltip from "../../components/Tooltip";
import TransactionModal from "../../components/TransactionModal";
import { contractAddresses } from "../../config/constants";

const BOOSTED_FARM_ADDRESS = contractAddresses.boostedFarm.address;
const OLD_FARM_ADDRESS = "0xfffFffFFfFe8aA117FE603a37188E666aF110F39";

export type ConfirmStakeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "deposit" | "withdraw";
  amount: string;
  total: number;
  values: Record<string, any>;
  name: string;
  isOldFarm?: boolean;
};
const selector = ({ yetiBalance, lpTokenBalance, boostedFarm, farm }: LiquityStoreState) => ({
  yetiBalance,
  lpTokenBalance,
  boostedFarm,
  farm
});

const ConfirmStakeModal: React.FC<ConfirmStakeModalProps> = ({
  isOpen,
  onClose,
  mode,
  amount,
  total,
  values,
  name,
  isOldFarm
}) => {
  const { yetiBalance, lpTokenBalance, boostedFarm, farm } = useLiquitySelector(selector);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const action = capitalizeFirstLetter(mode) == "Deposit" ? "Stake" : "Unstake";

  const { liquity, account } = useLiquity();
  var { userAddress } = liquity.connection;
  // console.log("111", userAddress);
  if (userAddress === undefined) {
    userAddress = "";
  }
  const { isOpen: isTxModalOpen, onOpen: onTxModalOpen, onClose: onTxModalClosed } = useDisclosure();

  const getFormattedValue = (value: string): number => {
    try {
      Decimal.from(value);
      return +value;
    } catch (err) {
      return 0;
    }
  };
  useEffect(() => {
    // let tot:Decimal = Decimal.ZERO
    // if (!(getFormattedValue(amount) == 0)) {
    //   tot = Decimal.from(amount)
    // }
    const open = isOpen;
    let interval: any = undefined;
    if (open) {
      interval = setInterval(async () => {
        const allowance = await checkAllowance(
          contractAddresses.lpToken.address,
          Decimal.from(getFormattedValue(amount))
        );
        if (allowance) {
          setStep(2);
        } else {
          setStep(1);
        }
      }, 1500);
    }

    return () => clearInterval(interval);
  }, [amount, isOpen]);

  let newAmount: Decimal;

  const formatedAmount = getFormattedValue(amount);

  if (mode === "deposit" && formatedAmount === format(yetiBalance)) {
    newAmount = yetiBalance;
  } else {
    if (
      mode === "deposit" &&
      Decimal.from(formatedAmount).add(Decimal.from(".00009")).gte(lpTokenBalance)
    ) {
      newAmount = lpTokenBalance;
    } else if (
      mode === "withdraw" &&
      Decimal.from(formatedAmount)
        .add(Decimal.from(".00009"))
        .gte(isOldFarm ? farm.lpTokenBalance : boostedFarm.lpTokenBalance)
    ) {
      newAmount = isOldFarm ? farm.lpTokenBalance : boostedFarm.lpTokenBalance;
    } else if (!isNaN(formatedAmount)) {
      newAmount = Decimal.from(formatedAmount);
    } else {
      newAmount = Decimal.from(0);
    }
  }

  // console.log("newAmount", newAmount.toString())
  const [sendTransaction] = useTransactionFunction(
    "stakeLPTokens",
    mode === "deposit"
      ? liquity.send.stakeLPTokens.bind(liquity.send, newAmount)
      : liquity.send.withdrawLPTokens.bind(liquity.send, newAmount)
  );

  const [sentTransactionOldFarm] = useTransactionFunction(
    "stakeLPTokensOldFarm",
    mode === "deposit"
      ? liquity.send.stakeLPTokensOldFarm.bind(liquity.send, newAmount)
      : liquity.send.withdrawLPTokensOldFarm.bind(liquity.send, newAmount)
  );

  const transactionId = "stakeLPTokens";
  const myTransactionState = useMyTransactionState(transactionId);

  const checkAllowance = async (token: string, amount: Decimal): Promise<boolean> => {
    const result = await liquity.getAllowanceOf(
      account,
      token,
      isOldFarm ? OLD_FARM_ADDRESS : BOOSTED_FARM_ADDRESS,
      amount
    );

    return result;
  };

  /*
  Fixme:
  amount should be a number like depositYUSDInStabilityPool
  **/
  const [approveTransaction] = useTransactionFunction(
    "approve",
    liquity.send.approveToken.bind(
      liquity.send,
      contractAddresses.lpToken.address,
      isOldFarm ? OLD_FARM_ADDRESS : BOOSTED_FARM_ADDRESS,
      Decimal.from("10000000000000000000")
    )
  );

  const onApprove = () => {
    approveTransaction();
  };

  const onDeposit = () => {
    if (step === 2 || mode == "withdraw") {
      // console.log(mode);
      if (isOldFarm) {
        console.log(isOldFarm);
        sentTransactionOldFarm();
      } else {
        sendTransaction();
      }
      onClose();
      delete values[name];
    }
  };

  let confirmStakeButtons = (
    <ModalFooter flexDirection="column">
      <HStack spacing={6}>
        <Button variant={step !== 1 ? "quaternary" : "primary"} onClick={onApprove}>
          Approve
        </Button>

        <Button variant={step !== 2 ? "quaternary" : "primary"} onClick={onDeposit}>
          {action}
        </Button>
      </HStack>
      <ProgressBar step={step === 2 ? 1 : 0} w="30%" mt={2} />
    </ModalFooter>
  );

  if (action == "Unstake") {
    confirmStakeButtons = (
      <ModalFooter flexDirection="column">
        <HStack spacing={6}>
          <Button variant={"primary"} onClick={onDeposit}>
            {action}
          </Button>
        </HStack>
      </ModalFooter>
    );
  }

  return (
    <>
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
                token="Curve LP Tokens"
                fontWeight="bold"
                color="white"
                fontSize="md"
                noCurrencyConvert={true}
              />
            </Flex>
            <Flex mt={3}>
              <Text color="brand.200">New Total Staked Curve LP Tokens</Text>
              <Spacer />
              <CoinAmount
                amount={total}
                token="Curve LP Tokens"
                fontWeight="bold"
                noCurrencyConvert={true}
              />
            </Flex>
          </ModalBody>
          {confirmStakeButtons}
        </ModalContent>
      </Modal>
      {/* <TransactionModal
        status={myTransactionState.type}
        isOpen={isTxModalOpen}
        onClose={onTxModalClosed}
      /> */}
    </>
  );
};

export default ConfirmStakeModal;
