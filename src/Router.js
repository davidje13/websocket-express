import express from 'express';
import wrapHandlers from './wrapHandlers';

export default class Router extends express.Router {
  constructor(...args) {
    super(...args);
    wrapHandlers(this);
  }
}
