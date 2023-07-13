// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";
import ProgressBar from "../../components/ProgressBar";
import { useTransactionFunction, useMyTransactionState } from "../../components/Transaction";
import { capitalizeFirstLetter } from "../../Utils/string";
import { Decimal, Farm } from "@liquity/lib-base";
import { Toggle, AdjustInput, CoinAmount, Icon } from "../../components";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { format, formatWithDecimals, getNum } from "../../Utils/number";
import { FarmPoolRewardsInfo, calculateBoostRewards } from "./FarmUtils";

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
import { Form } from "react-final-form";

const BOOSTED_FARM_ADDRESS = "0xD8A4AA01D54C8Fdd104EAC28B9C975f0663E75D8";
const OLD_FARM_ADDRESS = "0xfffFffFFfFe8aA117FE603a37188E666aF110F39";

export type BoosterCalculatorModalProps = {
  isOpen: boolean;
  onClose: () => void;
};
const selector = ({ boostedFarm, veYETIStaked, YETIPrice }: LiquityStoreState) => ({
  boostedFarm,
  veYETIStaked,
  YETIPrice
});

const BoosterCalculatorModal: React.FC<BoosterCalculatorModalProps> = ({ isOpen, onClose }) => {
  const { boostedFarm, veYETIStaked, YETIPrice } = useLiquitySelector(selector);
  const [value, setValue] = useState<Record<string, any>>({});
  let appliedVeYeti: number;
  if (format(veYETIStaked.yetiStakeOnFarm) === 0 || format(veYETIStaked.boostFactor) === 0) {
    appliedVeYeti = 0;
  } else {
    appliedVeYeti =
      (Math.pow(format(veYETIStaked.boostFactor), 2) /
        format(boostedFarm.lpTokenBalance) /
        10 ** 18) *
      10 ** 22;
  }

  const calculateTime = () => {
    const veYETIBal = value["veYETIBal"];
    const rate = format(veYETIStaked.accumulationRate);
    const YETIStaked = value["YETIStaked"];

    if (veYETIBal < appliedVeYeti) {
      return 0;
    }

    const result = (veYETIBal - appliedVeYeti) / rate / YETIStaked / 86400;
    return isNaN(result) || !isFinite(result) ? 0 : result;
  };

  const farmPoolRewardInfo = calculateBoostRewards(
    veYETIStaked,
    format(YETIPrice),
    boostedFarm,
    +value["LPStaked"],
    +value["veYETIBal"]
  );

  // console.log(value)
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="2xl" pb={5}>
            Booster Calculator
            <ModalCloseButton />
          </ModalHeader>

          <ModalBody mb={5}>
            <Form
              onSubmit={() => {}}
              render={({ values }) => (
                <>
                  {setValue(values)}
                  <Flex>
                    <Text textStyle="body1" fontWeight="bold" mt={2}>
                      Curve LP Token Staked
                    </Text>
                  </Flex>
                  <Flex>
                    <AdjustInput
                      mt={2}
                      max={undefined}
                      name="LPStaked"
                      token="CLP"
                      showToken
                      fillContainer
                      noCurrencyConvert={true}
                      defaultValue={format(boostedFarm.lpTokenBalance)}
                    />
                  </Flex>

                  <Flex>
                    <Text textStyle="body1" fontWeight="bold" mt={2}>
                      veYETI Accumulated on LP Boosting
                    </Text>
                  </Flex>
                  <Flex>
                    <AdjustInput
                      mt={2}
                      max={undefined}
                      min={appliedVeYeti}
                      name="veYETIBal"
                      token="veYETI"
                      showToken
                      fillContainer
                      noCurrencyConvert={true}
                      defaultValue={appliedVeYeti}
                    />
                  </Flex>

                  <Flex>
                    <Text textStyle="body1" fontWeight="bold" mt={2}>
                      YETI Staked
                    </Text>
                  </Flex>
                  <Flex>
                    <AdjustInput
                      mt={2}
                      max={undefined}
                      name="YETIStaked"
                      token="YETI"
                      showToken
                      fillContainer
                      noCurrencyConvert={true}
                      defaultValue={format(veYETIStaked.yetiStakeOnFarm)}
                    />
                  </Flex>

                  <Flex>
                    <Text textStyle="body1" fontWeight="bold" mt={2}>
                      Weekly Boost YETI Reward Estimate
                    </Text>
                  </Flex>
                  <Flex mt={2}>
                    <CoinAmount
                      token="YETI"
                      amount={farmPoolRewardInfo.userAnnualBoostedReward / 52.143}
                      textStyle="subtitle1"
                      color="green.400"
                    />
                  </Flex>

                  <Flex>
                    <Text textStyle="body1" fontWeight="bold" mt={2}>
                      Boost YETI Reward APR
                    </Text>
                  </Flex>
                  <Flex>
                    <Text textStyle="subtitle1" color="green.400" mt={2}>
                      {farmPoolRewardInfo.boostedAPR > 0 && farmPoolRewardInfo.boostedAPR < 0.001
                        ? "< 0.001"
                        : getNum(farmPoolRewardInfo.boostedAPR, 3)}
                      %
                    </Text>
                  </Flex>

                  <Flex>
                    <Text textStyle="body1" fontWeight="normal" mt={2}>
                      It will take you {getNum(calculateTime(), 2)} days to accumulate{" "}
                      {getNum(+value["veYETIBal"], 2)} veYETI starting from your current veYETI
                      balance of {getNum(appliedVeYeti, 2)} with {getNum(+value["YETIStaked"], 2)}{" "}
                      staked YETI.
                    </Text>
                  </Flex>
                </>
              )}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default BoosterCalculatorModal;
