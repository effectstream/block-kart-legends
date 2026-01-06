// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {PaimaL2Contract} from "@paimaexample/evm-contracts/src/contracts/PaimaL2Contract.sol";

contract effectstreaml2 is PaimaL2Contract {
    constructor(address owner, uint256 fee) PaimaL2Contract(owner, fee) {}
}
