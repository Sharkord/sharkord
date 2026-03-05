// import react and react-dom to the window object for plugins to use
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactJSXDev from 'react/jsx-dev-runtime';
import * as ReactJSX from 'react/jsx-runtime';

// exposes React and ReactDOM to the window object for plugins to use
const exposeReact = () => {
  window.__SHARKORD_REACT__ = React;
  window.__SHARKORD_REACT_JSX__ = ReactJSX;
  window.__SHARKORD_REACT_JSX_DEV__ = ReactJSXDev;
  window.__SHARKORD_REACT_DOM__ = ReactDOM;
  window.__SHARKORD_REACT_DOM_CLIENT__ = ReactDOMClient;
};

export { exposeReact };
