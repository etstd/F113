'use strict'

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: D E F I N E   M A I N   F U N C T I O N : :  :   :    :     :     :
// ────────────────────────────────────────────────────────────────────────────
//
  function composeAsync( ...fns ){
    return fns.reduceRight(( w, c ) => (
      async function composedAsyncFn( ...data ){
        try {
          const tmp = await c( ...data );
    
          return await w( ...(Array.isArray(tmp) ? tmp : [tmp]));
        }
        catch ( error ) {
          throw error
        };
      }
    ));
  };

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: D E F I N E   C O M P O S E   F O R   M A P : :  :   :    :       :
// ────────────────────────────────────────────────────────────────────────────
//
  function pseudoComposeAsyncMap( fns ){
    const sr = Symbol('reset'); // sr -- symbol reset

    return async function( c, ...d ){ // d -- data; c -- context
      try {
        let r = sr; // r -- result

        for ( const [ k, fn ] of fns )  {
          r = await fn(c, ...(r === sr ? d : Array.isArray(r) ? r : [ r ]) );
        };

        return r;
      }
      catch ( error ) {
        throw error
      };

    };

  };

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: C R E A T E   F N S   F O R   T E S T : :  :   :    :     :       :
// ────────────────────────────────────────────────────────────────────────────
//
  const a = async function( ctx, next ){
    try {
      console.log( 'a' );

      return next+=1;
    }
    catch ( error ) {
      throw error
    };
  };
  
  const b = async function( ctx, next ){
    try {
      console.log( 'b' );

      return next+=2;
    }
    catch ( error ) {
      throw error
    };
  };
  
  const c = async function( ctx, next ){
    try {
      console.log( 'c' );

      return [ ctx, next+=3 ]
    }
    catch ( error ) {
      throw error
    };
  };

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: T E S T I N G : :  :   :    :     :        :          :           :
// ────────────────────────────────────────────────────────────────────────────
//
  (async function(){
    try {
      const pseudoComposedAsyncFn = pseudoComposeAsyncMap(new Map([
        [ a, a ], [ b, b ], [ c, c ]
      ]));

      console.log( await pseudoComposedAsyncFn( {a: 1}, 0 ) ) 
    }
    catch ( error ) {
      console.error(error);
    };
  })()