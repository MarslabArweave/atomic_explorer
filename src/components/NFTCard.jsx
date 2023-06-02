import React from "react";
import { Panel, Loader } from "rsuite";
import QuestionIcon from '@rsuite/icons/legacy/Question';
import VideoIcon from '@rsuite/icons/legacy/VideoCamera';
import AudioIcon from '@rsuite/icons/legacy/FileAudioO';
import refreshIcon from '@rsuite/icons/legacy/Refresh';
import { getDataL2, getData, getState, getTags } from "../lib/api";
import { mul, pow } from "../lib/math";

const panelStyle = {
  width: 180,
  height: 350
};

const centerStyle = {
  justifyContent: 'center', 
  alignItems: 'center',
  fontSize: 50
};

const itemTitleStyle = {
  fontSize: '1rem',
};

const panelTitleStyle = {
  color: 'white',
};

const contentStyle = {
  fontSize: '0.5rem',
  color: 'white'
};

const containerStyle = {
  height: 180, 
  width: 180,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

export const NFTCard = (props) => {
  const [nftInfo, setNFTInfo] = React.useState();
  const [previewDom, setPreviewDom] = React.useState(<div style={containerStyle}><refreshIcon spin /></div>);

  const showContent = (content, defaultContent) => content ? content : defaultContent;

  React.useEffect(() => {
    const init = async () => {
      const tokenStateRet = await getState(props.address);
      console.log(props.address, tokenStateRet);
      if (tokenStateRet.status === false) {
        return;
      }
      const tokenState = tokenStateRet.result;
      const totalSupply = mul(tokenState.totalSupply, pow(10, -tokenState.decimals));
      const contractInfo = await getDataL2(props.address);

      setNFTInfo({
        symbol: tokenState.symbol,
        name: tokenState.name,
        description: tokenState.description,
        supply: totalSupply,
        type: contractInfo.type
      });

      const assetData = await getData(contractInfo.asset);
      const assetType = (await getTags(contractInfo.asset))['Content-Type'];
      setPreview(assetData, assetType);
    };
    init();
  }, []);

  const setPreview = async (assetData, assetType) => {
    var htmlToRender;
    if (!assetData || !assetType) {
      setPreviewDom(<div style={containerStyle}></div>);
      return;
    }
    switch (assetType.split('/')[0]) {
      case 'image':
        htmlToRender = <img src={URL.createObjectURL(new File([assetData], 'temp', {assetType}))} width="180" />;
        break;
      default:
        htmlToRender = <QuestionIcon style={{fontSize: 100, textAlign: 'center'}} />;
        break;
    }
    setPreviewDom(<div style={containerStyle}>{htmlToRender}</div>);
  };

  return (
    <div>
      <Panel shaded bordered bodyFill style={panelStyle}>
        {previewDom}
        <Panel header={<p style={panelTitleStyle}> {showContent(nftInfo?.name, 'Loading...')} </p>}>
          <p style={contentStyle}>
            Symbol: {showContent(nftInfo?.symbol, 'Loading...')}
          </p>
          <p style={contentStyle}>
            Max Supply: {showContent(nftInfo?.supply, 'Loading...')}
          </p>
          <p style={contentStyle}>
            Asset Type: {showContent(nftInfo?.type, 'Loading...')}
          </p>
          <p style={contentStyle}>
            Description: {showContent(nftInfo?.description, 'Loading...')}
          </p>
        </Panel>
      </Panel>
    </div>
  );
}
