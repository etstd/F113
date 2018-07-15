> Благодаря сделаным изменениям middleware для koajs 
> для проекта F113 не работают
> 
> Это связано с изменением middleware<Array> -> middleware<Map>
> И изменением функции compose под капотом


## Отличия от оригинальной koa
Коллекция middlewares представляет из себя ```js Map``` объект.

```js
  // новый объект создаётся по вызову функции, а не конструктора
  const app = F113(); 

  // F113 не расширяет объект events.EventEmitter
  // События перенесены в поле events
  app.events.on('error', function(error, ctx){
    // error handling
  });

  // У middleware функций убран параметр next
  // добавлена возможность передавать данные
  // между двумя последовательно идущими middleware
  // Для этого нужно вернуть значение из функции
  const middlewareOne = async function( ctx ){
    return true; 
  };

  // В local передаются значения от предыдущего middleware
  // Можно возвращать массив, в этом случае в следующей
  // middleware функции будет два параметра
  // 
  // async function( ctx, one, two ){
  //   console.log( one ) // true
  //   console.log( two ) // false
  // }
  // 
  const middlewareTwo = async function( ctx, local ){
    console.log( local ); //true

    return [false, true]
  };

  // локальные данные не аккумулируются и никак
  // не контролируются ядром. Локальные данные
  // всегда передаются явным образом.
  // Если этого не сделать. Данные из функции f[i] не 
  // попадут в f{i+2}
  // Для передачи данных по всему потоку глобально
  // по прежнему можно использовать ctx.state
  const middlewareNext = async function( ctx, ...args ){
    ctx.state = 'global';

    return args
  };

  // Добавлена возможность добавлять middleware
  // функции по несколько штук в один use
  app.use( middlewareOne, middlewareTwo );


  app.use( async function( ctx, one, two ){
    console.log( one ); // true
    console.log( two ); // false

    console.log( ctx.state ); // false

    ctx.body = { locals: { one, two }, global: ctx.state }
  });

```
Вся остальная функциональность **на данный момент сохранена**