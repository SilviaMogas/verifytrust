// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {HonkVerifier} from "./generated/HonkVerifier.sol";

contract ProofOfReviewVerifier {
    uint256 public constant MERCHANT_ID_INDEX = 0;
    uint256 public constant PRODUCT_ID_INDEX = 1;
    uint256 public constant ISSUER_KEY_HASH_INDEX = 2;
    uint256 public constant NULLIFIER_INDEX = 3;
    uint256 public constant PROTOCOL_VERSION_INDEX = 4;
    bytes32 public constant PROTOCOL_VERSION = bytes32(uint256(1));

    HonkVerifier public immutable HONK_VERIFIER;

    constructor(HonkVerifier verifier) {
        HONK_VERIFIER = verifier;
    }

    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool) {
        return HONK_VERIFIER.verify(proof, publicInputs);
    }
}
