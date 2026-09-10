// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {IssuerRegistry} from "./IssuerRegistry.sol";
import {ProofOfReviewVerifier} from "./ProofOfReviewVerifier.sol";

contract VerifyTrustRegistry {
    struct ReviewVerification {
        bytes32 reviewCommitment;
        bytes32 productId;
        bytes32 merchantId;
        bytes32 nullifier;
        uint256 verifiedAt;
    }

    error InvalidPublicInputsLength();
    error UnsupportedProtocolVersion(bytes32 actual);
    error IssuerNotApproved(bytes32 merchantId, bytes32 issuerKeyHash);
    error NullifierAlreadyUsed(bytes32 nullifier);
    error InvalidProof();
    error ZeroReviewCommitment();

    event ReviewVerified(
        bytes32 indexed nullifier,
        bytes32 indexed merchantId,
        bytes32 indexed productId,
        bytes32 reviewCommitment,
        uint256 verifiedAt
    );

    ProofOfReviewVerifier public immutable verifier;
    IssuerRegistry public immutable issuerRegistry;
    mapping(bytes32 nullifier => bool) private nullifierUsed;
    mapping(bytes32 nullifier => ReviewVerification) private verifications;
    uint256 private totalVerifications;

    constructor(ProofOfReviewVerifier verifier_, IssuerRegistry issuerRegistry_) {
        verifier = verifier_;
        issuerRegistry = issuerRegistry_;
    }

    function submitVerifiedReview(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        bytes32 reviewCommitment
    ) external returns (bytes32 nullifier) {
        if (publicInputs.length != 5) revert InvalidPublicInputsLength();
        if (publicInputs[4] != bytes32(uint256(1))) {
            revert UnsupportedProtocolVersion(publicInputs[4]);
        }
        if (!issuerRegistry.isApprovedIssuer(publicInputs[0], publicInputs[2])) {
            revert IssuerNotApproved(publicInputs[0], publicInputs[2]);
        }
        nullifier = publicInputs[3];
        if (nullifierUsed[nullifier]) revert NullifierAlreadyUsed(nullifier);
        try verifier.verify(proof, publicInputs) returns (bool valid) {
            if (!valid) revert InvalidProof();
        } catch {
            revert InvalidProof();
        }
        if (reviewCommitment == bytes32(0)) revert ZeroReviewCommitment();

        nullifierUsed[nullifier] = true;
        verifications[nullifier] = ReviewVerification({
            reviewCommitment: reviewCommitment,
            productId: publicInputs[1],
            merchantId: publicInputs[0],
            nullifier: nullifier,
            verifiedAt: block.timestamp
        });
        totalVerifications++;
        emit ReviewVerified(nullifier, publicInputs[0], publicInputs[1], reviewCommitment, block.timestamp);
    }

    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return nullifierUsed[nullifier];
    }

    function getVerification(bytes32 nullifier) external view returns (ReviewVerification memory) {
        return verifications[nullifier];
    }

    function verificationCount() external view returns (uint256) {
        return totalVerifications;
    }
}
