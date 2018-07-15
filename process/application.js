'use strict'
//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: M O D U L E S : :  :   :    :     :        :          :           :
// ────────────────────────────────────────────────────────────────────────────
//
  const isGeneratorFunction = require('is-generator-function');
  const debug = require('debug')('koa:application');
  const onFinished = require('on-finished');
  const response = require('./response');

  // const compose = require('koa-compose');
  const compose = require('./lib/compose');

  const isJSON = require('koa-is-json');
  const context = require('./context');
  const request = require('./request');
  const statuses = require('statuses');
  const Emitter = require('events');
  const util = require('util');
  const Stream = require('stream');
  const http = require('http');
  const only = require('only');
  const convert = require('koa-convert');
  const deprecate = require('depd')('koa');

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: P R O T O : :  :   :    :     :        :          :               :
// ────────────────────────────────────────────────────────────────────────────
//

  //
  // ─── DEFINE OBJECT ────────────────────────────────────────────────────────
  //
    const application = Object.create(Emitter.prototype);

  //
  // ─── METHOD LISTEN ────────────────────────────────────────────────────────
  //
    application.listen = function(...args) {

      const server = http.createServer(this.callback());

      return server.listen(...args);
    }
  
  //
  // ─── METHOD TOJSON ────────────────────────────────────────────────────────
  //
    application.toJSON = function() {
      return only(this, [
        'subdomainOffset',
        'proxy',
        'env'
      ]);
    }
    
  //
  // ─── METHOD INSPECT ───────────────────────────────────────────────────────
  //
    application.inspect = function() {
      return this.toJSON();
    }
  
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
  // ─── METHOD CALLBACK ──────────────────────────────────────────────────────
  //
    application.callback = function() {
      const fn = compose(this.middleware);

      if (!this.listenerCount('error')) this.on('error', this.onerror);

      const handleRequest = (req, res) => {
        const ctx = this.createContext(req, res);
        return this.handleRequest(ctx, fn);
      };

      return handleRequest;
    };
  
  //
  // ─── METHOD HANDLEREQUEST ─────────────────────────────────────────────────
  //
    application.handleRequest = function(ctx, fn) {
      const res = ctx.res;
      res.statusCode = 404;
      const onerror = err => ctx.onerror(err);
      const handleResponse = () => respond(ctx);
      onFinished(res, onerror);
      return fn(ctx).then(handleResponse).catch(onerror);
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
    application.onerror = function(err) {
      if (!(err instanceof Error)){
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
  function respond(ctx) {
    // allow bypassing koa
    if (false === ctx.respond) return;

    const res = ctx.res;
    if (!ctx.writable) return;

    let body = ctx.body;
    const code = ctx.status;

    // ignore body
    if (statuses.empty[code]) {
      // strip headers
      ctx.body = null;
      return res.end();
    }

    if ('HEAD' == ctx.method) {
      if (!res.headersSent && isJSON(body)) {
        ctx.length = Buffer.byteLength(JSON.stringify(body));
      }
      return res.end();
    }

    // status body
    if (null == body) {
      body = ctx.message || String(code);
      if (!res.headersSent) {
        ctx.type = 'text';
        ctx.length = Buffer.byteLength(body);
      }
      return res.end(body);
    }

    // responses
    if (Buffer.isBuffer(body)) return res.end(body);
    if ('string' == typeof body) return res.end(body);
    if (body instanceof Stream) return body.pipe(res);

    // body: json
    body = JSON.stringify(body);
    if (!res.headersSent) {
      ctx.length = Buffer.byteLength(body);
    }
    res.end(body);
  }

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