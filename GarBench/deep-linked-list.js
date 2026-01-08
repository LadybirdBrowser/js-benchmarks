// Deep Linked List - Tests marking depth with long reference chains

function createDeepList(depth) {
    let head = { value: 0, next: null };
    let current = head;
    for (let i = 1; i < depth; i++) {
        current.next = { value: i, next: null };
        current = current.next;
    }
    return head;
}

function walkList(head) {
    let sum = 0;
    let current = head;
    while (current) {
        sum += current.value;
        current = current.next;
    }
    return sum;
}

const lists = [];
const listDepth = 200000;
const numLists = 40;

for (let i = 0; i < numLists; i++) {
    lists.push(createDeepList(listDepth));
}

let total = 0;
for (const list of lists) {
    total += walkList(list);
}

gc();
