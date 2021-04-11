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

---

# Proposal

## Compiler hooks

### Analyze all nodes

```ts
__compilerJob($compiler => {
    const ts = $compiler.getTs();

    // compiler processing node hook
    $compiler.addListener('$onEnterNode', (node, replaceNode) => {
        if (ts.isSmth(node)) {
            replaceNode(...)
        }
    });
});
```

### Handle special cases

```ts
__compilerJob($compiler => {
    const ts = $compiler.getTs();

    $compiler.addListener('$onProjectCompiled', ($compiler) => {
        // append smth when everything is compiled
        // eg cli commands
        $compiler.appendNode($compiler.globalStore('data').items.map(x => ...));
    });
});
```
