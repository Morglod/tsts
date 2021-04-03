# compile time communication

Research on compile time communication abilities

Inspired by Jai, John Blow

```ts
__compilerJob($compiler => {
    $compiler.addListener('item', (arg: any) => {
        const items = $compiler.globalStore('items');
        if (!items.list) items.list = [];
        items.list.push(arg);
    });

    $compiler.replaceWithCode('(void 0)');
});

__compilerJob($compiler => {
    $compiler.emitEvent('item', '({ hello: "world" })');
    $compiler.replaceWithCode('(void 0)');
});

__compilerJob($compiler => {
    $compiler.emitEvent('item', '({ foo: "boo" })');
    $compiler.replaceWithCode('(void 0)');
});

__compilerJob($compiler => {
    const cmds = $compiler.globalStore('items');
    $compiler.replaceWithCode('[' + cmds.list.join(', ') + ']');
});
```

Result:

```js
(void 0);

(void 0);
(void 0);

[({ hello: "world" }), ({ foo: "boo" })];
```