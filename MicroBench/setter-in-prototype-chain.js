var setterCalls = 0;

let o = {};
o.__proto__ = {};
o.__proto__.__proto__ = {};
o.__proto__.__proto__.__proto__ = {
    set go(v) {
        setterCalls += v;
    },
};
function moo(o) {
    for (let i = 0; i < 50_000_000; ++i) {
        o.go = 1;
    }
}
moo(o);

console.log(setterCalls);
