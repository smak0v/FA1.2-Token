const TokenFA12 = artifacts.require("TokenFA12");
const accounts = require("../scripts/sandbox/accounts");

const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const Tezos = new TezosToolkit("http://localhost:8732");

const assert = require("assert");
const { alice } = require("../scripts/sandbox/accounts");

async function bakeBlocks(count) {
  for (let i = 0; i < count; i++) {
    const operation = await tezos.contract.transfer({
      to: await tezos.signer.publicKeyHash(),
      amount: 1,
    });

    await operation.confirmation();
  }
}

contract("TokenFA12", async function () {
  it("should check initial storage", async function () {
    const instance = await TokenFA12.deployed();
    const storage = await instance.storage();
    const aliceAddress = accounts.alice.pkh;
    const totalSupply = storage.totalSupply;
    const aliceRecord = await storage.ledger.get(aliceAddress);
    const instanceXTZBalance = await Tezos.tz.getBalance(instance.address);

    assert.strictEqual(totalSupply.toNumber(), 1000);
    assert.strictEqual(aliceRecord.balance.toNumber(), 1000);
    assert.strictEqual(instanceXTZBalance.toNumber(), 1000);
  });

  it("should transfer tokens from Alice to Bob", async function () {
    const instance = await TokenFA12.deployed();
    const aliceAddress = accounts.alice.pkh;
    const bobAddress = accounts.bob.pkh;
    const value = 100;

    await instance.transfer(aliceAddress, bobAddress, value);

    const storage = await instance.storage();
    const aliceRecord = await storage.ledger.get(aliceAddress);
    const bobRecord = await storage.ledger.get(bobAddress);

    assert.strictEqual(aliceRecord.balance.toNumber(), 900);
    assert.strictEqual(bobRecord.balance.toNumber(), 100);
  });

  it("should failed if transfer isn't approved", async function () {
    const instance = await TokenFA12.deployed();
    const aliceAddress = accounts.alice.pkh;
    const bobAddress = accounts.bob.pkh;
    const value = 100;

    tezos.setSignerProvider(
      await InMemorySigner.fromSecretKey(accounts.bob.sk)
    );

    await assert.rejects(
      instance.transfer(aliceAddress, bobAddress, value),
      (err) => {
        assert.strictEqual(err.message, "Not permitted", "Wrong error message");
        return true;
      },
      "No error is emmited"
    );
  });

  it("should stake tokens for Alice", async function () {
    tezos.setSignerProvider(
      await InMemorySigner.fromSecretKey(accounts.alice.sk)
    );

    const instance = await TokenFA12.deployed();
    const aliceAddress = accounts.alice.pkh;
    const value = 100;
    const currentTime = Date.parse(
      (await tezos.rpc.getBlockHeader()).timestamp
    );

    await instance.stake(value);

    const storage = await instance.storage();
    const aliceRecord = await storage.ledger.get(aliceAddress);

    assert.strictEqual(aliceRecord.balance.toNumber(), 800);
    assert.strictEqual(aliceRecord.staked.toNumber(), value);
    assert.strictEqual(aliceRecord.lastRewardPerShare.toNumber(), 0);
    assert.strictEqual(storage.totalSupply.toNumber(), 1000);
    assert.strictEqual(storage.totalStaked.toNumber(), value);
    assert.strictEqual(storage.rewardPerShare.toNumber(), 0);
    assert.strictEqual(Date.parse(storage.lastUpdateTime), currentTime);
  });

  it("should distribute rewards for Alice properly", async function () {
    const instance = await TokenFA12.deployed();
    const aliceAddress = accounts.alice.pkh;

    await bakeBlocks(3);

    const currentTime = Date.parse(
      (await tezos.rpc.getBlockHeader()).timestamp
    );
    const prevStorage = await instance.storage();

    await instance.stake(0);

    const rewardPerSec = 1000000;
    const deltaTime =
      (currentTime - Date.parse(prevStorage.lastUpdateTime)) / 1000;
    const reward = rewardPerSec * deltaTime;
    const rewardPerShare = Math.floor(reward / 100);
    const aliceReward = 100 * rewardPerShare;
    const storage = await instance.storage();
    const aliceRecord = await storage.ledger.get(aliceAddress);

    assert.strictEqual(aliceRecord.balance.toNumber(), aliceReward + 800);
    assert.strictEqual(aliceRecord.staked.toNumber(), 100);
    assert.strictEqual(
      aliceRecord.lastRewardPerShare.toNumber(),
      rewardPerShare
    );
    assert.strictEqual(storage.totalSupply.toNumber(), 1000);
    assert.strictEqual(storage.totalStaked.toNumber(), 100);
    assert.strictEqual(storage.rewardPerShare.toNumber(), rewardPerShare);
  });

  it("should unstake tokens for Alice", async function () {
    const instance = await TokenFA12.deployed();
    const aliceAddress = accounts.alice.pkh;
    const value = 100;

    await bakeBlocks(3);

    const currentTime = Date.parse(
      (await tezos.rpc.getBlockHeader()).timestamp
    );
    const prevStorage = await instance.storage();
    const prevAliceRecord = await prevStorage.ledger.get(aliceAddress);
    const prevAliceBalance = prevAliceRecord.balance.toNumber();

    await instance.unstake(value);

    const rewardPerSec = 1000000;
    const deltaTime =
      (currentTime - Date.parse(prevStorage.lastUpdateTime)) / 1000;
    const reward = rewardPerSec * deltaTime;
    const rewardPerShare =
      Math.floor(reward / 100) + prevStorage.rewardPerShare.toNumber();
    const aliceReward =
      100 * (rewardPerShare - prevAliceRecord.lastRewardPerShare.toNumber());
    const storage = await instance.storage();
    const aliceRecord = await storage.ledger.get(aliceAddress);

    assert.strictEqual(
      aliceRecord.balance.toNumber(),
      aliceReward + value + prevAliceBalance
    );
    assert.strictEqual(aliceRecord.staked.toNumber(), 0);
    assert.strictEqual(
      aliceRecord.lastRewardPerShare.toNumber(),
      rewardPerShare
    );
    assert.strictEqual(storage.totalSupply.toNumber(), 1000);
    assert.strictEqual(storage.totalStaked.toNumber(), 0);
    assert.strictEqual(storage.rewardPerShare.toNumber(), rewardPerShare);
  });
});
