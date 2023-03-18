import {
  WarpFactory,
  LoggerFactory,
} from 'warp-contracts';
import { selectWeightedPstHolder } from 'smartweave';
import { mul, pow } from './math';
import { intelliContract } from './intelliContract';

LoggerFactory.INST.logLevel('error');

// addresses
const polarisContractAddress = 'tU5g9rDKAQJwYgi_leautnj52qxlqjyWhENO0tSQjq8';
export const pntAddress = "tU5g9rDKAQJwYgi_leautnj52qxlqjyWhENO0tSQjq8";

// const warp = WarpFactory.forLocal(1984);
// const warp = WarpFactory.forTestnet();
const warp = WarpFactory.forMainnet({
  dbLocation: './cache/warp'+(new Date().getTime()).toString(), 
  inMemory: false
});
const arweave = warp.arweave;
let walletAddress = undefined;
export let isConnectWallet = false;

let polarisContract = undefined;

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

// Polaris name api

export async function getOwner(domain, name) {
  if (!polarisContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let status = true;
  let result = '';
  try {
    result = (await polarisContract.viewState({
      function: 'getOwner',
      params: {
        domain,
        name
      }
    })).result;
  } catch (err) {
    status = false;
    result = err;
  }

  return {status, result};
}

export async function getName(tx) {
  if (!polarisContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let status = true;
  let result = '';
  try {
    result = (await polarisContract.viewState({
      function: 'getName',
      params: {
        tx
      }
    })).result;
  } catch (err) {
    status = false;
    result = err;
  }

  return {status, result};
}

export async function getTarget(domain, name) {
  if (!polarisContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let status = true;
  let result = '';
  try {
    result = (await polarisContract.viewState({
      function: 'getTarget',
      params: {
        domain,
        name
      }
    })).result;
  } catch (err) {
    status = false;
    result = err;
  }

  return {status, result};
}

export async function getDomainNames() {
  if (!polarisContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let status = true;
  let result = '';
  try {
    result = (await polarisContract.viewState({
      function: 'getDomainNames',
    })).result;
  } catch (err) {
    status = false;
    result = err;
  }

  return {status, result};
}

// common api

export async function getMetaData(address) {
  let tx = await arweave.transactions.get(address);
  if (tx.data_size > 100*1024*1024) {
    return {status: false, result: 'Metadata size exceeds 100Mb, skip!'};
  }
  let dataType = 'unknown/unknown';
  tx.get('tags').forEach(tag => {
    let key = tag.get('name', {decode: true, string: true});
    if (key === 'Content-Type') {
      dataType = tag.get('value', {decode: true, string: true});
    }
  });

  let data = await arweave.transactions.getData(address, {decode: true});
  return {status: true, result: {type: dataType, data: data}};
}

export async function connectWallet(walletJwk) {
  polarisContract.connectWallet(walletJwk);
  isConnectWallet = true;
  walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
}

export async function connectContract() {
  polarisContract = new intelliContract(warp);
  polarisContract.connectContract(polarisContractAddress);

  return {status: true, result: 'Connect contract success!'};
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

export function getWalletAddress() {
  return walletAddress;
}

async function minARBalanceCheck(threshInAR) {
  const arBalanceRet = await getBalance('ar');
  if (arBalanceRet.status && arLessThan(arBalanceRet.result, threshInAR)) {
    return false;
  }
  return true;
}

export function arLessThan(a, b) {
  return arweave.ar.isLessThan(arweave.ar.arToWinston(a), arweave.ar.arToWinston(b));
}

export const isWellFormattedAddress = (input) => {
  const re = /^[a-zA-Z0-9_-]{43}$/;
  return re.test(input);
}

export const getContractTxInfo = async (contractAddress) => {
  let tx = await arweave.transactions.get(contractAddress);
  tx.owner_address = await arweave.wallets.ownerToAddress(tx.owner);
  tx.decodedTags = {};
  tx.get('tags').forEach(tag => {
    const key = tag.get('name', {decode: true, string: true});
    const value = tag.get('value', {decode: true, string: true});
    tx.decodedTags[key] = value;
  });
  return {status: true, result: tx};
};

export const getDateByTx = async (txId) => {
  const txRet = await arweave.transactions.getStatus(txId);
  if (txRet.status !== 200) {
    return {status: false, result: 'Cannot find specific TxID on Arweave Network!'};
  }
  const blockHeight = txRet.confirmed.block_height;
  var elapsed = (await arweave.blocks.getCurrent()).height - blockHeight;
  const date = new Date();
  date.setMinutes(date.getMinutes() - elapsed * 2);
  return {status: true, result: date.toLocaleDateString()};
};

export const getContractData = async (contractAddress) => {
  const data = await arweave.transactions.getData(contractAddress, {decode: true, string: true});
  return {status: true, result: data};
};

export async function getBalance(tokenAddress) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }

  if (!isWellFormattedAddress(tokenAddress) && tokenAddress !== 'ar') {
    return {status: false, result: 'Pst address not valid!'};
  }

  let result = "";
  let status = true;
  try {
    if (tokenAddress === 'ar') {
      result = arweave.ar.winstonToAr(await arweave.wallets.getBalance(getWalletAddress()));
    } else {
      result = await (await warp.contract(tokenAddress).viewState({
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