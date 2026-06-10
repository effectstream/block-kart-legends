// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {EffectstreamL2Contract} from "@effectstream/evm-contracts/src/contracts/EffectstreamL2Contract.sol";

contract effectstreaml2 is EffectstreamL2Contract {
    constructor(address owner, uint256 fee) EffectstreamL2Contract(owner, fee) {}
}
