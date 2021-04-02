export function overloadOf<ThisType, Method extends keyof ThisType, BaseType extends { [name in Method]: ThisType[Method]}>() {
    return ((target: any, key: any, value: any) => {}) as any;
}

if (false) {
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
}