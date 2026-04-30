use std::hint::black_box;

const PAYLOAD: &str = include_str!("AriaRoles.json");

fn main() {
    for _n in 0..1000 {
        let value: serde_json::Value = serde_json::from_str(black_box(PAYLOAD)).unwrap();
        let serialized = serde_json::to_string(black_box(&value)).unwrap();
        black_box(serialized);
    }
}
