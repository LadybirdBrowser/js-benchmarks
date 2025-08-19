use sha2::{Sha512, Digest};

fn main() {
    for _n in 1..1000000 {
        Sha512::digest(b"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
    }
}
