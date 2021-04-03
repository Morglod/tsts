# recursive comptime

Source:
```ts
function compilerJobExample2<Names>() {
    return __compilerJob<Names>($compiler => {
        let out = '';
        const genericType = $compiler.getTypeOfGeneric(0);
        // walk over Names type
        if (genericType && genericType.isUnionOrIntersection()) {
            for (const childT of genericType.types) {
                if (childT.isStringLiteral()) {
                    out += `"${childT.value}",`;
                }
            }
        }

        $compiler.replaceWithCode('([ ' + out + ' ])');
    });
}

function compApiInComptime() {
    const result = comptime(() => {
        console.log('compApiInComptime');
        return compilerJobExample2<'a'|'b'|'c'>();
    });
}
```

Result:
```js
function compilerJobExample2() {
    return ([]);
}

function compApiInComptime() {
    const result = (() => { return (["a", "b", "c"]); })();
}
```
