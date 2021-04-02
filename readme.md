# experiments on typescript extension

## comptimeEval

Evalute code on compilation.  
Macro-like functionality

Source:

```ts
function comptimeStructs() {
    type Variants = 'a' | 'b' | 'c' | 'e';

    comptimeEval<Variants>(`
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

## comptime

Run functions on compile time.  
Not stable yet.

Source:
```ts
function sum(a: number, b: number) {
    return a + b;
}

function comptimeSum() {
    const numbers = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
    const result = comptime(() => {
        return numbers.reduce((total, x) => sum(total, x), 0);
    });

    console.log(result);

    return result;
}

comptime(() => {
    return comptimeSum();
});
```

Result:
```js
function comptimeSum() {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = (() => { return (36); })();
    console.log(result);
    return result;
}

(() => { return (36); })();
```

## overloadof

Compile time overload type assertion on pure typescript

```ts
class A {
    foo() {
        return 10;
    }
}

class B extends A {
    @overloadOf<B, 'foo', A>()
    foo() {
        return 20;
    }
}

// ------

interface ISmth {
    boo(a: number, b: string): number;
}

class Hmm {
    @overloadOf<Hmm, 'boo', ISmth>()
    boo(a: number, b: string) {
        return 0;
    }
}
```

## build

```
npm run build
```