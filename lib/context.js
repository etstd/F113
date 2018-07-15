'use strict';
//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: I M P O R T S : :  :   :    :     :        :          :           :
// ────────────────────────────────────────────────────────────────────────────
//
  const util = require('util');
  const createError = require('http-errors');
  const httpAssert = require('http-assert');
  const delegate = require('delegates');
  const statuses = require('statuses');
  const Cookies = require('cookies');

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: L O C A L   C O N S T A N T S : :   :    :      :       :         :
// ────────────────────────────────────────────────────────────────────────────
//
  const COOKIES = Symbol('context#cookies');

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: P R O T O : :  :   :    :     :        :          :               :
// ────────────────────────────────────────────────────────────────────────────
//

  //
  // ─── DEFINE OBJECT ────────────────────────────────────────────────────────
  //
    const proto = {};
    
  //
  // ─── METHOD INSPECT ───────────────────────────────────────────────────────
  //

    /**
     * util.inspect() implementation, which
     * just returns the JSON output.
     *
     * @return {Object}
     * @api public
     */

    proto.inspect = function() {
      return this === proto ? true : this.toJSON();
    };

  //
  // ─── METHOD TOJSON ────────────────────────────────────────────────────────
  //

    /**
     * Return JSON representation.
     *
     * Here we explicitly invoke .toJSON() on each
     * object, as iteration will otherwise fail due
     * to the getters and cause utilities such as
     * clone() to fail.
     *
     * @return {Object}
     * @api public
     */

    proto.toJSON = function() {
      return {
        request: this.request.toJSON(),
        response: this.response.toJSON(),
        app: this.app.toJSON(),
        originalUrl: this.originalUrl,
        req: '<original node req>',
        res: '<original node res>',
        socket: '<original node socket>'
      };
    };

  //
  // ─── METHOD ASSERT ────────────────────────────────────────────────────────
  //

    /**
     * Similar to .throw(), adds assertion.
     *
     *    this.assert(this.user, 401, 'Please login!');
     *
     * See: https://github.com/jshttp/http-assert
     *
     * @param {Mixed} test
     * @param {Number} status
     * @param {String} message
     * @api public
     */

    assert: httpAssert;

  //
  // ─── METHOD THROW ─────────────────────────────────────────────────────────
  //

    /**
     * Throw an error with `msg` and optional `status`
     * defaulting to 500. Note that these are user-level
     * errors, and the message may be exposed to the client.
     *
     *    this.throw(403)
     *    this.throw('name required', 400)
     *    this.throw(400, 'name required')
     *    this.throw('something exploded')
     *    this.throw(new Error('invalid'), 400);
     *    this.throw(400, new Error('invalid'));
     *
     * See: https://github.com/jshttp/http-errors
     *
     * @param {String|Number|Error} err, msg or status
     * @param {String|Number|Error} [err, msg or status]
     * @param {Object} [props]
     * @api public
     */

    proto.throw = function(...args) {
      throw createError(...args);
    };

  //
  // ─── METHOD ONERROR ───────────────────────────────────────────────────────
  //

    /**
     * Default error handling.
     *
     * @param {Error} err
     * @api private
     */
    proto.onerror = function( err, /* msg */ ) {
      // don't do anything if there is no error.
      // this allows you to pass `this.onerror`
      // to node-style callbacks.
      if (null == err) return;

      if ( !(err instanceof Error) ){
        err = new Error(util.format('non-error thrown: %j', err));
      };

      let headerSent = false;
      if (this.headerSent || !this.writable) {
        headerSent = err.headerSent = true;
      };

      this.app.events.emit('error', err, this);

      // nothing we can do here other
      // than delegate to the app-level
      // handler and log.
      if (headerSent) {
        return;
      }

      const { res } = this;

      // first unset all headers
      /* istanbul ignore else */
      if ( 'function' === typeof res.getHeaderNames ) {
        res.getHeaderNames().forEach(name => res.removeHeader(name));
      } else {
        res._headers = {}; // Node < 7.7
      }

      // then set those specified
      this.set(err.headers);

      // force text/plain
      this.type = 'text';

      // ENOENT support
      if ('ENOENT' == err.code) {
        err.status = 404;
      };

      // default to 500
      if ( 'number' != typeof err.status || !statuses[err.status] ) {
        err.status = 500;
      };

      // respond
      const msg = err.expose ? err.message : statuses[err.status];

      this.status = err.status;
      this.length = Buffer.byteLength(msg);
      this.res.end(msg);
    };

  //
  // ─── COOKIES ACCESSORS ────────────────────────────────────────────────────
  //
    Object.defineProperty(proto, 'cookies', {

      get: function() {
        if (!this[COOKIES]) {
          this[COOKIES] = new Cookies(this.req, this.res, {
            keys: this.app.keys,
            secure: this.request.secure
          });
        }
        return this[COOKIES];
      },

      set: function( _cookies ) {
        this[COOKIES] = _cookies;
      }

    })

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: P R O T O   D E L E G A T I O N : :  :   :      :       :         :
// ────────────────────────────────────────────────────────────────────────────
//

  //
  // ─── RESPONSE ──────────────────────────────────────────────────────────────
  //
    delegate(proto, 'response')
      .method('attachment')
      .method('redirect')
      .method('remove')
      .method('vary')
      .method('set')
      .method('append')
      .method('flushHeaders')
      .access('status')
      .access('message')
      .access('body')
      .access('length')
      .access('type')
      .access('lastModified')
      .access('etag')
      .getter('headerSent')
      .getter('writable');

  //
  // ─── REQUEST ──────────────────────────────────────────────────────────────
  //
    delegate(proto, 'request')
      .method('acceptsLanguages')
      .method('acceptsEncodings')
      .method('acceptsCharsets')
      .method('accepts')
      .method('get')
      .method('is')
      .access('querystring')
      .access('idempotent')
      .access('socket')
      .access('search')
      .access('method')
      .access('query')
      .access('path')
      .access('url')
      .access('accept')
      .getter('origin')
      .getter('href')
      .getter('subdomains')
      .getter('protocol')
      .getter('host')
      .getter('hostname')
      .getter('URL')
      .getter('header')
      .getter('headers')
      .getter('secure')
      .getter('stale')
      .getter('fresh')
      .getter('ips')
      .getter('ip');

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: E X P O R T S : :  :   :    :     :        :          :           :
// ────────────────────────────────────────────────────────────────────────────
//

  //
  // ─── MAIN ─────────────────────────────────────────────────────────────────
  //
    module.exports = proto;
  
  //
  // ─── CUSTOM INSPECTION ────────────────────────────────────────────────────
  //

    /**
     * Custom inspection implementation for newer Node.js versions.
     *
     * @return {Object}
     * @api public
     */
    if (util.inspect.custom) {
      module.exports[util.inspect.custom] = proto.inspect;
    };
