import fs from 'fs';
import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { addFunds, mineBlock } from '../utils/_helpers';
import {
  PstContract,
  PstState,
  Warp,
  WarpNodeFactory,
  LoggerFactory,
  Contract,
} from 'warp-contracts';

describe('Testing JArdge Project', () => {
  console.log = function() {};

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;

  let walletJwk: JWKInterface;
  let walletAddress: string;
  let walletJwk2: JWKInterface;
  let walletAddress2: string;

  let fixedSupplySrc: string;
  let fixedSupplyInit: Object;
  let fixedSupplyPst: PstContract;
  let fixedSupplyPstTxId: string;

  let mintableSrc: string;
  let mintableInit: Object;
  let mintablePst: PstContract;
  let mintablePstTxId: string;

  beforeAll(async () => {
    arlocal = new ArLocal(1820);
    await arlocal.start();

    arweave = Arweave.init({
      host: 'localhost',
      port: 1820,
      protocol: 'http',
    });
    LoggerFactory.INST.logLevel('error');

    warp = WarpNodeFactory.forTesting(arweave);
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  async function initialize() {
    walletJwk = await arweave.wallets.generate();
    await addFunds(arweave, walletJwk);
    walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
    await mineBlock(arweave);
    walletJwk2 = await arweave.wallets.generate();
    await addFunds(arweave, walletJwk2);
    walletAddress2 = await arweave.wallets.jwkToAddress(walletJwk2);
    await mineBlock(arweave);

    // deploy pst fixedSupplyPst
    fixedSupplySrc = fs.readFileSync(path.join(__dirname, '../dist/fixed_supply/contract.js'), 'utf8');
    const fixedSupplyInitFromFile = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/fixed_supply/initial-state.json'), 'utf8')
    );
    fixedSupplyInit = {
      ...fixedSupplyInitFromFile,
      owner: walletAddress,
      balances: {},
    };
    fixedSupplyInit['balances'][walletAddress] = 10000000;
    fixedSupplyPstTxId = await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(fixedSupplyInit),
      src: fixedSupplySrc,
    });
    fixedSupplyPst = warp.pst(fixedSupplyPstTxId);
    fixedSupplyPst.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(walletJwk);
    await mineBlocks(1);

    // deploy pst mintablePst
    mintableSrc = fs.readFileSync(path.join(__dirname, '../dist/mintable/contract.js'), 'utf8');
    const mintablePstInitFromFile = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/mintable/initial-state.json'), 'utf8')
    );
    mintableInit = {
      ...mintablePstInitFromFile,
      owner: walletAddress,
    };
    mintablePstTxId = await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(mintableInit),
      src: mintableSrc,
    });
    mintablePst = warp.pst(mintablePstTxId);
    mintablePst.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(walletJwk);
    await mineBlocks(1);
  }

  async function mineBlocks(times: number) {
    for (var i = 0; i < times; i ++) {
      await mineBlock(arweave);
    }
  }

  it('test deploy state', async () => {
    await initialize();
    expect(fixedSupplyPstTxId.length).toEqual(43);
    expect(await fixedSupplyPst.currentState()).toEqual(fixedSupplyInit);
    expect(mintablePstTxId.length).toEqual(43);
    expect(await mintablePst.currentState()).toEqual(mintableInit);
  });

  it('test pst fixedSupplyPst - base', async () => {
    await initialize();
    const ret = await fixedSupplyPst.transfer({qty: 10000, target: walletAddress2});
    await mineBlock(arweave);

    const balance1 = await fixedSupplyPst.currentBalance(walletAddress);
    expect(balance1).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 10000000 - 10000,
    });

    const balance2 = await fixedSupplyPst.currentBalance(walletAddress2);
    expect(balance2).toEqual({
      target: walletAddress2,
      ticker: 'ticker',
      balance: 10000,
    });
  });

  it('test pst fixedSupplyPst - invalid target', async () => {
    await initialize();
    await fixedSupplyPst.transfer({qty: 10000, target: "invalid_target"});
    await mineBlock(arweave);

    const balance1 = await fixedSupplyPst.currentBalance(walletAddress);
    expect(balance1).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 10000000,
    });

    let catchErr2 = false;
    try {
      await fixedSupplyPst.currentBalance("123456");
    } catch {
      catchErr2 = true;
    }
    expect(catchErr2).toEqual(true);
  });

  it('test pst fixedSupplyPst - invalid txqty', async () => {
    await fixedSupplyPst.transfer({qty: 1000.1, target: walletAddress});
    await mineBlock(arweave);
    const balance1 = await fixedSupplyPst.currentBalance(walletAddress);
    expect(balance1).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 10000000,
    });

    await fixedSupplyPst.transfer({qty: -1000, target: walletAddress});
    await mineBlock(arweave);
    const balance2 = await fixedSupplyPst.currentBalance(walletAddress);
    expect(balance2).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 10000000,
    });

    await fixedSupplyPst.transfer({qty: 1000000000000000000000000, target: walletAddress});
    await mineBlock(arweave);
    const balance3 = await fixedSupplyPst.currentBalance(walletAddress);
    expect(balance3).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 10000000,
    });
  });

  it('test pst mintablePst - mint', async () => {
    await initialize();
    const ret = await mintablePst.writeInteraction(
      {
        function: 'mint',
        qty: 1000000,
      },
      undefined,
      {
        target: walletAddress,
        winstonQty: arweave.ar.arToWinston('1'),
      }
    );
    await mineBlock(arweave);

    const balance1 = await mintablePst.currentBalance(walletAddress);
    expect(balance1).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 1000000,
    });

    const mintable = await mintablePst.readState();
    expect(mintable.state['mintable']).toEqual(1000000000-1000000);
  });

  it('test pst mintablePst - invalid ar transfer', async () => {
    await initialize();
    const ret = await mintablePst.writeInteraction(
      {
        function: 'mint',
        qty: 1000000,
      },
      undefined,
      {
        target: walletAddress,
        winstonQty: arweave.ar.arToWinston('0.1'),
      }
    );
    await mineBlock(arweave);

    const balance1 = await mintablePst.currentBalance(walletAddress);
    expect(balance1).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 100000,
    });

    const mintable = await mintablePst.readState();
    expect(mintable.state['mintable']).toEqual(1000000000-100000);
  });

  it('test pst mintablePst - invalid target', async () => {
    await initialize();
    const ret = await mintablePst.writeInteraction(
      {
        function: 'mint',
        qty: 1000000,
      },
      undefined,
      {
        target: walletAddress2,
        winstonQty: arweave.ar.arToWinston('1'),
      }
    );
    await mineBlock(arweave);

    const balance1 = await mintablePst.currentBalance(walletAddress);
    expect(balance1).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 0,
    });

    const mintable = await mintablePst.readState();
    expect(mintable.state['mintable']).toEqual(1000000000);
  });

  it('test pst mintablePst - invalid mint amout', async () => {
    await initialize();
    const ret = await mintablePst.writeInteraction(
      {
        function: 'mint',
        qty: 1000000000000,
      },
      undefined,
      {
        target: walletAddress,
        winstonQty: arweave.ar.arToWinston('1000'),
      }
    );
    await mineBlock(arweave);

    const balance1 = await mintablePst.currentBalance(walletAddress);
    expect(balance1).toEqual({
      target: walletAddress,
      ticker: 'ticker',
      balance: 1000000000,
    });

    const mintable = await mintablePst.readState();
    expect(mintable.state['mintable']).toEqual(0);
  });

});
