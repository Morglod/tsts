# tsts/comptime

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
