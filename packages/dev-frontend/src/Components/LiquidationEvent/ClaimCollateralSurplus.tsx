// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Tr, Td, Flex, Text, Button } from "@chakra-ui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from "@chakra-ui/modal";
import { useTransactionFunction } from "../Transaction";
import Icon from "../Icon";
import CoinAmount from "../CoinAmount";
import TokenTable from "../TokenTable";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquity } from "../../hooks/LiquityContext";
import { format } from "../../Utils/number";
import tokenData from "../../TokenData";
import { useLiquitySelector } from "@liquity/lib-react";

const selector = ({ collateralSurplusBalance }: LiquityStoreState) => ({
  collateralSurplusBalance
});

export type ClaimCollateralSurplusProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ClaimCollateralSurplus: React.FC<ClaimCollateralSurplusProps> = ({ isOpen, onClose }) => {
  const { liquity, account } = useLiquity();
  const { collateralSurplusBalance } = useLiquitySelector(selector);

  const rewardTokens = tokenData.filter(({ address }) =>
    Object.keys(collateralSurplusBalance).includes(address)
  );

  const [redemptionBonus, setRedemptionBonus] = useState<number>(0);

  useEffect(() => {
    const getBottomFiveTroves = async () => {
      // @ts-expect-error
      const tempRB = await liquity.getRedemptionBonus(account);

      setRedemptionBonus(format(tempRB));
    };
    getBottomFiveTroves();
  }, []);

  const [sendTransaction] = useTransactionFunction(
    "claim-surplus",
    liquity.send.claimCollateralSurplus.bind(liquity.send)
  );

  const onSubmit = (): void => {
    sendTransaction();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="2xl" pb={1}>
          Claim Collateral Surplus
        </ModalHeader>

        <ModalBody px={0}>
          <Text textStyle="body1" fontSize="lg" pt={4} px={6}>
            Redemption Bonus:
          </Text>
          <TokenTable headers={["token", "amount"]} width={5}>
            <>
              <Tr key={"YUSD"}>
                <Td pb={0} pt={4}>
                  <Flex align="center">
                    <Icon iconName={"YUSD"} h={5} w={5} />
                    <Text ml={3}>{"YUSD"}</Text>
                  </Flex>
                </Td>
                {[...new Array(3)].map(_ => (
                  <Td pb={0} pt={4} />
                ))}
                <Td pb={0} pt={4}>
                  <CoinAmount token={"YUSD"} amount={redemptionBonus} />
                </Td>
              </Tr>
              )
            </>
          </TokenTable>

          <Text textStyle="body1" fontSize="lg" pt={4} px={6}>
            Claimable Collaterals:
          </Text>

          <TokenTable headers={["token", "amount"]} width={5}>
            <>
              {rewardTokens.map(({ token, address }) => (
                <Tr key={token}>
                  <Td pb={0} pt={4}>
                    <Flex align="center">
                      <Icon iconName={token} h={5} w={5} />
                      <Text ml={3}>{token}</Text>
                    </Flex>
                  </Td>
                  {[...new Array(3)].map(_ => (
                    <Td pb={0} pt={4} />
                  ))}
                  <Td pb={0} pt={4}>
                    {/*  @ts-expect-error */}
                    <CoinAmount token={token} amount={format(collateralSurplusBalance[address])} />
                  </Td>
                </Tr>
              ))}
            </>
          </TokenTable>
        </ModalBody>

        <ModalFooter justifyContent="flex-start" mt={2}>
          <Button variant="primary" mr={6} onClick={onSubmit}>
            Claim
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ClaimCollateralSurplus;
