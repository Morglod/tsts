# tsts

Experiments on typescript compiler api features.

## Usage:

```
npm i https://github.com/Morglod/tsts
npm i ttypescript
```

Specify in `tsconfig.json`
```json
"compilerOptions": {
    "plugins": [
        { "transform": "tsts/src/transformers/comptime.ts", "type": "checker" }
    ],
}
```

Build with `ttsc` as:
```json
"scripts": {
    "build": "ttsc"
},
```

Build:

```
npm run build
```

## Features

* [Comptime calculations](./docs/comptime.md)
* [Recursive comptime with generic types](./docs/recursive_comptime.md)
* [Compile time communication](./docs/comptime_communication.md)
* Macro-like eval [comptimeEval](./docs/comptimeEval.md)
* Overload decorator [overloadOf](./docs/overloadOf.md)

## comptime

Example of comptime calculations:

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

## Plans

### User-level compiler macro definition

```ts
__compilerJob($compiler => {
    $compiler.setMacro('__inline', ($compiler, node) => {
        // inline node here
    });
});

function foo(a,b) {
    console.log(a + b);
}

__inline(foo, 10, 20);
```

Result

```js
console.log(10 + 20);
```

### `comptime` & `__compilerJob` stability & error checking

Currently it works by code travel-extraction.  
There are a lot of cases where it works bad (like for argument expression eval)

### `pure` function decorator

Check if function is pure (without side effects).

May be used for:
* Safe `comptime` calls
* Translate TypeScript libraries to other languages (llvm)
