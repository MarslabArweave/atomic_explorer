import {
  WarpFactory,
  LoggerFactory,
} from 'warp-contracts';
import { arweaveWrapper } from './arweaveWrapper';
import { intelliContract } from './intelliContract';

LoggerFactory.INST.logLevel('error');

// const warp = WarpFactory.forLocal(1984);
// const warp = WarpFactory.forTestnet();
const warp = WarpFactory.forMainnet();
const arweave = warp.arweave;
let walletAddress = undefined;
export let isConnectWallet = false;

const arWrapper = new arweaveWrapper(warp.arweave);

export async function transfer(tokenAddress, target, amount) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (amount <= 0) {
    return {status: false, result: 'Amount is to tiny to transfer!'};
  }
  if (!isWellFormattedAddress(target)) {
    return {status: false, result: 'Target address is not valid!'};
  }
  if (await minARBalanceCheck('0.01') === false) {
    return {status: false, result: 'You should have at least 0.01$AR in wallet to pay for network fee!'};
  }
  
  const token = new intelliContract(warp);
  token.connectContract(tokenAddress);
  token.connectWallet('use_wallet');

  const balanceRet = await getBalance(tokenAddress);
  if (balanceRet.status && balanceRet.result < amount) {
    return {status: false, result: 'insufficient funds!'};
  }

  let status = true;
  let result = '';
  try {
    await token.writeInteraction({
      function: 'transfer',
      to: target,
      amount: amount
    });

    status = true;
    result = 'Transfer done!';
  } catch (err) {
    status = false;
    result = err;
  }

  return {status, result};
}

// common api

export const isWellFormattedAddress = (input) => {
  const re = /^[a-zA-Z0-9_-]{43}$/;
  return re.test(input);
}

async function minARBalanceCheck(threshInAR) {
  const arBalanceRet = await getBalance('ar');
  if (arBalanceRet.status && arLessThan(arBalanceRet.result, threshInAR)) {
    return false;
  }
  return true;
}

export function arLessThan(a, b) {
  return arWrapper.arweave.ar.isLessThan(arWrapper.arweave.ar.arToWinston(a), arWrapper.arweave.ar.arToWinston(b));
}

export async function connectWallet(walletJwk) {
  isConnectWallet = true;
  walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
}

export function getWalletAddress() {
  return walletAddress;
}

export const getTxFromWarpGW = async (contractAddress) => {
  try {
    const resp = await fetch(`https://gateway.warp.cc/gateway/contract?txId=${contractAddress}`);
    const respJson = await resp.json();
    return respJson;
  } catch (err) {
    console.error(err);
  }
};

export const getDataL2 = async (contractAddress) => {
  try {
    const resp = await fetch(`https://gateway.warp.cc/gateway/contract-data/${contractAddress}`);
    const respJson = await resp.json();
    return respJson;
  } catch (err) {
    console.error(err);
  }
};

export const getTx = async (contractAddress) => {
  return await arWrapper.getTx(contractAddress);
};

export const getDateByTx = async (txId) => {
  const txRet = await arWrapper.arweave.transactions.getStatus(txId);
  if (txRet.status !== 200) {
    return {status: false, result: 'Cannot find specific TxID on Arweave Network!'};
  }
  const blockHeight = txRet.confirmed.block_height;
  var elapsed = (await arWrapper.arweave.blocks.getCurrent()).height - blockHeight;
  const date = new Date();
  date.setMinutes(date.getMinutes() - elapsed * 2);
  return {status: true, result: date.toLocaleDateString()};
};

export const getData = async (contractAddress) => {
  return await arWrapper.getData(contractAddress);
};

export const blockHeight2DateTime = async (blockHeight) => {
  // undefined
};

export async function getBalance(nftAddress) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }

  if (!isWellFormattedAddress(nftAddress) && nftAddress !== 'ar') {
    return {status: false, result: 'Token address not valid!'};
  }

  let result = "";
  let status = true;
  try {
    if (nftAddress === 'ar') {
      result = arWrapper.arweave.ar.winstonToAr(await arWrapper.arweave.wallets.getBalance(getWalletAddress()));
    } else {
      const tokenContract = new intelliContract(warp);
      tokenContract.connectContract(nftAddress);
      result = await (await tokenContract.viewState({
        function: 'balanceOf',
        target: getWalletAddress(),
      })).result.balance;
    }
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function getTags(txId) {
  return await arWrapper.getTags(txId);
}

export async function getState(txID) {
  const contract = new intelliContract(warp);
  contract.connectContract(txID);

  let status = true;
  let result = '';
  try {
    result = (await contract.readState()).cachedValue.state;
  } catch (err) {
    status = false;
    result = err;
  }

  return {status, result};
}

export async function asyncCall(callback, args) {
  const promises = [];
  for (const arg of args) {
    promises.push(callback(arg));
  }
  return await Promise.all(promises);
}