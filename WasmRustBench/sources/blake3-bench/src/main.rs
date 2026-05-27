use std::hint::black_box;

const INPUT: &[u8] = &[0x42; 4096];

fn main() {
    for _n in 0..200_000 {
        let hash = blake3::hash(black_box(INPUT));
        black_box(hash);
    }
}
