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
    makeTransfer
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

  useEffect(async () => {
    if (!isWellFormattedAddress(params.pstAddress)) {
      setIsInit(false);
      setInitResult("The wrc-20 token address you entered seems not valid, please check!");
      return;
    }
    connectContract(params.pstAddress);
    setInitResult("");
    readState().then(ret => {
      setIsInit(false);
      if (ret.status === false) {
        setInitResult(ret.result);
        return;
      } else {
        if (!ret.result.symbol || !ret.result.name || !ret.result.balances) {
          setInitResult("This contract address seems not wrc-20 token address!");
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
            &nbsp;{balance ? (balance * Math.pow(10,-pstState.decimals)).toFixed(pstState.decimals) : 'Unknown'}
          </div>
          &nbsp;&nbsp;&nbsp;<button className='refreshButton' disabled={refreshDisabled} onClick={onRefreshButtonClicked}>Refresh</button>
        </div>
        
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

  async function onSubmitButtonClicked() {
    setIsSubmitting(true);
    setSubmitResult("");
    makeTransfer(target, Math.floor(Number(quantity * Math.pow(10,pstState.decimals)))).then(ret => {
      setIsSubmitting(false);
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
          <div className='pstLargeKey'> Token: </div>
        </div>
        <div className='pstLargeValue'>
          &nbsp;{pstState.name ? pstState.name : 'Unknown'}(${pstState.symbol ? pstState.symbol : 'Unknown'})
        </div>
      </div>
      <div className='center'>
        <div>
        <div className='pstMidiumKey'> Max supply: </div>
        </div>
        <div className='pstMidiumValue'>
          &nbsp;{pstState.totalSupply ? pstState.totalSupply * Math.pow(10,-pstState.decimals) : 'Unknown'}
        </div>
      </div>
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
