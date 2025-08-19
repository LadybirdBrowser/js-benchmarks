use base64::{engine::general_purpose::STANDARD, Engine as _};

fn main() {
    for _n in 1..1000000 {
        let encoded = STANDARD.encode(b"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
        let _ = STANDARD.decode(encoded);
    }
}
