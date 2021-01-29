const TokenFA12 = artifacts.require("TokenFA12");
const { MichelsonMap } = require("@taquito/taquito");

module.exports = async (deployer, _network, accounts) => {
  const totalSupply = "1000";
  const totalStaked = "0";
  const rewardPerShare = "0";
  const lastUpdateTime = "0";

  const storage = {
    totalSupply,
    totalStaked,
    rewardPerShare,
    lastUpdateTime,
    ledger: MichelsonMap.fromLiteral({
      [accounts[0]]: {
        balance: totalSupply,
        staked: totalStaked,
        lastRewardPerShare: rewardPerShare,
        allowances: MichelsonMap.fromLiteral({}),
      },
    }),
  };

  deployer.deploy(TokenFA12, storage, { value: 1000 * 10 ** -6 });
};
