import React, { useState, useEffect } from "react";

import ProgressBar from "../../components/ProgressBar";
import CoinAmount from "../../components/CoinAmount";
import { useTransactionFunction, useMyTransactionState } from "../../components/Transaction";
import { Decimal } from "@liquity/lib-base";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { format, formatWithDecimals, getNum } from "../../Utils/number";

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
import { Flex, Text, Button, Spacer, HStack, useDisclosure, Tag, Tr, Td } from "@chakra-ui/react";
import { SiEventstore } from "react-icons/si";
import Tooltip from "../../components/Tooltip";
import TransactionModal from "../../components/TransactionModal";
import { TroveData } from "./RedemptionUtils";
import { Icon, Loader, TokenTable } from "../../components";
import { tokenDataMappingA } from "../../TokenData";
import { TroveMappings } from "../../Types";
import { contractAddresses } from "../../config/constants";

export type ConfirmRedeemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  values: Record<string, any>;
  redeemRate: Decimal;
  firstTenTroves: TroveData[];
  updated: boolean;
  setUpdated: React.Dispatch<React.SetStateAction<boolean>>;
};
const selector = ({ yusdBalance, underlyingPrices }: LiquityStoreState) => ({
  yusdBalance,
  underlyingPrices
});

const ConfirmRedeemModal: React.FC<ConfirmRedeemModalProps> = ({
  isOpen,
  onClose,
  amount,
  values,
  redeemRate,
  firstTenTroves,
  updated,
  setUpdated
}) => {
  const { liquity, account } = useLiquity();

  const { isOpen: isTxModalOpen, onOpen: onTxModalOpen, onClose: onTxModalClosed } = useDisclosure();

  const { yusdBalance, underlyingPrices } = useLiquitySelector(selector);

  // const [ collateralsToReceive, setCollateralsToReceive ] = useState<TroveMappings>({} as TroveMappings)

  const getFormattedValue = (value: string): number => {
    try {
      Decimal.from(value);
      return +value;
    } catch (err) {
      return 0;
    }
  };

  let newAmount;

  const formatedAmount = getFormattedValue(amount);
  if (
    formatedAmount === format(yusdBalance) ||
    Decimal.from(formatedAmount).add(Decimal.from(".000009")).gte(yusdBalance)
  ) {
    newAmount = yusdBalance;
  } else {
    newAmount = Decimal.from(formatedAmount);
  }

  const transactionId = "redeem";
  const myTransactionState = useMyTransactionState(transactionId);

  const checkAllowance = async (token: string, amount: Decimal): Promise<boolean> => {
    const result = await liquity.getAllowanceOf(
      account,
      token,
      contractAddresses.troveManager.address,
      amount
    );

    return result;
  };

  const [hasAllowance, setHasAllowance] = useState<boolean>(false);

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
          contractAddresses.yusdToken.address,
          Decimal.from(getFormattedValue(amount))
        );
        if (allowance) {
          setHasAllowance(true);
        } else {
          setHasAllowance(false);
        }
      }, 1500);
    }

    return () => clearInterval(interval);
  }, [amount, isOpen]);

  const [redeem] = useTransactionFunction(
    transactionId,
    liquity.send.redeemYUSD.bind(liquity.send, newAmount, redeemRate.add(Decimal.from(0.0005)))
  );

  const [approveTransaction] = useTransactionFunction(
    "approve",
    liquity.send.approveToken.bind(
      liquity.send,
      contractAddresses.yusdToken.address,
      contractAddresses.troveManager.address,
      Decimal.from("1000000000000000000000")
    )
  );

  const onApprove = () => {
    approveTransaction();
  };

  const [collateralsToReceive, setCollateralsToReceive] = useState<TroveMappings>(
    {} as TroveMappings
  );

  useEffect(() => {
    const getSetEstimation = async () => {
      // this amount decreases as when the redeem transaction closes a trove
      let amountToRedeem: number = +amount;

      // troves that is sorted by AICR
      const trovesToRedeem: TroveData[] = [...firstTenTroves];

      const tempMapping: TroveMappings = {};

      while (amountToRedeem > 0 && trovesToRedeem.length > 0) {
        console.log(firstTenTroves);
        const troveToRedeem = trovesToRedeem.shift();

        const trove = await liquity.getTrove(troveToRedeem?.owner);

        const troveColls = trove.collaterals;

        let troveCollsUSDValue = 0;

        // check if this trove will be fully redeemed
        Object.keys(troveColls).forEach(address => {
          troveCollsUSDValue += format(troveColls[address].mul(underlyingPrices[address]));
        });

        if (troveCollsUSDValue < amountToRedeem) {
          Object.keys(troveColls).forEach(address => {
            if (troveColls[address].gt(Decimal.from(0))) {
              tempMapping[address] =
                tempMapping[address] === undefined
                  ? troveColls[address]
                  : tempMapping[address].add(troveColls[address]);
            }
          });
        } else {
          const portionOfTrove = amountToRedeem / troveCollsUSDValue;
          Object.keys(troveColls).forEach(address => {
            if (troveColls[address].gt(Decimal.from(0))) {
              const toAdd = troveColls[address].mul(Decimal.from(portionOfTrove));
              tempMapping[address] =
                tempMapping[address] === undefined ? toAdd : tempMapping[address].add(toAdd);
            }
          });
          // console.log(collateralsToReceive)
        }
        amountToRedeem -= troveCollsUSDValue;
      }
      setUpdated(true);
      setCollateralsToReceive(tempMapping);
    };

    getSetEstimation();
  }, []);

  const onDeposit = () => {
    // console.log(mode);
    redeem();
    onClose();
    delete values["yusdRedeemInput"];
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="2xl" pb={1}>
            Confirm Redeem
            <ModalCloseButton />
          </ModalHeader>

          <ModalBody>
            <Flex>
              <Text fontSize="lg">Redeem Amount:</Text>
              <Spacer />
              <CoinAmount
                amount={formatedAmount}
                token="YUSD"
                fontWeight="bold"
                color="white"
                fontSize="md"
              />
            </Flex>

            <Flex mt={5}>
              <Text fontSize="lg">Max Redemption Fee:</Text>
              <Spacer />
              <CoinAmount
                amount={format(redeemRate.add(Decimal.from(0.0005)).mul(newAmount))}
                token="YUSD"
                fontWeight="bold"
                color="white"
                fontSize="md"
              />
            </Flex>

            <Text textStyle="body1" fontSize="lg" pt={10}>
              Estimated Collaterals to Receive:
            </Text>
            {updated ? (
              <TokenTable headers={["token", "amount"]} width={5}>
                <>
                  {Object.keys(collateralsToReceive).map(address => {
                    return (
                      <Tr key={address}>
                        <Td pb={0} pt={4}>
                          <Flex align="center">
                            <Icon iconName={tokenDataMappingA[address].token} h={5} w={5} />
                            <Text ml={3}>{tokenDataMappingA[address].token}</Text>
                          </Flex>
                        </Td>
                        {[...new Array(3)].map(_ => (
                          <Td pb={0} pt={4} />
                        ))}
                        <Td pb={0} pt={4}>
                          <CoinAmount
                            token={tokenDataMappingA[address].token}
                            amount={format(collateralsToReceive[address])}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </>
              </TokenTable>
            ) : (
              <Flex flexDirection="column" alignItems="center" gap={4}>
                <Loader />
                <Text textStyle="title4">Calculating</Text>
              </Flex>
            )}
          </ModalBody>
          <ModalFooter flexDirection="column">
            <HStack spacing={6}>
              <Button variant={hasAllowance ? "quaternary" : "primary"} onClick={onApprove}>
                Approve
              </Button>

              <Button
                variant={!hasAllowance ? "quaternary" : "primary"}
                disabled={!hasAllowance}
                onClick={onDeposit}
              >
                Redeem
              </Button>
            </HStack>
            <ProgressBar step={hasAllowance ? 1 : 0} w="30%" mt={2} />
          </ModalFooter>
        </ModalContent>
      </Modal>
      <TransactionModal
        status={myTransactionState.type}
        isOpen={isTxModalOpen}
        onClose={onTxModalClosed}
      />
    </>
  );
};

export default ConfirmRedeemModal;
