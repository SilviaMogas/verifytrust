// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract IssuerRegistry is Ownable {
    mapping(bytes32 merchantId => mapping(bytes32 issuerKeyHash => bool)) private approvedIssuers;

    event IssuerApproved(bytes32 indexed merchantId, bytes32 indexed issuerKeyHash);
    event IssuerRevoked(bytes32 indexed merchantId, bytes32 indexed issuerKeyHash);

    constructor() Ownable(msg.sender) {}

    function approveIssuer(bytes32 merchantId, bytes32 issuerKeyHash) external onlyOwner {
        approvedIssuers[merchantId][issuerKeyHash] = true;
        emit IssuerApproved(merchantId, issuerKeyHash);
    }

    function revokeIssuer(bytes32 merchantId, bytes32 issuerKeyHash) external onlyOwner {
        approvedIssuers[merchantId][issuerKeyHash] = false;
        emit IssuerRevoked(merchantId, issuerKeyHash);
    }

    function isApprovedIssuer(bytes32 merchantId, bytes32 issuerKeyHash) external view returns (bool) {
        return approvedIssuers[merchantId][issuerKeyHash];
    }
}
