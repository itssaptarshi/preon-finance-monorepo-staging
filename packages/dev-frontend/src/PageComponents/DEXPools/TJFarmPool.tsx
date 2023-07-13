// @ts-nocheck
import React from "react";
import { Box, Flex, Button, Spacer, Text, Tag, Center } from "@chakra-ui/react";
import { getNum } from "../../Utils/number";
import Icon from "../../components/Icon";
import { useState } from "react";
import { useEffect } from "react";

const TJFarmPool: React.FC = () => {
  const [JOEAPR, setJOEAPR] = useState(0);
  const [YETIAPR, setYETIAPR] = useState(0);
  const [poolAPR, setPoolAPR] = useState(0);
  useEffect(() => {
    const joeURL = "https://api.yeti.finance/v1/FarmPool/JOE";
    const yetiURL = "https://api.yeti.finance/v1/FarmPool/YETI";
    const poolURL = "https://api.yeti.finance/v1/FarmPool/pool";
    const fetchData = async () => {
      try {
        const joeResponse = await fetch(joeURL, {
          method: "GET",
          mode: "cors"
        });
        const yetiResponse = await fetch(yetiURL, {
          method: "GET",
          mode: "cors"
        });
        const poolResponse = await fetch(poolURL, {
          method: "GET",
          mode: "cors"
        });
        setJOEAPR(await joeResponse.json());
        setYETIAPR(await yetiResponse.json());
        setPoolAPR(await poolResponse.json());
      } catch (error) {
        console.log("error", error);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      {/* Your Balance Card Modals */}
      <Box layerStyle="card" flex={1}>
        <Center alignItems="center" mb={7}>
          <Text textStyle="title3">
            <Icon iconName={"YETI"} h={10} w={10} /> YETI / <Icon iconName={"AVAX"} h={9} w={9} />{" "}
            AVAX Farm
          </Text>
        </Center>
        <Flex mb={7}>
          <Spacer />
          <Flex alignItems="center" ml={5}>
            <Text textStyle="subtitle1" fontWeight="normal">
              Pool APR: {getNum(poolAPR * 100, 2)}%
            </Text>
          </Flex>
          <Spacer />
          <Flex alignItems="center" ml={5}>
            <Text textStyle="subtitle1" fontWeight="normal">
              <Icon iconName={"YETI"} h={6} w={6} /> YETI APR: {getNum(YETIAPR * 100, 2)}%
            </Text>
          </Flex>
          <Spacer />
          <Flex alignItems="center" ml={5}>
            <Text textStyle="subtitle1" fontWeight="normal">
              <Icon iconName={"sJOE"} h={6} w={6} /> JOE APR: {getNum(JOEAPR * 100, 2)}%
            </Text>
          </Flex>
          <Spacer />
          <Flex alignItems="center" ml={5}>
            <Tag bgColor="secondary.400">
              <Text textStyle="subtitle1">
                Total APR: {getNum(((poolAPR ? poolAPR : 0) + YETIAPR + JOEAPR) * 100, 2)}%
              </Text>
            </Tag>
          </Flex>

          <Spacer />
        </Flex>

        <Flex alignItems="center">
          <Spacer />
          <Button colorScheme="brand">
            {" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={
                "https://traderjoexyz.com/farm/0xbdc7EF37283BC67D50886c4afb64877E3e83f869-0x188bED1968b795d5c9022F6a0bb5931Ac4c18F00?fm=fm/"
              }
              style={{ outline: "none", textDecoration: "none" }}
            >
              Stake on Trader Joe
            </a>{" "}
          </Button>
          <Spacer />
        </Flex>
      </Box>
    </>
  );
};

export default TJFarmPool;
