// eslint-disable-next-line no-undef
const DStorage = artifacts.require("DStorage");

module.exports = function(deployer) {
	//Deploy Contract
    deployer.deploy(DStorage);
};
