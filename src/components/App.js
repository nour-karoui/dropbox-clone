import DStorage from './abis/DStorage.json'
import React, { Component } from 'react';
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3'
import Tx from 'ethereumjs-tx'
import './App.css';
import crypto from 'crypto';
import { encrypt, decrypt, PrivateKey } from 'eciesjs'
import EthCrypto from 'eth-crypto';
const fs = require('fs')


//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https'
})

class App extends Component {

  async componentWillMount() {
    // await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    if(window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if(window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non Ethereum browser detected, you should consider trying metamask')
    }
  }

  async loadBlockchainData() {
    //Declare Web3
    const web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/v3/aff0fe260d2b4c4f8aca7d426d1b90f8'))
    console.log(web3)
    this.setState({web3})
    //Load account

    //const accounts = await web3.eth.getAccounts();
    const account = web3.eth.accounts.privateKeyToAccount('b63e3f7051cf1226b82d844f1ac8b02ec7f03c2eb176d2d1f2df46a6a4836584')
    console.log(account)
    const publicKey = EthCrypto.publicKeyByPrivateKey('b63e3f7051cf1226b82d844f1ac8b02ec7f03c2eb176d2d1f2df46a6a4836584')
    console.log(publicKey)
    this.setState({publicKey})
    localStorage.setItem('privateKey', account.privateKey)
    this.setState({account: account.address})

    // Network ID
    const networkId = await web3.eth.net.getId()
    const networkData = DStorage.networks[networkId]
    if(networkData) {
      // Assign contract
      const dstorage = new web3.eth.Contract(DStorage.abi, networkData.address)
      this.setState({ dstorage })
      // Get files amount
      const filesCount = await dstorage.methods.fileCount().call()
      this.setState({ filesCount })
      // Load files & sort by the newest

      for (let i = filesCount; i >= 1; i--) {
        const file = await dstorage.methods.files(i).call()
        this.setState({
          files: [...this.state.files, file]
        })
      }
    } else {
      window.alert('DStorage contract not deployed to detected network.')
    }
  }

  // Get file from user
  captureFile = event => {
    event.preventDefault()

    const file = event.target.files[0]
    const reader = new window.FileReader()

    reader.readAsArrayBuffer(file)
    reader.onloadend = () => {
      this.setState({
        buffer: Buffer(reader.result),
        type: file.type,
        name: file.name
      })
      console.log('buffer', this.state.buffer)
    }
  }

  //Upload File
  uploadFile = async description => {
    console.log('submitting file to ipfs')
    const encrypted = encrypt(this.state.publicKey, this.state.buffer)
    console.log(this.state.buffer)
    const dec= decrypt('b63e3f7051cf1226b82d844f1ac8b02ec7f03c2eb176d2d1f2df46a6a4836584', encrypted)
    console.log(dec)
    //Add file to the IPFS
    ipfs.add(encrypted, (error, result) => {
      console.log('IPFS RESULT', result)
      console.log('IPFS RESULT', result.size)
      //Check If error
      //Return error

      if(error) {
        console.log(error)
        return
      }
      //Set state to loading

      //Assign value for the file without extension
      if(this.state.type === '') {
        this.setState({type: 'none'})
      }

      //Call smart contract uploadFile function
      const uploadFileFunction = this.state.dstorage.methods.uploadFile(result[0].hash, result[0].size, this.state.type, this.state.name, description)
      const functionAbi = uploadFileFunction.encodeABI()
      console.log('getting gas estimate ', functionAbi)

      uploadFileFunction.estimateGas({from: this.state.account}).then(gasAmount => {
        gasAmount = gasAmount.toString(16);

        console.log("Estimated gas: " + gasAmount);

        this.state.web3.eth.getTransactionCount(this.state.account).then(_nonce => { //this will generate Nonce
          const nonce = _nonce.toString(16);

          console.log("Nonce: " + nonce);
          const txParams = {
            gasPrice: gasAmount,
            gasLimit: 3000000,
            to: "0xC59EE3B70C9816AEFA0dE9C523063a41d855f53B",
            data: functionAbi,
            from: this.state.account,
            nonce: '0x' + nonce
          };

          const tx = new Tx(txParams);
          tx.sign(Buffer.from('b63e3f7051cf1226b82d844f1ac8b02ec7f03c2eb176d2d1f2df46a6a4836584', 'hex'));          // here Tx sign with private key

          const serializedTx = tx.serialize();

          // here performing singedTransaction
          this.state.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', receipt => {
            console.log(receipt);
          })
        });
      })
      // this.state.dstorage.methods.uploadFile(result[0].hash, result[0].size, this.state.type, this.state.name, description)
      //     .send({ from: this.state.account })
      //     .on('transactionHash', (hash) => {
      //       this.setState({
      //         loading: false,
      //         type: null,
      //         name: null
      //       })
      //       window.location.reload()
      //     })
      //     .on('error', (e) =>{
      //       window.alert('Error')
      //       console.log(e)
      //       this.setState({loading: false})
      //     })
    })


  }

  //Set states
  constructor(props) {
    super(props)
    this.state = {
      files: []
    }

    //Bind functions
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              files={this.state.files}
              captureFile={this.captureFile}
              uploadFile={this.uploadFile}
            />
        }
      </div>
    );
  }
}

export default App;
