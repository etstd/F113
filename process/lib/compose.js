'use strict'
module.exports = function pseudoComposeMap ( middlewares ) {
  
  if ( Object.getPrototypeOf( middlewares ) !== Map.prototype ) {
    throw new TypeError('Middleware stack must be an Map!')
  };

  for ( const fn of middlewares.values() ) {
    if ( typeof fn !== 'function' ) { 
      throw new TypeError( 'Middleware must be composed of functions!' )
    }
  };

  return async function ( ctx ){
    try {
      let lr = null; // lr -- local result. Data returned fn

      for ( const fn of middlewares.values() )  {
        lr = await fn( ctx, ...( Array.isArray( lr ) ? lr : [ lr ] ) );
      };

      return ctx;
    }
    catch ( error ) {
      throw error;
    };
  };
};
