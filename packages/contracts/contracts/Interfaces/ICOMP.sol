pragma solidity 0.8.2;

interface ICOMP {
    function redeem(uint redeemTokens) external returns (uint);

    function mint(uint mintAmount) external returns (uint);

    function underlying() external view returns (address);
}
