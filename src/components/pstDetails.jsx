import '../App.css';

import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { ProgressSpinner } from './ProgressSpinner';
import { useEffect } from 'react';
import 
  { connectContract, 
    connectWallet, 
    isWellFormattedAddress, 
    readState, 
    getBalance, 
    makeTransfer,
    mintToken 
  } 
from '../lib/api';
import { useParams } from 'react-router';
import { WalletSelectButton } from './WalletSelectButton';

export const PstDetails = (props) => {
  const params = useParams();
  const [refreshDisabled, setRefreshDisabled] = React.useState(true);
  const [isInit, setIsInit] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [initResult, setInitResult] = React.useState("");
  const [balance, setBalance] = React.useState();
  const [pstState, setPstState] = React.useState({});
  const [isWalletConnected, setIsWalletConnected] = React.useState(false);
  const [target, setTarget] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [submitResult, setSubmitResult] = React.useState("");
  const [isMintting, setIsMintting] = React.useState(false);
  const [mintResult, setMintResult] = React.useState("");
  const [mintAmout, setMintAmout] = React.useState("");

  useEffect(async () => {
    if (!isWellFormattedAddress(params.pstAddress)) {
      setIsInit(false);
      setInitResult("The pst address you entered seems not valid, please check!");
      return;
    }
    const contract = connectContract(params.pstAddress);
    console.log('contract object: ', contract);
    setInitResult("");
    readState().then(ret => {
      setIsInit(false);
      if (ret.status === false) {
        setInitResult(ret.result);
        return;
      } else {
        if (!ret.result.ticker || !ret.result.name || !ret.result.balances) {
          setInitResult("This contract address seems not pst address!");
          return;
        }
        setPstState(ret.result);
      }
    });
  }, []);

  useEffect(async () => {
    if (!isWalletConnected) {
      return;
    }
    await connectWallet('use_wallet');
    getBalance().then(ret => {
      console.log('getBalance ret: ', ret);
      if (ret.status === true) {
        setBalance(ret.result.balance.toString());
        setRefreshDisabled(false);
      }
    });
  }, [isWalletConnected]);

  function renderMoreInfo() {
    return (
      <>
        <div className='center'>
          <div>
          <div className='pstMidiumKey'> Your balance: </div>
          </div>
          <div className='pstMidiumValue'>
            &nbsp;{balance ? balance : 'Unknown'}
          </div>
          &nbsp;&nbsp;&nbsp;<button className='refreshButton' disabled={refreshDisabled} onClick={onRefreshButtonClicked}>Refresh</button>
        </div>

        { pstState.type === 'mintable' &&
          <>
          <hr />
          <div className='center'> 
            <div className='pstLargeKey'> Mint token(s) </div>
          </div>
          <div className='center'>
            <div className='pstMidiumKey'> Amount: </div>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <TextareaAutosize
              className='searchInput'
              value={mintAmout}
              onChange={e => setMintAmout(e.target.value)}
              rows="1" 
              placeholder='e.g. 1234'
            />
          </div>
          {isMintting && <ProgressSpinner />}
          {mintResult !== '' &&
            <div className='center'>
              <div className="darkRow">{mintResult}</div>
            </div>
          }
          <div className='center'>
            <button className='submitButton' onClick={onMintButtonClicked}>Mint</button>
          </div>
          </>
        }
        
        <hr />
        <div className='center'> 
          <div className='pstLargeKey'> Make Transaction </div>
        </div>
        <div className='center'>
          <div className='pstMidiumKey'> Target: </div>
          &nbsp;&nbsp;&nbsp;&nbsp;
          <TextareaAutosize
            className='searchInput'
            value={target}
            onChange={e => setTarget(e.target.value)}
            rows="1" 
            placeholder='e.g. mcPY8LTyJ_8win2CgrHcrnxuJ9FXXIsCGwjXl8gMjP8'
          />
        </div>
        <div className='center'>
          <div className='pstMidiumKey'> Quantity: </div>
          &nbsp;&nbsp;&nbsp;&nbsp;
          <TextareaAutosize
            className='searchInput'
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            rows="1" 
            placeholder='e.g. 1870'
          />
        </div>
        {isSubmitting && <ProgressSpinner />}
        {submitResult !== '' &&
          <div className='center'>
            <div className="darkRow">{submitResult}</div>
          </div>
        }
        <div className='center'>
          <button className='submitButton' onClick={onSubmitButtonClicked}>Transfer</button>
        </div>
      </>
    );
  }

  async function onMintButtonClicked() {
    setIsMintting(true);
    setMintResult("");
    mintToken(Number(mintAmout)).then(ret => {
      setIsMintting(false);
      console.log('mint ret: ', ret);
      if (ret.status === false) {
        setMintResult(ret.result);
        return;
      } else {
        setMintResult("Mint success!")
      }
    });
  }

  async function onSubmitButtonClicked() {
    setIsSubmitting(true);
    setSubmitResult("");
    makeTransfer(target, Number(quantity)).then(ret => {
      setIsSubmitting(false);
      console.log('transfer ret: ', ret);
      if (ret.status === false) {
        setSubmitResult(ret.result);
        return;
      } else {
        setSubmitResult("Transfer success!")
      }
    });
  }

  async function onRefreshButtonClicked() {
    if (!isWalletConnected) {
      return;
    }
    setRefreshDisabled(true);
    getBalance().then(ret => {
      console.log('onRefreshButtonClicked, balance: ', ret);
      if (ret.status === true) {
        setBalance(ret.result.balance.toString());
        setRefreshDisabled(false);
      }
    });
  }

  if (isInit) {
    return (
      <ProgressSpinner />
    );
  }

  if (initResult !== '') {
    return (
      <div className='center'>
        <div className="darkRow">{initResult}</div>
      </div>
    );
  }

  return (
    <div>
      <div className='center'>
        <div>
          <div className='pstLargeKey'> Ticker: </div>
        </div>
        <div className='pstLargeValue'>
          &nbsp;{pstState.name ? pstState.name : 'Unknown'}(${pstState.ticker ? pstState.ticker : 'Unknown'})
        </div>
      </div>
      <div className='center'>
        <div>
        <div className='pstMidiumKey'> Type: </div>
        </div>
        <div className='pstMidiumValue'>
          &nbsp;{pstState.type ? pstState.type : 'Unknown'}
        </div>
      </div>
      <div className='center'>
        <div>
        <div className='pstMidiumKey'> Max supply: </div>
        </div>
        <div className='pstMidiumValue'>
          &nbsp;{pstState.maxSupply ? pstState.maxSupply : 'Unknown'}
        </div>
      </div>
      { pstState.type === 'mintable' &&
        <>
        <div className='center'>
          <div>
            <div className='pstMidiumKey'> Mintable: </div>
          </div>
          <div className='pstMidiumValue'>
            &nbsp;{pstState.mintable ? pstState.mintable : 'Unknown'}
          </div>
        </div>
        <div className='center'>
          <div>
            <div className='pstMidiumKey'> Token price($AR): </div>
          </div>
          <div className='pstMidiumValue'>
            &nbsp;{pstState.mintPrice ? pstState.mintPrice : 'Unknown'}
          </div>
        </div>
        </>
      }
      <hr />
      { !isWalletConnected &&
        <>
          <div className='center'>
            <div className='pstSmallValue'>
              Connect wallet to see more information 👇
            </div>
          </div>
          <div className='center'>
            <WalletSelectButton setIsConnected={value => setIsWalletConnected(value)}/>
          </div>
        </>
      }
      {isWalletConnected && renderMoreInfo()}
    </div>
  );
};
