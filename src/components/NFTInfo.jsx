import React from 'react';
import { Form, Panel } from 'rsuite';
import { useParams } from "react-router-dom";
import { 
  getDateByTx, 
  getState, 
  getContractTxInfo, 
  getName, 
  getTarget, 
  getBalance, 
  isWellFormattedAddress,
  transfer,
  getMetaData
} from '../lib/api';
import { PageLoading } from './PageLoading/PageLoading';
import { mul, pow } from '../lib/math';
import LinkIcon from '@rsuite/icons/legacy/ExternalLink';
import RefreshIcon from '@rsuite/icons/legacy/Refresh';
import { ConnectWallet } from './ConnectWallet/ConnectWallet';
import { SubmitButton } from './SubmitButton/SubmitButton';

const panelStyle = {
  color: 'white', 
  fontSize: '1.4em', 
  fontWeight: 700
};

const radioType = {fontSize: '1.2rem', color: 'white'};

export const NFTInfo = (props) => {
  const params = useParams();

  // basic info
  const [metaData, setMetaData] = React.useState();
  const [nameSymbol, setNameSymbol] = React.useState();
  const [decimals, setDecimals] = React.useState(0);
  const [nftInfoList, setNFTInfoList] = React.useState([]);
  const [balance, setBalance] = React.useState('N/A');

  // transfer
  const [refreshing, setRefreshing] = React.useState(false);
  const [target, setTarget] = React.useState('');
  const [amount, setAmount] = React.useState(0);

  React.useEffect(async () => {
    fetchBalance();
  }, [props.walletConnect]);

  const fetchBalance = async () => {
    if (refreshing) return;
    setRefreshing(true);
    getBalance(params.address).then(ret=>{
      setRefreshing(false);
      if (ret.status) {
        const balanceWithDecimals = mul(ret.result, pow(10, -decimals));
        setBalance(balanceWithDecimals);
      }
    });
  };
  
  const fetchNFTInfo = async () => {
    const tokenStateRet = await getState(params.address);
    if (tokenStateRet.status === false) {
      return {status: false, result: 'Fetch token info failed. Please check if token address is correct!'};
    }
    const tokenState = tokenStateRet.result;
    
    const contractInfo = (await getContractTxInfo(params.address)).result;
    const mintDate = await getDateByTx(params.address);
    const totalSupply = mul(tokenState.totalSupply, pow(10, -tokenState.decimals));

    const metadataRet = await getMetaData(params.address);
    if (metadataRet.status) {
      setMetaData(metadataRet.result);
    }

    const renderAddress = async (address, matchDomain) => {
      let addressContent = address;

      // check if bind to a polaris name
      const polarisNameRet = await getName(address);
      if (polarisNameRet.status === true && 
          polarisNameRet.result !== undefined && 
          polarisNameRet.result !== null &&
          polarisNameRet.result.domain === matchDomain) {
        const domain = polarisNameRet.result.domain;
        const name = polarisNameRet.result.name;
        const polarisNameTargetRet = await getTarget(domain, name);
        if (polarisNameTargetRet.status === true && polarisNameTargetRet.result.target) {
          addressContent = 
            <a 
              href={`https://arweave.net/wbo15PDbhXjpGMSGV8wh-XhlfFgjXKOZPw-wvEE24xI/#/${domain}/${name}`}
            > 
              {`${name}.${domain}`} {<LinkIcon />}
            </a>;
        }
      }

      return addressContent;
    };

    const calcTop1Holdler = () => {
      let max = 0;
      let holdler = '';
      for (const addr in tokenState.balances) {
        if (Object.hasOwnProperty.call(tokenState.balances, addr)) {
          const balance = tokenState.balances[addr];
          if (balance > max) {
            max = balance;
            holdler = addr;
          }
        }
      }
      return {max, holdler};
    }

    const { max, holdler } = calcTop1Holdler();

    setNameSymbol(`${tokenState.name} (${tokenState.symbol})`);
    setDecimals(tokenState.decimals);
    setNFTInfoList([
      {title: 'NFT Symbol', content: tokenState.symbol}, 
      {title: 'NFT Name', content: tokenState.name}, 
      {title: 'NFT Description', content: tokenState.description}, 
      {title: 'NFT Address', content: params.address}, 
      {title: 'Belongs to Collectible', content: await renderAddress(contractInfo.decodedTags['collectible'], 'collectible')}, 
      {title: 'NFT Metadata Type', content: contractInfo.decodedTags['Content-Type']}, 
      {title: 'NFT Metadata', content: <>Arweave permanent link: <a href={`https://arweave.net/${params.address}`}>open link</a></>}, 
      {title: 'Creator', content: await renderAddress(contractInfo.owner_address, 'ar')},
      {title: 'Decimals', content: tokenState.decimals !== undefined ? tokenState.decimals : 'Unknown'},
      {title: 'Mint Date', content: mintDate.status ? mintDate.result : 'Unknown'},
      {title: 'Total Supply', content: totalSupply},
      {title: 'Holdlers', content: Object.keys(tokenState.balances).length},
      // {title: 'Transactions', content: ''}, // TODO
      {title: 'Top 1 Holdler', content: await renderAddress(holdler, 'ar')},
      {title: 'Top 1 Ratio', content: `${(max/tokenState.totalSupply*100).toFixed(2)}%`},
    ]);
    
    return {status: true, result: 'fetch token info secceeded!'};
  };

  const formOnchange = async (formValue) => {
    setTarget(formValue['target']);
    setAmount(formValue['amount']);
  };

  const onTransfer = async () => {
    var address;
    if (target.length > 0 && target[0] === '@') {
      const name = target.substring(1);
      const polarisTargetRet = await getTarget('ar', name);
      if (!polarisTargetRet.status || 
          !polarisTargetRet.result ||
          !isWellFormattedAddress(polarisTargetRet.result.target)) {
        return {status: false, result:`Polaris name '${name}' is not point to a wallet!`};
      } else {
        address = polarisTargetRet.result.target;
      }
    } else {
      if (!isWellFormattedAddress(target)) {
        return {status: false, result:`Transaction ID you entered seems not valid!`};
      }
      address = target;
    }
    
    const plainAmount = Number(mul(amount, pow(10, decimals)).toFixed(0));
    const ret = await transfer(params.address, address, plainAmount);
    await fetchBalance();

    return ret;
  };

  const renderPreview = () => {
    var htmlToRender;
    if (!metaData) {
      htmlToRender = <p>Fail to load metadata!</p>;
      return;
    }
    const dataUrl = URL.createObjectURL(new File([metaData.data], 'temp', {type: metaData.type}));
    switch (metaData.type.split('/')[0]) {
      case 'image':
        htmlToRender = <img src={dataUrl} />;
        break;
      case 'video':
        htmlToRender = <video src={dataUrl} type={metaData.type} controls></video>
        break;
      case 'audio':
        htmlToRender = <audio src={dataUrl} type={metaData.type} controls></audio>
        break;
      case 'text':
        var enc = new TextDecoder("utf-8");
        htmlToRender = <p>{enc.decode(metaData.data)}</p>
        break;
      default:
        htmlToRender = <p>Type {metaData.type} is temporarily not supported!</p>;
        break;
    }
    return htmlToRender;
  };

  const renderTokenInfo = (title, content) => {
    return(
      <div style={{padding: '0.8rem'}}>
        <p style={{color: 'white', fontSize: '1rem', fontWeight: 300}}>{title}</p>
        <p style={{color: 'white', fontSize: '1.4rem', fontWeight: 500}}>{content}</p>
      </div>
    );
  };

  const renderTransfer = () => {
    return(
      <Form onChange={formOnchange}>
        <Form.Group controlId="target">
          <Form.ControlLabel>Target</Form.ControlLabel>
          <Form.Control name="target" />
          <Form.HelpText tooltip>Polaris name is supported. Format: '@PolarisName'(non-endings). e.g. @marslab</Form.HelpText>
        </Form.Group>

        <Form.Group controlId="amount">
          <Form.ControlLabel>Amount</Form.ControlLabel>
          <Form.Control name="amount" />
          <Form.HelpText>Your balance: {balance} <RefreshIcon onClick={fetchBalance} spin={refreshing} /> </Form.HelpText>
        </Form.Group>
        
        <Form.Group>
          <SubmitButton
            buttonText='Transfer'
            submitTask={onTransfer}
          />
        </Form.Group>
      </Form>
    );
  };

  if (nftInfoList.length === 0 || nameSymbol === undefined) {
    return (
      <PageLoading 
        submitTask={fetchNFTInfo}
      />
    );
  }

  return (
    <>
      <p style={panelStyle}>{nameSymbol}</p>
      <br />
      <Panel 
        bordered 
        collapsible 
        header={<p style={panelStyle}>Preview</p>}
      >
        { renderPreview() }
      </Panel>

      <Panel 
        bordered 
        defaultExpanded 
        collapsible 
        header={<p style={panelStyle}>Atomic-NFT Info</p>}
      >
        {nftInfoList.map((item) => renderTokenInfo(item.title, item.content))}
      </Panel>

      <Panel 
        bordered 
        defaultExpanded 
        collapsible 
        header={<p style={panelStyle}>Transfer</p>}
      >
        { props.walletConnect ? renderTransfer() : <ConnectWallet /> }
      </Panel>
    </>
  );
};