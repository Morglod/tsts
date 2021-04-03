# tsts/overloadOf

Compile time overload type assertion on pure typescript

```ts
import { overloadOf } from 'src/overloadOf';

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