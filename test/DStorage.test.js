const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const factoryDstorage = require('../src/components/abis/DStorageFactory.json');
const dstorage = require('../src/components/abis/DStorage.json');
const ipfsClient = require('ipfs-http-client');
const {readFile} = require('fs/promises');

const ipfs = ipfsClient({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https'
});

let accounts;
let factory;
let dstorageAddress;
let dstorageContract;
const userId = '6140bc5c6ad3b71383b94acf' // random mongo id

beforeEach(async () => {
    const web3 = new Web3(ganache.provider());
    accounts = await web3.eth.getAccounts();
    const gasAmount = factory = await new web3.eth.Contract(factoryDstorage.abi)
        .deploy({data: factoryDstorage.bytecode})
        .estimateGas({from: accounts[0]});
    factory = await new web3.eth.Contract(factoryDstorage.abi)
        .deploy({data: factoryDstorage.bytecode})
        .send({from: accounts[0], gas: gasAmount});
    await factory.methods.createDStorage(userId)
        .send({
            from: accounts[1],
            gas: 1000000
        });
    dstorageAddress = await factory.methods.deployedContracts(userId)
        .call();
    dstorageContract = await new web3.eth.Contract(dstorage.abi, dstorageAddress);
});

describe('Dstorages', () => {
    it('deploys a factory and a dstorage', async () => {
        assert.ok(factory._address);
        assert.ok(dstorageContract._address);
    });

    it('fetches smart contract for each user', async () => {
        const contractAddress = await factory.methods.deployedContracts(userId).call();
        assert.strictEqual(contractAddress, dstorageAddress);
    });

    it('uploads file to user\'s smart contract', async () => {
        const buffer = await loadFile();
        const upload = await uploadFile(buffer);
        assert.strictEqual(upload.to.toUpperCase(), dstorageContract._address.toUpperCase());
    });

    it('should fetch an uploaded file', async () => {
        const buffer = await loadFile();
        await uploadFile(buffer);
        const fileCount = await dstorageContract.methods.fileCount().call();
        assert.strictEqual(fileCount, '1');
    });
});

const loadFile = async () => {
    const data = await readFile('test/uploadtest.txt', 'utf-8');
    return Buffer.from(data, 'utf-8');
};

const uploadFile = async (buffer) => {
    const result = await ipfs.add(buffer).catch(error => {
        assert.ok(false);
    });
    return dstorageContract.methods.uploadFile(result[0].hash, result[0].size, 'utf8', 'some dummy title', 'some dummy description')
        .send({from: accounts[0], gas: 1000000})
        .catch(error => {
            assert.ok(false);
        });
};


