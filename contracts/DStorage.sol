pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

// SPDX-License-Identifier: MIT OR Apache-2.0

import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@opengsn/contracts/src/BasePaymaster.sol";
import "@opengsn/contracts/src/forwarder/IForwarder.sol";

contract NaivePaymaster is BasePaymaster {
  address public ourTarget;
  address public admin;
  string public message;
  event TargetSet(address target);
  event PostRelayed(uint256 context);

  constructor(string memory received) {
    message = received;
  }

  function setTarget(address target) external onlyOwner {
    ourTarget = target;
    emit TargetSet(target);
  }

  function receiveEther() public payable {
    require(msg.value > .01 ether);
    admin = msg.sender;
  }

  function preRelayedCall(GsnTypes.RelayRequest calldata relayRequest, bytes calldata signature, bytes calldata approvalData, uint256 maxPossibleGas) external override returns (bytes memory context, bool rejectOnRecipientRevert) {
    _verifyForwarder(relayRequest);
    require(relayRequest.request.to == ourTarget);
    return (abi.encode(block.timestamp), false);
  }

  function postRelayedCall(bytes calldata context, bool success, uint256 gasUseWithoutPost, GsnTypes.RelayData calldata relayData) external override virtual relayHubOnly  {
     // (success, preRetVal, gasUseExceptUs);
     emit PostRelayed(abi.decode(context, (uint)));
  }

  function versionPaymaster() external virtual view override returns (string memory) {
    return "2.0.3";
  }
}

contract DStorageFactory is BaseRelayRecipient{
  mapping(string => DStorage) public deployedContracts;

  constructor(address forwarder) {
    trustedForwarder = forwarder;
  }

  function createDStorage(string memory id) public {
    DStorage newDStorage = new DStorage();
    deployedContracts[id] = newDStorage;
  }

  function versionRecipient() external view override returns (string memory) {
    return "2.0.3";
  }
}

contract DStorage {
  string public name = 'DStorage';

  // Number of files
  uint public fileCount;

  // Mapping fileId => Struct
  mapping( uint => File ) public files;

  // Struct
  struct File {
    uint fileId;
    string fileHash;
    uint fileSize;
    string fileType;
    string fileName;
    string fileDescription;
    uint uploadTime;
    address payable uploader;
  }

  // Event
  event FileUploaded(
    uint fileId,
    string fileHash,
    uint fileSize,
    string fileType,
    string fileName,
    string fileDescription,
    uint uploadTime,
    address payable uploader
  );

  constructor() {}

  // Upload File function
  function uploadFile(string memory _fileHash, uint _fileSize, string memory _fileType, string memory _fileName, string memory _fileDescription) public {
    require(bytes(_fileHash).length > 0);
    require(bytes(_fileType).length > 0);
    require(bytes(_fileDescription).length > 0);
    require(bytes(_fileName).length > 0);
    require(msg.sender != address(0));
    fileCount ++;
    files[fileCount] = File({
    fileId: fileCount,
    fileHash: _fileHash,
    fileSize: _fileSize,
    fileType: _fileType,
    fileName: _fileName,
    fileDescription: _fileDescription,
    uploadTime: block.timestamp,
    uploader: msg.sender
    });

    emit FileUploaded(fileCount, _fileHash, _fileSize, _fileType, _fileName, _fileDescription, block.timestamp, msg.sender);
  }

}
