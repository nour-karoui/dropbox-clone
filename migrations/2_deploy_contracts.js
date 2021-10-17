// eslint-disable-next-line no-undef
const DStorageFactory = artifacts.require("DStorageFactory");
// eslint-disable-next-line no-undef
const NaivePaymaster = artifacts.require("NaivePaymaster");

module.exports = function(deployer) {
    //Deploy Contract
    deployer.deploy(NaivePaymaster, "hello");
    deployer.deploy(DStorageFactory, "0x83A54884bE4657706785D7309cf46B58FE5f6e8a");
};
