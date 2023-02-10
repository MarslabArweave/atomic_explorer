import React from 'react';
import { Input, InputGroup, Radio, RadioGroup, useToaster, Message } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import { getDomainNames, isWellFormattedAddress } from '../lib/api';
import { PageLoading } from './PageLoading/PageLoading';
import { SubmitButton } from './SubmitButton/SubmitButton';
import SearchIcon from '@rsuite/icons/Search';

const centerStyle = {
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center',
  margin: '3rem'
};

const radioType = {fontSize: '1.2rem', color: 'white'};

export const Home = (props) => {
  const navigate = useNavigate();
  const toaster = useToaster();

  const [type, setType] = React.useState('token');
  const [inputContent, setInputContent] = React.useState('');
  const [domainNameList, setTypeNameList] = React.useState();

  const toast = (type, message) => 
    <Message type={type} header={message} closable showIcon />
  
  const fetchDomainNames = async () => {
    const domainNamesRet = await getDomainNames();
    console.log(domainNamesRet);
    if (domainNamesRet.status === false) {
      return domainNamesRet;
    }
    setTypeNameList(domainNamesRet.result);
    return {status: true, result: 'Fetch info secceeded!'};
  };

  const onClickSearch = async () => {
    var address;
    if (inputContent.length > 0 && inputContent[0] === '@') {
      const name = inputContent.substring(1);
      if (!domainNameList[type][inputContent] || !isWellFormattedAddress(domainNameList[type][name]['target'])) {
        toaster.push(toast('error', `Polaris name '${name}' is not point to a(n) ${type} address!`));
        return;
      } else {
        address = domainNameList[type][name]['target'];
      }
    } else {
      if (!isWellFormattedAddress(inputContent)) {
        toaster.push(toast('error', `Transaction ID you entered seems not valid!`));
        return;
      }
      address = inputContent;
    }

    navigate(`/${type}/${address}`);
  };

  if (domainNameList === undefined) {
    return (
      <PageLoading 
        submitTask={fetchDomainNames}
      />
    );
  }

  return (
    <>
      <RadioGroup 
        inline 
        inputContent='searchType'
        appearance='picker'
        defaultValue='token'
        onChange={setType}
        style={{borderWidth: 0, margin: '3rem', justifyContent: 'center', alignItems: 'center', display: 'flex'}}
      >
        <Radio value='token'><p style={radioType}>Token</p></Radio>
        <Radio value='collect' disabled><p style={radioType}>Collectible</p></Radio>
        <Radio value='nft' disabled><p style={radioType}>Atomic-NFT</p></Radio>
      </RadioGroup>
      <div style={centerStyle}>
        <InputGroup size='md' style={{ width: 450 }}>
          <Input 
            placeholder={`Enter '@PolarisName' or 'TransactionID'`} 
            onChange={setInputContent}
          />
          <InputGroup.Button>
            <SearchIcon onClick={onClickSearch} />
          </InputGroup.Button>
        </InputGroup>
      </div>
    </>
  );
};