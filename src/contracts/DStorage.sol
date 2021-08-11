pragma solidity ^0.5.0;

contract DStorage {
  string public name = 'DStorage';
  // Number of files
  uint public fileCount;
  // Mapping fileId=>Struct
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

  constructor() public {
  }

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
      uploadTime: now,
      uploader: msg.sender
    });

    emit FileUploaded(fileCount, _fileHash, _fileSize, _fileType, _fileName, _fileDescription, now, msg.sender);
  }

}
