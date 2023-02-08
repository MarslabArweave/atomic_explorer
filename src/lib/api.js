import {
  WarpFactory,
  LoggerFactory,
} from 'warp-contracts';
import { intelliContract } from './intelliContract';

LoggerFactory.INST.logLevel('error');

// addresses
const polarisContractAddress = 'GYMOnUEpGlEcbDBU0CFl7kgfv9i5Jw2qC-XR3She0-o';

// const warp = WarpFactory.forLocal(1984);
// const warp = WarpFactory.forTestnet();
const warp = WarpFactory.forMainnet({
  dbLocation: './cache/warp'+(new Date().getTime()).toString(), 
  inMemory: false
});
const arweave = warp.arweave;

let contract = undefined;
let polarisContract = undefined;

let walletAddress = undefined;
let isConnectWallet = false;

export function connectContract(contractTxId) {
  contract = new intelliContract(warp);
  contract.connectContract(contractTxId);
  
  polarisContract = new intelliContract(warp);
  polarisContract.connectContract(polarisContractAddress);
}

export async function connectWallet(walletJwk) {
  contract.connectWallet(walletJwk);
  polarisContract.connectWallet(walletJwk);
  walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
  isConnectWallet = true;
}

export async function readState() {
  if (!contract) {
    return {status: false, result: 'Contract connection error!'};
  }
  let result = "";
  let status = true;
  try {
    result = (await contract.readState()).cachedValue.state;
    console.log('read state: ', result);
  } catch (error) {
    status = false;
    result = 'Read state error!'
  }
  return {status: status, result: result};
}

export async function getBalance() {
  if (!contract) {
    return {status: false, result: 'Contract connection error!'};
  }
  let result = "";
  let status = true;
  try {
    result = (await contract.viewState({
      function: 'balanceOf',
      target: walletAddress,
    })).result;
    console.log(result);
  } catch {
    status = false;
    result = 'Interact with contract error!';
  }
  return {status: status, result: result};
}

export function arLessThan(a, b) {
  return arweave.ar.isLessThan(arweave.ar.arToWinston(a), arweave.ar.arToWinston(b));
}

export async function makeTransfer(target, quantity) {
  if (!contract) {
    return {status: false, result: 'Contract connection error'};
  }
  if (!isWellFormattedAddress(target)) {
    return {status: false, result: 'Target wallet address format error'};
  }
  const arBalance = await arweave.wallets.getBalance(walletAddress);
  if (arLessThan(arweave.ar.winstonToAr(arBalance), '0.02')) {
    return {status: false, result: 'You should hold at least 0.02$AR in your wallet to pay for network fee!'};
  }
  if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
    return {status: false, result: `Transfer amout must be positive integer: ${quantity}`};
  }

  let result = "";
  let status = true;
  try {
    await contract.writeInteraction({
      function: 'transfer',
      amount: quantity, 
      to: target
    });
  } catch {
    status = false;
    result = 'Interact with contract error!';
  }
  return {status: status, result: 'Transfer success'};
}

export const isWellFormattedAddress = (input) => {
  const re = /^[a-zA-Z0-9_-]{43}$/;
  return re.test(input);
}

// polaris api

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