import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { 
  connectContract, 
} from './lib/api';
import 'rsuite/dist/rsuite.css';
import './App.css';
import { Home } from './components/Home';
import { sleep } from 'warp-contracts';
import { TokenInfo } from './components/TokenInfo';

const App = () => {
  const [isContractConnected, setIsContractConnected] = React.useState(false);
  const [isWalletConnected, setIsWalletConnected] = React.useState(false);

  React.useEffect(async ()=>{
    await connectContract();
    await sleep(3000);
    setIsContractConnected(true);
  }, []);

  if (!isContractConnected) {
    return (
      <div className='darkRow'>
        Loading Contract ...
      </div>
    );
  }
  return (
    <div id="app">
      <div id="content">
        <Navigation setIsWalletConnected={setIsWalletConnected}/>
        <main>
          <Routes>
            <Route path="/" name="" element={<HomeFrame />} />
            <Route path="/token/:address" element={<TokenInfoFrame walletConnect={isWalletConnected}/>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const HomeFrame = (props) => {
  return (
    <>
      <Home />
    </>
  );
};

const TokenInfoFrame = (props) => {
  return (
    <>
      <TokenInfo walletConnect={props.walletConnect}/>
    </>
  );
};

export default App;