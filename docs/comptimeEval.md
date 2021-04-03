# tsts/comptimeEval

Evalute code on compilation.  
Macro-like functionality

Source:

```ts
declare function __compilerEval<T>(x: string): any;

function comptimeStructs() {
    type Variants = 'a' | 'b' | 'c' | 'e';

    __compilerEval<Variants>(`
        let out = '';
        $eachOfStrUnion(x => out += x + ': 0, ');
        return 'const Struct = {' + out + '}';
    `);
}
```

Compiled:

```js
function comptimeStructs() {
    var Struct = { a: 0, b: 0, c: 0, e: 0, };
}
```