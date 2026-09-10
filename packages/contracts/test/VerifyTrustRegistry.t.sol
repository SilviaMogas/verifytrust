// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {HonkVerifier} from "../src/generated/HonkVerifier.sol";
import {IssuerRegistry} from "../src/IssuerRegistry.sol";
import {ProofOfReviewVerifier} from "../src/ProofOfReviewVerifier.sol";
import {VerifyTrustRegistry} from "../src/VerifyTrustRegistry.sol";

contract VerifyTrustRegistryTest is Test {
    HonkVerifier private honkVerifier;
    ProofOfReviewVerifier private proofVerifier;
    IssuerRegistry private issuerRegistry;
    VerifyTrustRegistry private registry;
    bytes private proof1;
    bytes32[] private inputs1;
    bytes32 private reviewCommitment1;
    bytes private proof2;
    bytes32[] private inputs2;
    bytes32 private reviewCommitment2;
    string private email1;
    string private orderId1;
    string private receipt1;

    function setUp() public {
        honkVerifier = new HonkVerifier();
        proofVerifier = new ProofOfReviewVerifier(honkVerifier);
        issuerRegistry = new IssuerRegistry();
        registry = new VerifyTrustRegistry(proofVerifier, issuerRegistry);

        string memory fixture1 = vm.readFile("test/fixtures/credential-1.json");
        proof1 = vm.parseJsonBytes(fixture1, ".proof");
        inputs1 = vm.parseJsonBytes32Array(fixture1, ".publicInputs");
        reviewCommitment1 = vm.parseJsonBytes32(fixture1, ".reviewCommitment");
        email1 = vm.parseJsonString(fixture1, ".email");
        orderId1 = vm.parseJsonString(fixture1, ".orderId");
        receipt1 = vm.parseJsonString(fixture1, ".receipt");

        string memory fixture2 = vm.readFile("test/fixtures/credential-2.json");
        proof2 = vm.parseJsonBytes(fixture2, ".proof");
        inputs2 = vm.parseJsonBytes32Array(fixture2, ".publicInputs");
        reviewCommitment2 = vm.parseJsonBytes32(fixture2, ".reviewCommitment");

        issuerRegistry.approveIssuer(inputs1[0], inputs1[2]);
    }

    function test_validCredentialAccepted() public {
        bytes32 nullifier = registry.submitVerifiedReview(proof1, inputs1, reviewCommitment1);
        assertEq(nullifier, inputs1[3]);
        assertTrue(registry.isNullifierUsed(nullifier));
        assertEq(registry.verificationCount(), 1);
    }

    function test_invalidUnapprovedIssuerRejected() public {
        bytes32[] memory inputs = inputs1;
        inputs[2] = bytes32(uint256(123));
        vm.expectRevert(
            abi.encodeWithSelector(
                VerifyTrustRegistry.IssuerNotApproved.selector, inputs[0], inputs[2]
            )
        );
        registry.submitVerifiedReview(proof1, inputs, reviewCommitment1);
    }

    function test_modifiedProofBytesRejectedAsMalformed() public {
        bytes memory malformed = proof1;
        malformed[0] = bytes1(uint8(malformed[0]) ^ 1);
        vm.expectRevert(VerifyTrustRegistry.InvalidProof.selector);
        registry.submitVerifiedReview(malformed, inputs1, reviewCommitment1);
    }

    function test_tamperedPublicInputRejected() public {
        bytes32[] memory inputs = inputs1;
        inputs[1] = bytes32(uint256(456));
        vm.expectRevert(VerifyTrustRegistry.InvalidProof.selector);
        registry.submitVerifiedReview(proof1, inputs, reviewCommitment1);
    }

    function test_firstNullifierUseAccepted() public {
        registry.submitVerifiedReview(proof1, inputs1, reviewCommitment1);
        assertTrue(registry.isNullifierUsed(inputs1[3]));
    }

    function test_secondUseOfSameProofRejected() public {
        registry.submitVerifiedReview(proof1, inputs1, reviewCommitment1);
        vm.expectRevert(
            abi.encodeWithSelector(VerifyTrustRegistry.NullifierAlreadyUsed.selector, inputs1[3])
        );
        registry.submitVerifiedReview(proof1, inputs1, reviewCommitment1);
    }

    function test_secondIndependentPurchaseAccepted() public {
        registry.submitVerifiedReview(proof1, inputs1, reviewCommitment1);
        registry.submitVerifiedReview(proof2, inputs2, reviewCommitment2);
        assertEq(registry.verificationCount(), 2);
        assertTrue(registry.isNullifierUsed(inputs2[3]));
    }

    function test_wrongProtocolVersionRejected() public {
        bytes32[] memory inputs = inputs1;
        inputs[4] = bytes32(uint256(2));
        vm.expectRevert(
            abi.encodeWithSelector(VerifyTrustRegistry.UnsupportedProtocolVersion.selector, inputs[4])
        );
        registry.submitVerifiedReview(proof1, inputs, reviewCommitment1);
    }

    function test_zeroReviewCommitmentRejected() public {
        vm.expectRevert(VerifyTrustRegistry.ZeroReviewCommitment.selector);
        registry.submitVerifiedReview(proof1, inputs1, bytes32(0));
    }

    function test_noPiiStoredOrEmitted() public {
        vm.recordLogs();
        registry.submitVerifiedReview(proof1, inputs1, reviewCommitment1);
        VerifyTrustRegistry.ReviewVerification memory verification =
            registry.getVerification(inputs1[3]);
        assertEq(verification.reviewCommitment, reviewCommitment1);
        assertEq(verification.productId, inputs1[1]);
        assertEq(verification.merchantId, inputs1[0]);
        assertEq(verification.nullifier, inputs1[3]);
        assertTrue(verification.reviewCommitment != keccak256(bytes(email1)));
        assertTrue(verification.productId != keccak256(bytes(orderId1)));
        assertTrue(verification.merchantId != keccak256(bytes(receipt1)));

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 1);
        assertEq(
            logs[0].topics[0],
            keccak256(
                "ReviewVerified(bytes32,bytes32,bytes32,bytes32,uint256)"
            )
        );
        assertEq(logs[0].topics[1], inputs1[3]);
        assertEq(logs[0].topics[2], inputs1[0]);
        assertEq(logs[0].topics[3], inputs1[1]);
        assertTrue(logs[0].data.length == 64);
    }
}
