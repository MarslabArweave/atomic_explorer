import React from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { getState } from "../lib/api";
import { NFTCard } from "./NFTCard";
import { PageLoading } from "./PageLoading/PageLoading";

const cardStyle = {
  display: 'inline-block',
  margin: '1rem',
  cursor: 'pointer'
};

const titleStyle = {
  fontSize: '1.2rem',
  margin: '1rem',
  color: 'white'
};

export const CollectibleInfo = (props) => {
  const navigate = useNavigate();
  const params = useParams();

  const [info, setInfo] = React.useState();

  const fetchInfo = async () => {
    const collectibleStateRet = await getState(params.address);
    if (collectibleStateRet.status === false) {
      return {status: false, result: 'Fetch collectible info failed. Please check if collectible address is correct!'};
    }
    setInfo(collectibleStateRet.result);
    return {status: true, result: 'Load succeeded!'};
  };

  const renderNFTCard = (address) => {
    return (
      <div style={cardStyle} onClick={()=>{navigate(`/nft/${address}`)}}>
        <NFTCard
          address={address}
        />
      </div>
    );
  };

  if (!info) {
    return (
      <PageLoading
        submitTask={fetchInfo}
      />
    );
  }

  return (
    <>
      <p style={titleStyle}><b>{info.name}</b></p>
      <p style={titleStyle}>{info.description}</p>
      {info.nftSet.map((addr)=>renderNFTCard(addr))}
    </>
  );
};