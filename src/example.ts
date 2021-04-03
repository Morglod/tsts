// // -----------------------------------------------
// //                  definitions

// function __compilerEval<T>(x: string) {
//     return {} as any;
// }

function comptime<T>(func: () => T): T {
    return func();
}

type CompilerAPI = {
    replaceWithCode<T = any>(code: string): T;
    replaceWithNode<T = any>(astNode: any): T;
    compileCode(code: string): string;
    extractComptimeCode_funcBody(astFuncBodyNode: any): string;
    printCode(astNode: any): string;
    parseCodePickExpression(code: string): any;
    unescapeText(text: string): string;
    // getTypeOf(symb: any): any;
    getTypeOfGeneric<T=any>(genericTypeInd: number): any;
    getTypeChecker(): any;
    getTransformContext(): any;
    visitEachChild(astNode: any, visitor: any): any;
    getTs(): any;
    getCurrentNode(): any;
    
    addListener(eventName: string, handler: any): any;
    removeListener(eventName: string, handler: any): any;
    emitEvent(eventName: string, ...args: any): any;

    globalStore(name: string): any;
};

function __compilerJob<A1=any,A2=any,A3=any,A4=any,A5=any>(func: ($compiler: CompilerAPI) => void) {
    return undefined!;
}

// // -----------------------------------------------

__compilerJob($compiler => {
    $compiler.addListener('cmd', (arg: any) => {
        const cmds = $compiler.globalStore('cmds');
        if (!cmds.list) cmds.list = [];
        cmds.list.push(arg);
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
    $compiler.emitEvent('cmd', '({ hello: "world" })');
});

__compilerJob($compiler => {
    const cmds = $compiler.globalStore('cmds');
    $compiler.replaceWithCode('[' + cmds.list.join(', ') + ']');
});