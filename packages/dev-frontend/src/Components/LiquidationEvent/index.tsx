// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Flex, Text, Button, Spacer, useDisclosure } from "@chakra-ui/react";
import ClaimCollateralSurplus from "./ClaimCollateralSurplus";
import { useLiquitySelector } from "@liquity/lib-react";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquity } from "../../hooks/LiquityContext";
import { Modal } from "@chakra-ui/modal";
import { format } from "../../Utils/number";
const selector = ({ trove, collateralSurplusBalance }: LiquityStoreState) => ({
  trove,
  collateralSurplusBalance
});

const LiquidationEvent: React.FC = () => {
  const { trove, collateralSurplusBalance } = useLiquitySelector(selector);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { liquity, account } = useLiquity();
  const [hasClaimableSurplus, setClaimableSurplus] = useState<boolean>(false);
  const [redemptionBonus, setRedemptionBonus] = useState<number>(0);

  // @ts-expect-error
  liquity.hasClaimableCollateral(account).then(surplus => {
    setClaimableSurplus(surplus);
  });
  // @ts-expect-error
  liquity.getRedemptionBonus(account).then(bonus => {
    setRedemptionBonus(format(bonus));
  });

  let isDisplayed = false,
    type;
  if (trove.status === "closedByLiquidation") {
    isDisplayed = true;
    type = "liquidation";
  } else if (trove.status === "closedByRedemption") {
    isDisplayed = true;
    type = "redeem";
  } else if (
    trove.status === "open" &&
    localStorage.getItem(account + "closeYetiFinanceBanner") != "open"
  ) {
    localStorage.setItem(account + "closeYetiFinanceBanner", "open");
  }

  let openBanner;
  const [update, setUpdate] = useState<0 | 1>(0);
  if (
    localStorage.getItem(account + "closeYetiFinanceBanner") == undefined ||
    localStorage.getItem(account + "closeYetiFinanceBanner") == "open"
  ) {
    openBanner = true;
  } else if (localStorage.getItem(account + "closeYetiFinanceBanner") == "close") {
    openBanner = false;
  }
  if (!isDisplayed) {
    openBanner = false;
  }
  if (hasClaimableSurplus || redemptionBonus != 0) {
    openBanner = true;
  }
  const onSubmit = (): void => {
    localStorage.setItem(account + "closeYetiFinanceBanner", "close");

    // Force a rerender of page
    setUpdate(1);
  };

  return (
    <>
      {openBanner && (
        <Flex
          bg={type === "redeem" ? "green.500" : "red.500"}
          align="center"
          px={16}
          py={6}
          w="100vw"
        >
          <Text fontWeight="bold" fontSize="2xl" color="brand.100">
            {type === "redeem"
              ? "You've been redeemed against "
              : type === "liquidation"
              ? "You've been liquidated "
              : hasClaimableSurplus && redemptionBonus != 0
              ? "You were liquidated and redeemed in past troves "
              : hasClaimableSurplus
              ? "You were liquidated in a past trove "
              : redemptionBonus != 0 && "You were redeemed against in a past trove "}
          </Text>
          <Spacer />
          {/* <a href="">
            <Button variant="tertiary" mr={6}>
              Snowtrace Link
            </Button>
          </a> */}
          {hasClaimableSurplus && redemptionBonus != 0 ? (
            <Button variant="tertiary" onClick={onOpen}>
              Claim Collateral Surplus and Redemption Bonus
            </Button>
          ) : hasClaimableSurplus ? (
            <Button variant="tertiary" onClick={onOpen}>
              Claim Collateral Surplus
            </Button>
          ) : redemptionBonus != 0 ? (
            <Button variant="tertiary" onClick={onOpen}>
              Claim Redemption Bonus
            </Button>
          ) : (
            <Button variant="tertiary" onClick={onSubmit}>
              Close
            </Button>
          )}
          <ClaimCollateralSurplus isOpen={isOpen} onClose={onClose} />
        </Flex>
      )}
    </>
  );
};

export default LiquidationEvent;
