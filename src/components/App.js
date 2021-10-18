import DStorage from './abis/DStorage.json'
import DStorageFactory from './abis/DStorageFactory.json'
import React, { Component } from 'react';
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3'
import Tx from 'ethereumjs-tx'
import './App.css';
import { encrypt, decrypt } from 'eciesjs'
import EthCrypto from 'eth-crypto';
import axios from 'axios'
const toBuffer = require('blob-to-buffer')
require('dotenv').config()

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https'
})

class App extends Component {

  //Set states
  constructor(props) {
    super(props)
    this.state = {
      files: [],
      loading: false,
      userId: '6140bc5c6ad3b71383b94acf'
    };
  }

  async componentWillMount() {
    await this.loadBlockchainData()
  }

  async loadBlockchainData() {
    //Declare Web3
    const web3 = new Web3(new Web3.providers.HttpProvider(process.env.REACT_APP_INFURA_URL))
    this.setState({web3})

    // Network ID
    const networkId = await web3.eth.net.getId()
    console.log('network id ', networkId)
    const networkData = DStorageFactory.networks[networkId]
    if(networkData) {
      // Assign contract
      const factory = new web3.eth.Contract(DStorageFactory.abi, networkData.address)
      this.setState({ factory });
      console.log(factory);
      let account;
      let publicKey;
      //Load account
      if(localStorage.getItem('privateKey')) {
        /**
         * to do, get user id and put it in the state
         */
        const userId = '616d904bdb6f0605df7258ac';
        this.setState({userId});
        account = web3.eth.accounts.privateKeyToAccount(localStorage.getItem('privateKey'))
        publicKey = EthCrypto.publicKeyByPrivateKey(localStorage.getItem('privateKey'))
      }
      // create new account
      else {
        const userId = '616d8a88e49acfcd5aab9e40';
        this.setState({userId});
        account = web3.eth.accounts.create();
        console.log('new account');
        console.log(account.address);
        publicKey = EthCrypto.publicKeyByPrivateKey(account.privateKey);
        localStorage.setItem('privateKey', account.privateKey);
      }

      this.setState({publicKey})
      this.setState({account: account.address})
      // when creating a new user, we should deploy a smart contract that'll contain the hashes to his health records
      await this.createUserSmartContract();

      // everytime the user visits the platform we should retrieve his smart contract identified by his id
      await this.getUserContract();

      // get files
      if(this.state.dstorage) {
        await this.loadFiles();
      }
    } else {
      window.alert('DStorage contract not deployed to detected network.')
    }
  }

  createUserSmartContract = async () => {
    const factory = this.state.factory;

    const userId = this.state.userId;
    const createContract = await factory.methods.createDStorage(userId);
    const functionAbi = createContract.encodeABI();
    const balance = await this.state.web3.eth.getBalance(this.state.account);
    if(parseInt(balance)) {
      createContract.estimateGas({from: this.state.account}).then(gasAmount => {
        gasAmount = gasAmount.toString(16);

        console.log("Estimated gas: " + gasAmount);

        this.state.web3.eth.getTransactionCount(this.state.account).then(_nonce => { //this will generate Nonce
          const nonce = _nonce.toString(16);

          console.log("Nonce: " + nonce);
          const txParams = {
            gasPrice: gasAmount,
            gasLimit: 100010,
            to: factory.options.address,
            data: functionAbi,
            from: this.state.account,
            nonce: '0x' + nonce
          };

          const tx = new Tx(txParams);
          const privateKey = localStorage.getItem('privateKey').substring(2);
          tx.sign(Buffer.from(privateKey, 'hex')); // here Tx sign with private key

          const serializedTx = tx.serialize();
          console.log('here it is okay')
          // here performing singedTransaction
          this.state.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', async receipt => {
            console.log(receipt);
            console.log('SUCCESS');
            this.setState({loading: false})
          })
        });
      })
    } else {
      alert('you need to fund your account with ether');
    }
  }

  getUserContract = async () => {
    const factory = this.state.factory;
    // takes in parameters the user's mongoid
    const userId = this.state.userId;
    const dstorageAddress = await factory.methods.deployedContracts(userId).call();
    if(!dstorageAddress.startsWith('0x000000000000000')) {
      const dstorage = new this.state.web3.eth.Contract(DStorage.abi, dstorageAddress);
      this.setState({dstorage});
    } else {
      alert('you have no deployed contracts yet, make sure to fund your account with ether !');
    }
  }

  loadFiles = async () => {
    // Get files amount
    const filesCount = await this.state.dstorage.methods.fileCount().call()
    this.setState({ filesCount })
    // Load files & sort by the newest

    for (let i = filesCount; i >= 1; i--) {
      const file = await this.state.dstorage.methods.files(i).call()
      this.setState({
        files: [...this.state.files, file]
      })
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
    }
  }

  //Upload File
  uploadFile = async description => {
    const balance = await this.state.web3.eth.getBalance(this.state.account);
    if(parseInt(balance)) {
      console.log('submitting file to ipfs')
      const encrypted = encrypt(this.state.publicKey, this.state.buffer)
      this.setState({loading: true})

      //Add file to the IPFS
      ipfs.add(encrypted, (error, result) => {
        console.log('IPFS RESULT', result)
        //Check If error
        //Return error

        if(error) {
          console.log(error)
          this.setState({loading: false})
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
              to: this.state.dstorage._address,
              data: functionAbi,
              from: this.state.account,
              nonce: '0x' + nonce
            };

            const tx = new Tx(txParams);
            tx.sign(Buffer.from(localStorage.getItem('privateKey'), 'hex')); // here Tx sign with private key

            const serializedTx = tx.serialize();

            // here performing singedTransaction
            this.state.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', async receipt => {
              console.log(receipt);
              this.setState({loading: false})
              window.location.reload()
            })
          });
        })
      })
    } else {
      alert('you cannot upload any files, you do not have ether');
    }
  }

  // Decrypt and download file
  downloadFile(url) {
    axios({
      url: url,
      method: "GET",
      responseType: "blob" // important
    }).then(async response => {
      const blob1 = new Blob([response.data])
      toBuffer(blob1, function (err, buffer) {
        if (err) throw err
        const dec = decrypt(localStorage.getItem('privateKey'), buffer)
        let blob = new Blob([dec], { type: 'application/pdf' });
        let url = URL.createObjectURL(blob);
        window.open(url);
      })
    });
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
              downloadFile={this.downloadFile}
            />
        }
      </div>
    );
  }
}

export default App;
