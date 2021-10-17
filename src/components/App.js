import DStorage from './abis/DStorage.json'
import DStorageFactory from './abis/DStorageFactory.json'
import NaivePaymaster from './abis/NaivePaymaster.json'
import React, { Component } from 'react';
import Navbar from './Navbar';
import Main from './Main';
import Web3 from 'web3';
import Tx from 'ethereumjs-tx';
import './App.css';
import { encrypt, decrypt } from 'eciesjs'
import EthCrypto from 'eth-crypto';
import axios from 'axios'
const toBuffer = require('blob-to-buffer')
require('dotenv').config()
const forwarder = '0x83A54884bE4657706785D7309cf46B58FE5f6e8a';
const paymaster =  '0x14Da0D4ABF9eC5D72644eb429D4C902918D4dF16';
const { RelayProvider } = require('@opengsn/provider');
const gsn = require('@opengsn/provider')
const ethers = require("ethers")
//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https'
})

const conf = {
  ourContract: '0xB7cb5337158e2550FF585c3da147bB546fdF4470',
  paymaster:   '0x14Da0D4ABF9eC5D72644eb429D4C902918D4dF16',
  forwarder: forwarder,
  gasPrice:  20000000000   // 20 Gwei
}

class App extends Component {

  async componentWillMount() {
    await this.loadBlockchainData()
    const config = {
      ourContract: '0xB7cb5337158e2550FF585c3da147bB546fdF4470',
      paymaster:   '0x14Da0D4ABF9eC5D72644eb429D4C902918D4dF16',
      forwarder: forwarder,
      loggerConfiguration: {
        logLevel: 'debug',
        // loggerUrl: 'logger.opengsn.org',
      }
    }
    const provider = await RelayProvider.newProvider({ provider: this.state.web3.currentProvider, config }).init()
    const from = provider.newAccount().address;
    this.setState({from});
    console.log(this.state.paymaster)
    console.log(this.state.factory)
    // await this.createNewUser();
    // await this.sendSignedTransaction()
    // let gsnProvider = await new RelayProvider(window.ethereum, {
    //   forwarderAddress: conf.forwarder,
    //   paymasterAddress: conf.paymaster,
    //   verbose: false}).init()
    // const provider = new ethers.providers.Web3Provider(gsnProvider)
    // const userAddr = gsnProvider.origProvider.selectedAddress

  }

  async signTheData() {
    const encrypted = encrypt(this.state.publicKey, this.state.buffer)
    const description = 'testing meta transactions'
    this.setState({loading: true})

    ipfs.add(encrypted, async (error, result) => {
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

      let hash = this.state.web3.utils.soliditySha3(functionAbi);
      let signature = this.state.web3.eth.sign(hash, this.state.account);
      console.log(signature)

      await uploadFileFunction.send({from : this.state.from})
      // uploadFileFunction.estimateGas({from: this.state.account}).then(gasAmount => {
      //   gasAmount = gasAmount.toString(16);
      //
      //   console.log("Estimated gas: " + gasAmount);
      //
      //   this.state.web3.eth.getTransactionCount(this.state.account).then(_nonce => { //this will generate Nonce
      //     const nonce = _nonce.toString(16);
      //
      //     console.log("Nonce: " + nonce);
      //     const txParams = {
      //       gasPrice: gasAmount,
      //       gasLimit: 3000000,
      //       to: this.state.dstorage._address,
      //       data: functionAbi,
      //       from: this.state.account,
      //       nonce: '0x' + nonce
      //     };
      //
      //     const tx = new Tx(txParams);
      //     tx.sign(Buffer.from(localStorage.getItem('privateKey'), 'hex')); // here Tx sign with private key
      //
      //     const serializedTx = tx.serialize();
      //
      //     // here performing singedTransaction
      //     this.state.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', async receipt => {
      //       console.log(receipt);
      //       this.setState({loading: false})
      //       window.location.reload()
      //     })
      //   });
      // })
    })
  }

  async loadBlockchainData() {
    //Declare Web3
    const web3 = new Web3(new Web3.providers.HttpProvider(process.env.REACT_APP_INFURA_URL))
    this.setState({web3})

    //Load account
    localStorage.setItem('privateKey', process.env.REACT_APP_PRIVATE_KEY)
    const account = web3.eth.accounts.privateKeyToAccount(localStorage.getItem('privateKey'))
    const publicKey = EthCrypto.publicKeyByPrivateKey(localStorage.getItem('privateKey'))
    this.setState({publicKey})
    this.setState({account: account.address})

    // Network ID
    const networkId = await web3.eth.net.getId()
    const networkData = DStorageFactory.networks[networkId]
    const naivePaymasterNetwork = NaivePaymaster.networks[networkId]
    if(networkData) {
      // Assign contract
      const factory = new web3.eth.Contract(DStorageFactory.abi, networkData.address)
      const paymaster = new web3.eth.Contract(NaivePaymaster.abi, naivePaymasterNetwork.address)
      this.setState({paymaster, factory});

      // when creating a new user, we should deploy a smart contract that'll contain the hashes to his health records
      /**
       * to do: assign a pair of keys for each user, (we'll do that after implementing meta transactions)
       */
      // await this.createNewUser();

      // everytime the user visits the platform we should retrieve his smart contract identified by his id
      await this.getUserContract();

      // get files
      await this.loadFiles();
    } else {
      window.alert('DStorage contract not deployed to detected network.')
    }
  }

  createNewUser = async () => {
    const factory = this.state.factory;

    const userId = '6140bc5c6ad3b71383b94acf';
    const createContract = await factory.methods.createDStorage(userId);
    console.log(createContract);
    console.log('success');
    const functionAbi = createContract.encodeABI()
    console.log('getting gas estimate ', functionAbi)

    createContract.estimateGas({from: this.state.from}).then(gasAmount => {
      gasAmount = gasAmount.toString(16);

      console.log("Estimated gas: " + gasAmount);

      this.state.web3.eth.getTransactionCount(this.state.account).then(_nonce => { //this will generate Nonce
        const nonce = _nonce.toString(16);

        console.log("Nonce: " + nonce);
        const txParams = {
          gasPrice: gasAmount,
          gasLimit: 3000000,
          to: factory._address,
          data: functionAbi,
          from: this.state.from,
          nonce: '0x' + nonce
        };

        const tx = new Tx(txParams);
        tx.sign(Buffer.from(localStorage.getItem('privateKey'), 'hex'));          // here Tx sign with private key

        const serializedTx = tx.serialize();

        // here performing singedTransaction
        this.state.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', async receipt => {
          console.log(receipt);
          console.log('SUCCESS');
          this.setState({loading: false})
        })
      });
    })
  }

  sendSignedTransaction = async () => {
    const transferEther = await this.state.paymaster.methods.receiveEther();
    const functionAbi = transferEther.encodeABI()
    console.log('getting gas estimate ', functionAbi)
    // this.state.web3.eth.handleRevert = true;
    this.state.web3.eth.getTransactionCount(this.state.account).then(async _nonce => { //this will generate Nonce
      const nonce = _nonce.toString(16);

      console.log("Nonce: " + nonce);
      const txParams = {
        contractAddress: this.state.paymaster.options.address,
        gasPrice: '0x423a35c7',
        gasLimit: 10000000,
        to: this.state.paymaster.options.address,
        value: this.state.web3.utils.toHex(this.state.web3.utils.toWei('1', 'ether')),
        data: functionAbi,
        from: this.state.account,
        nonce: '0x' + nonce
      };

      const tx = new Tx(txParams);
      tx.sign(Buffer.from(localStorage.getItem('privateKey'), 'hex'));          // here Tx sign with private key

      const serializedTx = await tx.serialize();
      console.log('we are good here')
      this.setState({loading: true});
      // here performing singedTransaction
      this.state.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', async receipt => {
        console.log(receipt);
        console.log('SUCCESS');
        this.setState({loading: false})
      }).on("error", error => {
        console.log(error);
        this.setState({loading: false});
      })
    });
    // transferEther.estimateGas({from: this.state.account}).then(gasAmount => {
    //   gasAmount = gasAmount.toString(16);
    //   console.log(this.state.account);
    //
    // }).catch(error => {
    //   console.log('i got here')
    //   console.log(error)
    // });
  }

  getUserContract = async () => {
    const factory = this.state.factory;
    // takes in parameters the user's mongoid
    const userId = '6140bc5c6ad3b71383b94acf'
    const dstorageAddress = await factory.methods.deployedContracts(userId).call();
    const dstorage = new this.state.web3.eth.Contract(DStorage.abi, dstorageAddress)
    this.setState({dstorage});
  }

  loadFiles = async () => {
    // Get files amount
    const filesCount = await this.state.dstorage.methods.fileCount().call()
    console.log(filesCount);
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
      console.log('buffer', this.state.buffer)
    }
  }

  //Upload File
  uploadFile = async description => {
    console.log('submitting file to ipfs')
    const encrypted = encrypt(this.state.publicKey, this.state.buffer)
    console.log(encrypted)
    this.setState({loading: true})

    //Add file to the IPFS
    ipfs.add(encrypted, async (error, result) => {
      console.log('IPFS RESULT', result)
      console.log("data uploaded to ipfs")
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
      const uploadFileFunction = this.state.dstorage.methods.uploadFile(result[0].hash, result[0].size, this.state.type, this.state.name, description);
      const functionAbi = uploadFileFunction.encodeABI()
      console.log('getting gas estimate ', functionAbi)

      await this.state.dstorage.methods.uploadFile(result[0].hash, result[0].size, this.state.type, this.state.name, description).send({ from: this.state.from });
      // const txParams = {
      //   gasPrice: "20000000000",
      //   gasLimit: 3000000,
      //   to: this.state.dstorage._address,
      //   data: functionAbi,
      //   from: this.state.account
      // };
      //
      // uploadFileFunction.estimateGas({from: this.state.from}).then(gasAmount => {
      //   gasAmount = gasAmount.toString(16);
      //
      //   console.log("Estimated gas: " + gasAmount);
      //
      //   this.state.web3.eth.getTransactionCount(this.state.from).then(_nonce => { //this will generate Nonce
      //     const nonce = _nonce.toString(16);
      //     console.log('this is the nonce ', nonce)
      //
      //     console.log("Nonce: " + nonce);
      //     const txParams = {
      //       gasPrice: gasAmount,
      //       gasLimit: 3000000,
      //       to: this.state.dstorage._address,
      //       data: signature,
      //       from: this.state.from,
      //       nonce: '0x' + nonce
      //     };
      //
      //     const tx = new Tx(txParams);
      //     tx.sign(Buffer.from(localStorage.getItem('privateKey'), 'hex')); // here Tx sign with private key
      //
      //     const serializedTx = tx.serialize();
      //     console.log('here is fine')
      //     // here performing singedTransaction
      //     this.state.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', async receipt => {
      //       console.log(receipt);
      //       this.setState({loading: false})
      //       window.location.reload()
      //     }).on("error", error1 => {
      //       console.log('got herer error')
      //       console.log(error1)
      //     }).on("confirmation", (conf, receipt) => console.log('got here'))
      //   }).catch(error => {
      //     console.log("there is an error")
      //     console.log(error)
      //   });
      // })
    })
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

  //Set states
  constructor(props) {
    super(props)
    this.state = {
      files: [],
      loading: false
    }
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
