'use strict'
module.exports = function pseudoComposeMap ( middleware ) {
  
  if ( Object.getPrototypeOf( middleware ) !== Map.prototype ) {
    throw new TypeError('Middleware stack must be an Map!')
  };

  for ( const fn of middleware.values() ) {
    if ( typeof fn !== 'function' ) { 
      throw new TypeError( 'Middleware must be composed of functions!' )
    }
  };

  return async function ( ctx ){
    try {
      let result = null;

      for ( const [ k, fn ] of middleware )  {
        result = await fn( ctx );
      };
    }
    catch ( error ) {
      throw error
    };
  };
};
