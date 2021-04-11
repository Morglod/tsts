import { __compilerJob, comptime } from './transformers/comptime.lib';

__compilerJob($compiler => {
    $compiler.addListener('item', (arg: any) => {
        const items = $compiler.globalStore('items');
        if (!items.list) items.list = [];
        items.list.push(arg);
    });

    $compiler.replaceWithCode('(void 0)');
});

function compilerJobExample1() {
    __compilerJob($compiler => {
        let out = '';
        const genericType = { types: [ { value: 'a' }, { value: 'b' } ] };
        // walk over union
        for (const childT of (genericType).types) {
            out += childT.value + ': 0, ';
        }

        $compiler.replaceWithCode('({' + out + '})');
    });
}

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

// declare const Struct: any;

// function comptimeStructs() {

//     __compilerEval<'A'|'B'>(`
//         let out = '';
//         $eachOfStrUnion(x => out += x + ': 0, ');
//         return 'const Struct = {' + out + '}';
//     `);

//     return Struct;
// }

// function sum(a: number, b: number) {
//     return a + b;
// }

// function comptimeSum() {
//     const numbers = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
//     const result = comptime(() => {
//         return numbers.reduce((total, x) => sum(total, x), 0);
//     });

//     console.log(result);

//     return result;
// }

// comptime(() => {
//     return comptimeSum();
// });

// function compInComp() {
//     const result = comptime(() => {
//         return comptimeStructs();
//     });
//     console.log(result);
// }

// compInComp();

function compApiInComptime() {
    const result = comptime(() => {
        console.log('compApiInComptime');
        return compilerJobExample2<'a'|'b'|'c'>();
    });
}

// // 
// // type.tryGetThisTypeAt(topCallStack)

// function foo<A>() {
//     __compilerJob<A>($compiler => {
//         $compiler.getTypeOfGeneric(0);
//         return 123;
//     });
// }

// __compilerJob($compiler => {
//     foo<'A' | 'B'>();
//     return 123;
// });

// (function foo<A>() {
//     __compilerJob<A>($compiler => {
//         $compiler.getTypeOfGeneric(0);
//         return 123;
//     });
// })<"A" | "B">()

// function defineCmd(name: string) {
//     __compilerJob($compiler => {
//         const ts = $compiler.getTs();
//         if (!ts.isFunctionExpression($compiler.getCurrentNode().parent.parent.parent)) {
//             return '';
//         }

//         return name;
//     });
// }

// comptime(() => {
//     defineCmd("it works");
// });

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

//-------

// NOT WORKING ------------

// function sum(input: number[]) {
//     return input.reduce((total, x) => total + x, 0);
// }

// function comptimeSum() {
//     const numbers = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
//     const result = comptime(() => {
//         return sum(numbers);
//     });

//     return result;
// }

// comptime(() => {
//     return comptimeSum();
// });

// END OF NOT WORKING -------

// function sum(a: number, b: number) {
//     return a + b;
// }

// function comptimeSum() {
//     const numbers = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
//     const result = comptime(() => {
//         return numbers.reduce((total, x) => sum(total, x), 0);
//     });

//     console.log(result);

//     return result;
// }

// comptime(() => {
//     return comptimeSum();
// });