import './App.css';

import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { PstDetails } from './components/pstDetails';

const App = () => {
  return (
    <div id="app">
      <div id="content">
        <main>
          <Routes>
            <Route path="/" name="" element={<Home />} />
            <Route path="/:pstAddress" element={<Details />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const Home = (props) => {
  const [pstAddress, setPstAddress] = React.useState("");

  return (
    <>
      <header>TokenScope</header>

      <div className='center'>
        <TextareaAutosize
          className='searchInput'
          value={pstAddress}
          onChange={e => setPstAddress(e.target.value)}
          rows="1" 
          placeholder="Enter the pst address here"
        />
      </div>
      <div className='center'>
        <Link className='submitButton' to={`/${pstAddress}`}>Search</Link>
      </div>
    </>
  );
};

const Details = (props) => {
  return (
    <>
      <header>Pst details</header>
      <PstDetails />
    </>
  );
};

export default App;