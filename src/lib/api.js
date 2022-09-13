import {
  WarpFactory,
  LoggerFactory,
} from 'warp-contracts';
/* global BigInt */

LoggerFactory.INST.logLevel('error');

// const warp = WarpFactory.forTestnet();
const warp = WarpFactory.forMainnet();
const arweave = warp.arweave;
let contract = undefined;
let walletAddress = undefined;
let isConnectWallet = false;

export function connectContract(contractTxId) {
  contract = warp.pst(contractTxId).setEvaluationOptions({
    ignoreExceptions: false,
  });
  return contract;
}

export async function connectWallet(walletJwk) {
  contract = contract.connect(walletJwk);
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
    result = 'Read contract state error!';
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
    console.log('wallet addr: ', walletAddress);
    result = (await contract.currentBalance(walletAddress));
  } catch {
    status = false;
    result = 'Interact with contract error!';
  }
  return {status: status, result: result};
}

export async function mintToken(mintAmout) {
  if (!contract) {
    return {status: false, result: 'Contract connection error!'};
  }
  if (!Number.isInteger(mintAmout) || mintAmout <= 0) {
    return {status: false, result: 'Amount you enter must be positive integer!'};
  }
  const readRes = await readState();
  if (readRes.status === false) {
    return readRes;
  }
  const mintableAmount = readRes.result.mintable;
  if (mintableAmount < mintAmout) {
    return {status: false, result: 'Mint amout exceeds maximum!'};
  }
  const mintPrice = readRes.result.mintPrice;
  const mintFee = (mintAmout * mintPrice).toString();

  const target = readRes.result.owner;

  let result = "";
  let status = true;
  try {
    result = await contract.writeInteraction(
      {
        function: 'mint',
        qty: mintAmout,
      },
      { transfer:
        {
          target: target,
          winstonQty: arweave.ar.arToWinston(mintFee),
        }
      }
    );
  } catch {
    status = false;
    result = 'Interact with contract error!';
  }
  return {status: status, result: result};
}

export async function makeTransfer(target, quantity) {
  if (!contract) {
    return {status: false, result: 'Contract connection error'};
  }
  if (!isWellFormattedAddress(target)) {
    return {status: false, result: 'Target wallet address format error'};
  }
  if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
    return {status: false, result: 'Transfer amout must be positive integer'};
  }

  let result = "";
  let status = true;
  try {
    await contract.transfer({qty: quantity, target: target});
    console.log('update result: ', result);
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