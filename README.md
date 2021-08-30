## ``` Decentralized File Storage. ```

## What Is It ?
this is a secure dropbox clone, each file is encrypted with a user's public key and stored in IPFS.
Only that user can decrypt the file using his private key.
And to ensure immutability, we saved the file's hash on an Ethereum smart contract, **check the diagram bellow**.

## 🔧 Project Diagram:

![Project Diagram](https://i.gyazo.com/2738ea6743a40036756b1b5714ab9fa8.png)

## Technologies used

#### Frontend: 

* React
* Web3.js

#### Blockchain:

* Ethereum
* Solidity

#### Storing Files:

* IPFS

##### *NB: before running the project, add a .env file, that includes **REACT_APP_INFURA_URL** & **REACT_APP_PRIVATE_KEY***

## Running the project
```shell script
npm i 
npm start
```
