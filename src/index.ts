// import { overload } from 'ts-transformer-overload';

// declare const console: { log: any };

// class A {
//     foo() {
//         return 10;
//     }
// }

// class B extends A {
//     @overload()
//     foo() {
//         return 20;
//     }
// }

// const b = new B();

// function magic(x: string) {
//     return {} as any;
// }

function compileTimeEval<T>(x: string) {
    return {} as any;
}

function comptime<T>(func: () => T): T {
    return func();
}

function comptimeStructs() {
    type Variants = 'a' | 'b' | 'c' | 'e';

    compileTimeEval<Variants>(`
        let out = '';
        $eachOfStrUnion(x => out += x + ': 0, ');
        return 'const Struct = {' + out + '}';
    `);
}

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