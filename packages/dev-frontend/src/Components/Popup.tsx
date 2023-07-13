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
import { VStack, Button, Flex, Text, Stack, Center, Divider, Link } from "@chakra-ui/react";
import Checkbox from "./Checkbox";
import { useLiquity } from "../hooks/LiquityContext";

export type PopupProps = {
  isOpen: boolean;
  onClose: () => void;
  header: string;
  infographSrc?: string;
  mode?: string;
};

const Popup: React.FC<PopupProps> = ({ isOpen, onClose, header, infographSrc = "", mode = "" }) => {
  const [showInfograph, setShowInfograph] = useState(false);
  const [understandDisclaimer, setUnderstandDisclaimer] = useState(false);
  const [understandDisclaimerError, setUnderstandDisclaimerError] = useState(false);
  const { account } = useLiquity();
  const onSubmit = (): void => {
    if (mode == "") {
      if (!understandDisclaimer) {
        setUnderstandDisclaimerError(true);
      } else {
        localStorage.setItem(account + "agreedToYetiFinanceDisclaimerMainnet", "agreed");
        onClose();
      }
    } else if (mode == "borrow") {
      localStorage.setItem(account + "agreedToYetiBorrowInfograph", "agreed");
      onClose();
    } else if (mode == "veYETI") {
      localStorage.setItem(account + "agreedToYetiveYETIInfograph", "agreed");
      onClose();
    } else if (mode == "farm") {
      localStorage.setItem(account + "agreedToYetiFarmInfograph", "agreed");
      onClose();
    }
  };

  const onSubmit2 = (): void => {
    if (!understandDisclaimer) {
      setUnderstandDisclaimerError(true);
    } else {
      localStorage.setItem(account + "agreedToYetiFinanceDisclaimerMainnet", "agreed");
      setShowInfograph(true);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      scrollBehavior="inside"
      closeOnOverlayClick={false}
    >
      <ModalOverlay backdropFilter="blur(1px)" />
      <ModalContent>
        <ModalHeader fontSize="2xl" pb={2}>
          {localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") == undefined
            ? "Disclaimer: Risks of Using Protocol"
            : header}
        </ModalHeader>
        <ModalBody>
          <Stack spacing={3}>
            {localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") == undefined && (
              <>
                <Text fontWeight="bold">Use at Your Own Risk:</Text>
                <Text>
                  Yeti Finance is a novel, decentralized borrowing protocol that allows users to
                  deposit assets and borrow the protocol’s native stablecoin, YUSD, against them. The
                  Yeti Finance protocol is made up of both proprietary and free, public, and
                  open-source software.
                </Text>
                <Text>
                  Your use of Yeti Finance involves various risks, including, but not limited, to
                  losses while digital assets are deposited into Yeti Finance via smart contract or
                  economic exploits, and losses due to liquidations and redemptions.
                </Text>
                <Text>
                  Before borrowing, staking, or liquidity providing you should fully review our{" "}
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={"https://techdocs.yeti.finance/"}
                    style={{ outline: "none", textDecoration: "underline" }}
                  >
                    technical documentation
                  </a>{" "}
                  to understand how the Yeti Finance protocol works.
                </Text>
                <Text>
                  While the Yeti Finance Decentralized Finance Protocol has been thoroughly audited
                  by multiple independent software security firms and undergone third-party economic
                  analysis, there remains a risk that assets deposited into the protocol as well as
                  the YUSD and YETI tokens may suffer complete and permanent economic loss should the
                  protocol’s technical or economic mechanisms suffer catastrophic failure.
                </Text>
                <Text>
                  THE YETI FINANCE PROTOCOL IS PROVIDED “AS IS”, AT YOUR OWN RISK, AND WITHOUT
                  WARRANTIES OF ANY KIND. No developer or entity involved in creating the YETI
                  FINANCE PROTOCOL will be liable for any claims or damages whatsoever associated
                  with your use, inability to use, or your interaction with other users of the Yeti
                  Finance protocol, including any direct, indirect, incidental, special, exemplary,
                  punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or
                  anything else of value.
                </Text>
              </>
            )}
            {mode == "borrow" &&
            localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") != undefined ? (
              <Text>
                Deposit Collateral like wrapped AVAX, Trader Joe LP Tokens, and Benqi qiTokens into
                your trove. Get out our stablecoin YUSD, all while earning yield on your collateral!
              </Text>
            ) : mode == "veYETI" &&
              localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") != undefined ? (
              <Text>
                veYETI will be used to boost{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={
                    "https://techdocs.yeti.finance/earning-with-yeti-finance/avax-yusd-lp-farming"
                  }
                  style={{ outline: "none", textDecoration: "underline" }}
                >
                  liquidity provider
                </a>{" "}
                rewards, boost{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={
                    "https://techdocs.yeti.finance/how-does-yeti-finance-work/stability-pool-and-liquidations"
                  }
                  style={{ outline: "none", textDecoration: "underline" }}
                >
                  stability pool
                </a>{" "}
                rewards, or reduce fees.
              </Text>
            ) : mode == "farm" &&
              localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") != undefined ? (
              <Text>
                Stake YUSD in the Stability Pool to get YETI rewards, as well as a portion of
                liquidation rewards!
              </Text>
            ) : (
              <></>
            )}
          </Stack>
          <Center mt={5}>
            {mode != "" &&
              localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") !=
                undefined && (
                <img src={infographSrc} alt="Yeti Finance" style={{ textAlign: "center" }} />
              )}
          </Center>
          {mode == "farm" &&
            localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") != undefined && (
              <>
                <Divider mb={8} />
                <Stack spacing={3}>
                  <Text mb={5}>
                    Pair YUSD with native USDC and USDT on Curve, and deposit your LP tokens to earn
                    YETI!{" "}
                  </Text>
                </Stack>
                <img src="/img/farm.png" alt="Yeti Finance" style={{ textAlign: "center" }} />
              </>
            )}
        </ModalBody>
        <ModalFooter justifyContent={"center"}>
          <VStack>
            {localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") == undefined && (
              <Flex mb={1} mt={2}>
                <Checkbox
                  isChecked={understandDisclaimer}
                  onChange={() => setUnderstandDisclaimer(!understandDisclaimer)}
                  error={understandDisclaimerError}
                  label="I understand the risks and would like to proceed."
                  popup={true}
                />
              </Flex>
            )}
            {mode != "" &&
            localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") == undefined ? (
              <Button variant="primary" mr={3} onClick={onSubmit2}>
                Proceed
              </Button>
            ) : (
              <Button variant="primary" mr={3} onClick={onSubmit}>
                Proceed
              </Button>
            )}
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Popup;
