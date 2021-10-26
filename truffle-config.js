require('babel-register');
require('babel-polyfill');
require('dotenv').config();
const HDWalletProvider = require('truffle-hdwallet-provider-privkey');
const privateKeys = process.env.PRIVATE_KEYS || ""

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(
           ['07015c46d74a515b0eff5466a05345bfbc1db8af4f0e8081af1e8e4c8aedf58d'], // Array of account private keys
          `https://ropsten.infura.io/v3/aff0fe260d2b4c4f8aca7d426d1b90f8`// Url to an Ethereum Node
        )
      },
      gas: 5000000,
      gasPrice: 25000000000,
      network_id: 3
    },
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/components/abis/',
  compilers: {
    solc: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}
