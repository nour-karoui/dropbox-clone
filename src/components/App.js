import DStorage from './abis/DStorage.json'
import React, { Component } from 'react';
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https'
})

class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
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
    const web3 = window.web3
    console.log(web3)
    //Load account

    const accounts = await web3.eth.getAccounts();
    console.log(accounts)
    this.setState({account: accounts[0]})

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
  uploadFile = description => {
    console.log('submitting file to ipfs')
    //Add file to the IPFS
    ipfs.add(this.state.buffer, (error, result) => {
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

      this.state.dstorage.methods.uploadFile(result[0].hash, result[0].size, this.state.type, this.state.name, description)
          .send({ from: this.state.account })
          .on('transactionHash', (hash) => {
            this.setState({
              loading: false,
              type: null,
              name: null
            })
            window.location.reload()
          })
          .on('error', (e) =>{
            window.alert('Error')
            this.setState({loading: false})
          })
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
