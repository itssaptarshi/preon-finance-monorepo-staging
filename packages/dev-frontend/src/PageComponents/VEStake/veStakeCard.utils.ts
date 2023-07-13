// Function that calculates 
export function getNewEstimatedWeeklyRewardsAmount(valueInput:number|undefined, yetiStaked:number, reward:number, isStake:boolean, totalYeti:number): number {

    if ((valueInput == undefined || isNaN(valueInput)) && !isNaN(yetiStaked)) {
        return reward * 2 * yetiStaked/totalYeti
    } else if (valueInput == undefined || isNaN(valueInput)) {
        return 0
    } else if (isStake) {
        return reward * 2 * (yetiStaked + valueInput)/(totalYeti + valueInput)
    } else {
       return reward * 2 * (yetiStaked - valueInput)/(totalYeti - valueInput)
    }
}
