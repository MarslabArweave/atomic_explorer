import React from 'react';
import { Input, InputGroup, Radio, RadioGroup, useToaster, Message } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import { isWellFormattedAddress } from '../lib/api';
import { PageLoading } from './PageLoading/PageLoading';
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

  const toast = (type, message) => 
    <Message type={type} header={message} closable showIcon />

  const onClickSearch = async () => {
    var address;
    if (!isWellFormattedAddress(inputContent)) {
      toaster.push(toast('error', `Transaction ID you entered seems not valid!`));
      return;
    }
    address = inputContent;

    navigate(`/${type}/${address}`);
  };

  return (
    <>
      <RadioGroup 
        inline 
        name='type'
        appearance='picker'
        defaultValue='token'
        onChange={setType}
        style={{borderWidth: 0, margin: '3rem', justifyContent: 'center', alignItems: 'center', display: 'flex'}}
      >
        <Radio value='token'><p style={radioType}>Token</p></Radio>
        <Radio value='collection'><p style={radioType}>Collection</p></Radio>
        <Radio value='nft'><p style={radioType}>Atomic-NFT</p></Radio>
      </RadioGroup>
      <div style={centerStyle}>
        <InputGroup size='md' style={{ width: 450 }}>
          <Input 
            placeholder={`Enter TransactionID`} 
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