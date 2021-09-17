// eslint-disable-next-line no-undef
const DStorageFactory = artifacts.require("DStorageFactory");

module.exports = function(deployer) {
    //Deploy Contract
    deployer.deploy(DStorageFactory);
};
