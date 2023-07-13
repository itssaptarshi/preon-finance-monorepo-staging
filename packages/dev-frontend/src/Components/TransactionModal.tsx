// @ts-nocheck
import React from "react";
import {
  Modal,
  Flex,
  Box,
  Text,
  Button,
  ModalContent,
  ModalOverlay,
  ModalBody
} from "@chakra-ui/react";
import Loader from "./Loader";
import Icon from "./Icon";

export type TransactionModalProps = {
  status:
    | "loading"
    | "idle"
    | "waitingForApproval"
    | "waitingForConfirmation"
    | "failed"
    | "cancelled"
    | "confirmed"
    | "confirmedOneShot";
  isOpen: boolean;
  onClose: () => void;
};
const x = "waitingForApproval";

const TransactionModal: React.FC<TransactionModalProps> = ({ status, isOpen, onClose }) => {
  return (
    <>
      {status === "waitingForApproval" || status === "idle" ? (
        <></>
      ) : (
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalBody>
              <Flex
                justifyContent="center"
                alignContent="center"
                px={3}
                py={6}
                borderRadius="md"
                backgroundColor="brand.800"
              >
                {status === "waitingForConfirmation" ? (
                  <Flex flexDirection="column" alignItems="center" gap={4}>
                    <Loader />
                    <Text textStyle="title4">Transaction Loading</Text>
                  </Flex>
                ) : (
                  <Flex flexDirection="column" alignItems="center" gap={4}>
                    <Box>
                      <Icon
                        iconName={
                          status === "confirmed" || status === "confirmedOneShot"
                            ? "Success"
                            : "Failure"
                        }
                        w={16}
                        h={16}
                      />
                    </Box>
                    <Text textStyle="title4">
                      {status === "confirmed" || status === "confirmedOneShot"
                        ? "Transaction Successful"
                        : "Transaction Failed"}
                    </Text>
                    <Button variant="primary" onClick={onClose}>
                      Close
                    </Button>
                  </Flex>
                )}
              </Flex>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default TransactionModal;
