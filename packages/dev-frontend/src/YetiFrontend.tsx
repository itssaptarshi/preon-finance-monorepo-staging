import React, { useState, useEffect } from "react";
import { PageWrapper, Navbar, LiquidationEvent, Popup } from "./components";
import {
  Dashboard,
  Stake,
  Borrow,
  Pool,
  Loading,
  LiquidationCalculator,
  Redemption
} from "./Screens";
import { HashRouter as Router, Route, Switch } from "react-router-dom";
import { useLiquity } from "./hooks/LiquityContext";
import { LiquityStoreProvider } from "@liquity/lib-react";
import { StabilityViewProvider } from "./PageComponents/Pool/context/StabilityViewProvider";
import { QueryClient, QueryClientProvider } from "react-query";
import { TransactionMonitor } from "./components/Transaction";
import { useDisclosure } from "@chakra-ui/react";

const YetiFrontend: React.FC = () => {
  console.log("HELOO");
  const { liquity, account } = useLiquity();
  const [snow, setSnow] = useState<0 | 1>(0);
  const queryClient = new QueryClient();
  const toggleSnow = () => {
    if (snow === 0) {
      setSnow(1);
    } else {
      setSnow(0);
    }
  };
  let agreedToDisclaimer;
  useEffect(() => {
    if (localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") == undefined) {
      agreedToDisclaimer = true;
    } else {
      agreedToDisclaimer = false;
    }
  }, [localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet")]);

  let borrowInfograph;
  if (localStorage.getItem(account + "agreedToYetiBorrowInfograph") == undefined) {
    borrowInfograph = true;
  } else {
    borrowInfograph = false;
  }

  let farmInfograph;

  if (localStorage.getItem(account + "agreedToYetiFarmInfograph") == undefined) {
    farmInfograph = true;
  } else {
    farmInfograph = false;
  }

  let veYETIInfograph;

  if (localStorage.getItem(account + "agreedToYetiveYETIInfograph") == undefined) {
    veYETIInfograph = true;
  } else {
    veYETIInfograph = false;
  }
  const { isOpen: isAddCollateralTypeOpen, onClose: onAddCollateralTypeClose } = useDisclosure({
    defaultIsOpen: true
  });

  const { isOpen: isBorrowOpen, onClose: onBorrowOpen } = useDisclosure({
    defaultIsOpen: true
  });

  const { isOpen: isStakeOpen, onClose: onStakeOpen } = useDisclosure({
    defaultIsOpen: true
  });

  const { isOpen: isFarmOpen, onClose: onFarmOpen } = useDisclosure({
    defaultIsOpen: true
  });

  return (
    <LiquityStoreProvider loader={<Loading />} store={liquity.store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <StabilityViewProvider>
            <LiquidationEvent />
            <PageWrapper snow={snow}>
              <Navbar
                walletConnected={true}
                dashboardVisible={true}
                snow={snow}
                setSnow={toggleSnow}
              />
              <Switch>
                <Route path="/borrow">
                  {borrowInfograph && (
                    <Popup
                      isOpen={isBorrowOpen}
                      onClose={onBorrowOpen}
                      header="Borrow"
                      infographSrc="/img/borrowdiagram.png"
                      mode="borrow"
                    />
                  )}
                  <Borrow />
                </Route>
                <Route path="/farm">
                  {farmInfograph && (
                    <Popup
                      isOpen={isFarmOpen}
                      onClose={onFarmOpen}
                      header="Farm"
                      infographSrc="/img/farm2.png"
                      mode="farm"
                    />
                  )}
                  <Pool />
                </Route>
                <Route path="/veYETI">
                  {veYETIInfograph && (
                    <Popup
                      isOpen={isStakeOpen}
                      onClose={onStakeOpen}
                      header="YETI Staking"
                      infographSrc="/img/stakediagram.png"
                      mode="veYETI"
                    />
                  )}
                  <Stake />
                </Route>
                <Route path="/calculator">
                  {localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") ==
                    undefined && (
                    <Popup
                      isOpen={isAddCollateralTypeOpen}
                      onClose={onAddCollateralTypeClose}
                      header="Disclaimer: Risks of Using Protocol"
                    />
                  )}
                  <LiquidationCalculator />
                </Route>
                <Route path="/redemption">
                  {localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") ==
                    undefined && (
                    <Popup
                      isOpen={isAddCollateralTypeOpen}
                      onClose={onAddCollateralTypeClose}
                      header="Disclaimer: Risks of Using Protocol"
                    />
                  )}
                  <Redemption />
                </Route>
                <Route path="/">
                  {localStorage.getItem(account + "agreedToYetiFinanceDisclaimerMainnet") ==
                    undefined && (
                    <Popup
                      isOpen={isAddCollateralTypeOpen}
                      onClose={onAddCollateralTypeClose}
                      header="Disclaimer: Risks of Using Protocol"
                    />
                  )}
                  <Dashboard />
                </Route>
              </Switch>
            </PageWrapper>
          </StabilityViewProvider>
        </Router>
      </QueryClientProvider>
      <TransactionMonitor />
    </LiquityStoreProvider>
  );
};

export default YetiFrontend;
