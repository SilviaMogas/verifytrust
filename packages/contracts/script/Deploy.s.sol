// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HonkVerifier} from "../src/generated/HonkVerifier.sol";
import {IssuerRegistry} from "../src/IssuerRegistry.sol";
import {ProofOfReviewVerifier} from "../src/ProofOfReviewVerifier.sol";
import {VerifyTrustRegistry} from "../src/VerifyTrustRegistry.sol";

contract Deploy is Script {
    function run() external returns (HonkVerifier, ProofOfReviewVerifier, IssuerRegistry, VerifyTrustRegistry) {
        vm.startBroadcast();
        HonkVerifier honkVerifier = new HonkVerifier();
        ProofOfReviewVerifier proofVerifier = new ProofOfReviewVerifier(honkVerifier);
        IssuerRegistry issuerRegistry = new IssuerRegistry();
        VerifyTrustRegistry registry = new VerifyTrustRegistry(proofVerifier, issuerRegistry);

        string memory demoMerchant = vm.envOr("DEMO_MERCHANT_ID", string(""));
        string memory demoIssuer = vm.envOr("DEMO_ISSUER_KEY_HASH", string(""));
        if (bytes(demoMerchant).length != 0 && bytes(demoIssuer).length != 0) {
            issuerRegistry.approveIssuer(vm.parseBytes32(demoMerchant), vm.parseBytes32(demoIssuer));
        }
        string memory longhandMerchant = vm.envOr("LONGHAND_MERCHANT_ID", string(""));
        string memory longhandIssuer = vm.envOr("LONGHAND_ISSUER_KEY_HASH", string(""));
        if (bytes(longhandMerchant).length != 0 && bytes(longhandIssuer).length != 0) {
            issuerRegistry.approveIssuer(vm.parseBytes32(longhandMerchant), vm.parseBytes32(longhandIssuer));
        }
        vm.stopBroadcast();

        string memory key =
            string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.serializeAddress("deployment", "honkVerifier", address(honkVerifier));
        json = vm.serializeAddress("deployment", "proofVerifier", address(proofVerifier));
        json = vm.serializeAddress("deployment", "issuerRegistry", address(issuerRegistry));
        json = vm.serializeAddress("deployment", "verifyTrustRegistry", address(registry));
        vm.writeJson(json, key);
        return (honkVerifier, proofVerifier, issuerRegistry, registry);
    }
}
