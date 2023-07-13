// @ts-nocheck
import React, { useState } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from "@chakra-ui/modal";
import { Flex, Text, Button } from "@chakra-ui/react";
import Icon from "../../../components/Icon";
import { Collateral, CoinShow } from "../../../Types";
import { getNum, format } from "../../../Utils/number";
import { Form } from "react-final-form";
import Tooltip from "../../../components/Tooltip";
import { tokenDataMappingT } from "../../../TokenData";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

export type AddCollateralTypeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  availableCollateral: Collateral[];
  show?: any;
  setShow?: any;
  borrowMode: string;
};

// @ts-expect-error
const selector = ({ prices, total, safetyRatios }: LiquityStoreState) => ({
  prices,
  total,
  safetyRatios
});

const AddCollateralTypeModal: React.FC<AddCollateralTypeModalProps> = ({
  isOpen,
  onClose,
  availableCollateral,
  show,
  setShow,
  borrowMode
}) => {
  const { prices, total, safetyRatios } = useLiquitySelector(selector);
  const [toggle, setToggle] = useState(false);

  let filteredCollater: Collateral[] = availableCollateral.filter(
    coin => coin.token != "qiUSDTn" && coin.token != "av3CRV" && coin.token != "qiUSDTn"
  );
  filteredCollater = filteredCollater.filter(coin =>
    borrowMode != "unlever" ? true : coin.troveBalance != 0
  );
  const onSubmit = (values: CoinShow) => {
    setShow({ ...show, ...values });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <Form
          onSubmit={onSubmit}
          initialValues={[]}
          render={({ values }) => (
            <>
              <ModalHeader fontSize="2xl" pb={2}>
                Add Collateral Type
              </ModalHeader>

              <ModalBody>
                <Flex
                  textStyle="body2"
                  color="brand.600"
                  fontWeight="bold"
                  textTransform="uppercase"
                  px={4}
                  mb={3}
                >
                  <Text flex={3}>Token</Text>
                  <Text flex={2}>System Deposits</Text>
                  <Text flex={2}>Safety Ratio</Text>
                  <Text flex={2}>Wallet Balance</Text>
                </Flex>
                {filteredCollater.map(({ token, walletBalance, address }) => (
                  <Button
                    variant="tokenSelect"
                    bg={values[token] === true ? "brand.1000" : "brand.900"}
                    borderColor={values[token] === true ? "brand.700" : "transparent"}
                    my={2}
                    onClick={() => {
                      values[token] = values[token] === true ? false : true;
                      // console.log(values[token] === true);
                      setToggle(!toggle);
                    }}
                    key={token + format(safetyRatios[tokenDataMappingT[token].address])}
                  >
                    <Flex align="center" flex={3}>
                      <Icon iconName={token} h={6} w={6} />
                      <Text ml={3}>{token}</Text>
                    </Flex>
                    <Text flex={2} textAlign="left">
                      {/* @ts-expect-error */}$
                      {getNum(format(total.collaterals[address].mul(prices[address])), 2)}
                    </Text>
                    <Text flex={2} textAlign="left">
                      {getNum(format(safetyRatios[tokenDataMappingT[token].address]))}{" "}
                      <Tooltip>
                        {"Effective Minimum Collateral Ratio: " +
                          (
                            (1.1 / format(safetyRatios[tokenDataMappingT[token].address])) *
                            100
                          ).toFixed(2) +
                          "%"}
                      </Tooltip>
                    </Text>
                    <Text flex={2} textAlign="left">
                      {getNum(walletBalance)}
                    </Text>
                  </Button>
                ))}
              </ModalBody>

              <ModalFooter justifyContent={"flex-start"}>
                <Button variant="primary" mr={6} onClick={() => onSubmit(values)}>
                  Add
                </Button>

                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
              </ModalFooter>
            </>
          )}
        />
      </ModalContent>
    </Modal>
  );
};

export default AddCollateralTypeModal;
