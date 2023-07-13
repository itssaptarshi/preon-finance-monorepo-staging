import { format, formatWithDecimals } from "../../Utils/number";
import { Decimal, Farm, veYETIStake } from "@liquity/lib-base";
import {
  BlockPolledLiquityStore,
  EthersLiquity,
  EthersLiquityWithStore,
  _connectByChainId
} from "@liquity/lib-ethers";

export type TroveData = {
  index: number;
  owner: string;
  aicr: number;
  icr: number;
  outstandingDebt: number;
};

export const getNextTenTroves = async (
  liquity: EthersLiquityWithStore<BlockPolledLiquityStore>,
  pointer: string = "",
  startIndex: number = 0
): Promise<TroveData[]> => {
  let currTail: string = pointer;

  const currBatch: TroveData[] = [];

  for (let i = 0; i < 10; i++) {
    const prevTrove =
      currTail !== ""
        ? await liquity.getSortedTrovePrev(currTail)
        : await liquity.getSortedTroveTail();

    const prevTroveAICR = await liquity.getCurrentAICR(prevTrove);
    const prevTroveICR = await liquity.getICR(prevTrove, {});
    const prevOutstandingDebt = await liquity.getTroveDebt(prevTrove);

    const prevTroveData: TroveData = {
      index: startIndex * 10 + i + 1,
      owner: prevTrove,
      aicr: format(prevTroveAICR),
      icr: format(prevTroveICR),
      outstandingDebt: format(prevOutstandingDebt) - 200
    };

    currBatch.push(prevTroveData);
    currTail = prevTrove;
  }

  return currBatch;
};
