// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IssuerRegistry} from "../src/IssuerRegistry.sol";

contract IssuerRegistryTest is Test {
    IssuerRegistry private registry;
    address private outsider = address(0xBEEF);
    bytes32 private merchantId = bytes32(uint256(1));
    bytes32 private issuerKeyHash = bytes32(uint256(2));

    function setUp() public {
        registry = new IssuerRegistry();
    }

    function test_ownerCanApproveAndRevoke() public {
        registry.approveIssuer(merchantId, issuerKeyHash);
        assertTrue(registry.isApprovedIssuer(merchantId, issuerKeyHash));
        registry.revokeIssuer(merchantId, issuerKeyHash);
        assertFalse(registry.isApprovedIssuer(merchantId, issuerKeyHash));
    }

    function test_nonOwnerCannotApprove() public {
        vm.prank(outsider);
        vm.expectRevert();
        registry.approveIssuer(merchantId, issuerKeyHash);
    }

    function test_nonOwnerCannotRevoke() public {
        vm.prank(outsider);
        vm.expectRevert();
        registry.revokeIssuer(merchantId, issuerKeyHash);
    }
}
