import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  Spacer,
  Tag,
  Text,
  useDisclosure,
  useToast
} from "@chakra-ui/react";
import { Toggle, AdjustInput, CoinAmount } from "../../components";
import Tooltip from "../../components/Tooltip";
import ConfirmRedeemModal from "./ConfirmRedeemModal";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { capitalizeFirstLetter } from "../../Utils/string";
import { adjustValue, newWeeklyAPR, getNum, format } from "../../Utils/number";
import { validateRedeem } from "../../Utils/validation";
import { Form } from "react-final-form";
import { useLiquity } from "../../hooks/LiquityContext";
import { TroveData } from "./RedemptionUtils";

export type RedeemCardProps = {
  firstTenTroves: TroveData[];
};

const selector = ({ yusdBalance }: LiquityStoreState) => ({
  yusdBalance
});

const RedeemCard: React.FC<RedeemCardProps> = ({ firstTenTroves }) => {
  const { liquity, account } = useLiquity();

  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();

  const { yusdBalance } = useLiquitySelector(selector);

  const [redeemFee, setRedeemFee] = useState<number>(0);

  const [collsToReceiveUpdated, setCollsToReceiveUpdated] = useState<boolean>(false);

  useEffect(() => {
    const getSetRedeemFee = async () => {
      setRedeemFee(format(await liquity.getRedemptionFeeRate()));
    };

    getSetRedeemFee();
  }, []);

  const toast = useToast();

  const validate = (value: number) => {
    validateRedeem(toast, format(yusdBalance), 0, value, onConfirmOpen);
    // validateRedeem(toast, 100000000, 0, value, onConfirmOpen);
  };

  return (
    <>
      <Box layerStyle="card" flex={1}>
        <Text textStyle="title3" mb={2}>
          Redeem YUSD
        </Text>

        <Text textStyle="body1" mb={2}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={
              "https://techdocs.yeti.finance/how-does-yeti-finance-work/redemptions-and-yusd-price-stability#what-are-redemptions"
            }
            style={{ outline: "none", textDecoration: "underline" }}
          >
            Learn More
          </a>
        </Text>

        <Form
          onSubmit={() => {}}
          render={({ values }) => (
            <>
              {isConfirmOpen && (
                <ConfirmRedeemModal
                  isOpen={isConfirmOpen}
                  onClose={onConfirmClose}
                  amount={values.yusdRedeemInput || "0"}
                  values={values}
                  redeemRate={Decimal.from(redeemFee)}
                  firstTenTroves={firstTenTroves}
                  updated={collsToReceiveUpdated}
                  setUpdated={setCollsToReceiveUpdated}
                />
              )}
              <AdjustInput
                mt={4}
                max={format(yusdBalance) * (1 - redeemFee - 0.0005)}
                // max={undefined}
                name="yusdRedeemInput"
                token="YUSD"
                showToken
                fillContainer
                transactionId="redeemYUSD"
              />
              <Text textStyle="body1" fontWeight="bold" mt={1.5}>
                Wallet Balance: {getNum(format(yusdBalance))} YUSD
              </Text>

              <Flex mt={4} justify="flex-end">
                <Text textStyle="body2">YUSD Redeem Fee: {getNum(redeemFee * 100, 3)}%</Text>
                <Spacer />
                <Button
                  colorScheme="brand"
                  onClick={() => validate(values.yusdRedeemInput)}
                  disabled={firstTenTroves.length === 0}
                >
                  Redeem
                </Button>
              </Flex>
            </>
          )}
        />
      </Box>
    </>
  );
};

export default RedeemCard;
