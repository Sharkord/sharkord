import { createSelector } from '@reduxjs/toolkit';
import { createCachedSelector } from 're-reselect';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactJSXDev from 'react/jsx-dev-runtime';
import * as ReactJSX from 'react/jsx-runtime';

const exposeLibs = () => {
  window.__SHARKORD_EXPOSED_LIBS__ = {
    createSelector,
    createCachedSelector
  };
};

const exposeReact = () => {
  window.__SHARKORD_REACT__ = React;
  window.__SHARKORD_REACT_JSX__ = ReactJSX;
  window.__SHARKORD_REACT_JSX_DEV__ = ReactJSXDev;
  window.__SHARKORD_REACT_DOM__ = ReactDOM;
  window.__SHARKORD_REACT_DOM_CLIENT__ = ReactDOMClient;
};

export { exposeLibs, exposeReact };
