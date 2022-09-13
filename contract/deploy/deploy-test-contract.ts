import fs from 'fs';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { addFunds, mineBlock } from '../utils/_helpers';
import {
  PstState,
  Warp,
  WarpNodeFactory,
  LoggerFactory,
} from 'warp-contracts';

let arweave: Arweave;
let warp: Warp;

let walletJwk: JWKInterface;
let walletAddress: string;

let contractSrc: string;
let contractInit: Object;

let contractTxId: string;

(async () => {
  console.log('running...');
  arweave = Arweave.init({
    host: 'testnet.redstone.tools',
    port: 443,
    protocol: 'https',
  });

  LoggerFactory.INST.logLevel('error');

  warp = WarpNodeFactory.memCachedBased(arweave).useArweaveGateway().build();

  walletJwk = await arweave.wallets.generate();
  await addFunds(arweave, walletJwk);
  walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
  await mineBlock(arweave);

  // deploy fixed supply pst
  contractSrc = fs.readFileSync(path.join(__dirname, '../dist/fixed_supply/contract.js'), 'utf8');
  const pstInitFromFile = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../dist/fixed_supply/initial-state.json'), 'utf8')
  );
  contractInit = {
    ...pstInitFromFile,
    owner: walletAddress,
    balances: {},
  };
  contractInit['balances'][walletAddress] = 1000000;

  contractTxId = await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(contractInit),
    src: contractSrc,
  });
  await mineBlock(arweave);

  console.log('contractTxId: ', contractTxId);
  // console.log('jardgeWalletJwk: ', jardgeWalletJwk);
  fs.writeFileSync(path.join(__dirname, 'key-file-for-test.json'), JSON.stringify(walletJwk));
  fs.writeFileSync(path.join(__dirname, 'fixed-supply-pst-txid-for-test.json'), contractTxId);

  // deploy mintable pst
  contractSrc = fs.readFileSync(path.join(__dirname, '../dist/mintable/contract.js'), 'utf8');
  const pstInitFromFile2 = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../dist/mintable/initial-state.json'), 'utf8')
  );
  contractInit = {
    ...pstInitFromFile2,
    owner: walletAddress,
    balances: {},
  };
  contractInit['balances'][walletAddress] = 1000000;

  contractTxId = await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(contractInit),
    src: contractSrc,
  });
  await mineBlock(arweave);

  console.log('contractTxId: ', contractTxId);
  // console.log('jardgeWalletJwk: ', jardgeWalletJwk);
  fs.writeFileSync(path.join(__dirname, 'mintable-pst-txid-for-test.json'), contractTxId);
})();
