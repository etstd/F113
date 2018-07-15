'use strict'
//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: M O D U L E S : :  :   :    :     :        :          :           :
// ────────────────────────────────────────────────────────────────────────────
//
  const debug = require('debug')('koa:application');
  const onFinished = require('on-finished');
  const response = require('./response');
  const compose = require('./utils/compose');
  const isJSON = require('koa-is-json');
  const context = require('./context');
  const request = require('./request');
  const statuses = require('statuses');
  const Emitter = require('events');
  const util = require('util');
  const Stream = require('stream');
  const http = require('http');
  const only = require('only');

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: P R O T O : :  :   :    :     :        :          :               :
// ────────────────────────────────────────────────────────────────────────────
//

  //
  // ─── DEFINE OBJECT ────────────────────────────────────────────────────────
  //
    const application = {};

  //
  // ─── METHOD LISTEN ────────────────────────────────────────────────────────
  //
    application.listen = function(...args) {

      const server = http.createServer(this.createCallback());

      return server.listen(...args);
    };
  
  //
  // ─── METHOD TOJSON ────────────────────────────────────────────────────────
  //
    application.toJSON = function() {
      return only(this, [
        'subdomainOffset',
        'proxy',
        'env'
      ]);
    };
    
  //
  // ─── METHOD INSPECT ───────────────────────────────────────────────────────
  //
    application.inspect = function() {
      return this.toJSON();
    };
  
  //
  // ─── METHOD USE ───────────────────────────────────────────────────────────
  //
    application.use = function( ...fns ) {

      fns.forEach(fn => {
        if (typeof fn !== 'function') {
          throw new TypeError('middleware must be a function!');
        };

        const key = fn._name ? fn._name : fn.name ? fn.name : fn;

        this.middleware.set( key, fn );
      });

      return this;
    };

  //
  // ─── METHOD CREATE CALLBACK ───────────────────────────────────────────────
  //
    application.createCallback = function() {
      const fn = compose(this.middleware);

      if ( !this.events.listenerCount('error') ) {
        setImmediate(() => {
          this.events.on('error', this.onerror);
        })
      };

      const handleRequest = (req, res) => {
        const ctx = this.createContext(req, res);
        return this.handleRequest(ctx, fn);
      };

      return handleRequest;
    };
  
  //
  // ─── METHOD HANDLEREQUEST ─────────────────────────────────────────────────
  //
    application.handleRequest = async function( ctx, exec ) {
      ctx.res.statusCode = 404;

      onFinished(ctx.res, err => ctx.onerror(err));
      
      try {
        return respond(await exec(ctx));
      }
      catch ( error ) {
        ctx.onerror( error )
        // this.events.emit('error', ctx, error);
      };
      
    };

  //
  // ─── METHOD CREATE CONTEXT ────────────────────────────────────────────────
  //
    application.createContext = function(req, res) {
      const context = Object.create(this.context);
      const request = context.request = Object.create(this.request);
      const response = context.response = Object.create(this.response);
      context.app = request.app = response.app = this;
      context.req = request.req = response.req = req;
      context.res = request.res = response.res = res;
      request.ctx = response.ctx = context;
      request.response = response;
      response.request = request;
      context.originalUrl = request.originalUrl = req.url;
      context.state = {};

      return context;
    };
  
  //
  // ─── METHOD ONERROR ───────────────────────────────────────────────────────
  //
    application.onerror = function( err ) {

      if( Object.getPrototypeOf( err ) !== Error.prototype ){
        throw new TypeError(util.format('non-error thrown: %j', err));
      };
  
      if (404 == err.status || err.expose || this.silent) {
        return
      };
  
      console.error();
      console.error((err.stack || err.toString()).replace(/^/gm, '  '));
      console.error();
    };

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: F U N C T I O N   R E S P O N D : :  :   :    :     :             :
// ────────────────────────────────────────────────────────────────────────────
//
  function respond( ctx ) {
    // allow bypassing koa
    if ( ctx.respond === false || !ctx.writable ){
      return;
    };

    const code = ctx.status,
          res  = ctx.res;

    let body = ctx.body;

    // ignore body
    if (statuses.empty[code]) {

      // strip headers
      ctx.body = null;

      return res.end();
    };

    if ( ctx.method === 'HEAD' ) {

      if ( !res.headersSent && isJSON(body) ) {
        ctx.length = Buffer.byteLength(JSON.stringify(body));
      };

      return res.end();
    };

    // status body
    if ( body === null || body === undefined ) {

      body = ctx.message || String(code);

      if (!res.headersSent) {
        ctx.type = 'text';
        ctx.length = Buffer.byteLength(body);
      }

      return res.end(body);
    };

    // responses
    if ( Buffer.isBuffer(body) || 'string' === typeof body ){

      res.end( body );
    }
    else if( Object.getPrototypeOf(body) === Stream.prototype ){

      body.pipe( res )
    }
    else { // else body is json object

      body = JSON.stringify(body);

      if ( !res.headersSent ) {
        ctx.length = Buffer.byteLength(body);
      };

      res.end(body);
    }
  };

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: E X P O R T S : :  :   :    :     :        :          :           :
// ────────────────────────────────────────────────────────────────────────────
//
  module.exports = function(  ){
    return Object.create(application, {
      proxy: {
        value: false
      },
      middleware: {
        value: new Map()
      },
      subdomainOffset: {
        value: 2
      },
      env: {
        value: process.env.NODE_ENV || 'development'
      },
      events: {
        value: Object.create( Emitter.prototype )
      },
      context: {
        value: Object.create( context )
      },
      request: {
        value: Object.create( request )
      },
      response: {
        value: Object.create( response )
      },
    });
  };