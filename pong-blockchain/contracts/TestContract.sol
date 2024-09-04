// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestContract {
    string public message;

    constructor() {
        message = "Hello, Blockchain!";
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}
