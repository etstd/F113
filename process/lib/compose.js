'use strict'
//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: M A I N   F U N C T I O N : :  :   :    :     :        :          :
// ────────────────────────────────────────────────────────────────────────────
//
  /**
   * Функция принимает параметр fns который должен быть объектом тип Map;
   * fns принимается для создания замыкания.
   * 
   * Возвращает асинхронную анонимную функцию. В теле которой происходит
   * перебор объекта fns.
   * 
   * @param {Map[Async Function]} fns 
   * @return {Async Function} -- приминимает ctx
   */
  function pseudoComposeMap( fns ){
    return async function ( ctx ){
      try {
        let lr = null; // lr -- local result. Data returned fn

        for ( const fn of fns.values() )  {
          lr = await fn( ctx, ...( Array.isArray( lr ) ? lr : [ lr ] ) );
        };

        return ctx;
      }
      catch ( error ) {
        throw error;
      };
    };
  };

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: V A L I D A T O R   F O R   M A I N   F U N C T I O N : :  :   :  :
// ────────────────────────────────────────────────────────────────────────────
//
  function validate( middlewares ){
    if ( Object.getPrototypeOf( middlewares ) !== Map.prototype ) {
      throw new TypeError('Middleware stack must be an Map!')
    };

    for ( const fn of middlewares.values() ) {
      if ( typeof fn !== 'function' ) { 
        throw new TypeError( 'Middleware must be composed of functions!' )
      }
    };

    return middlewares;
  };

//
// ────────────────────────────────────────────────────────────────────────────
//   :::::: E X P O R T S : :  :   :    :     :        :          :           :
// ────────────────────────────────────────────────────────────────────────────
//
  module.exports = middlewares => pseudoComposeMap(validate(middlewares));
