use regex::Regex;

fn main() {
    // https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
    let re = Regex::new(r"^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$").unwrap();
    for _n in 1..1000000 {
        re.is_match("a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-@ladybird.org.a.b.c.d.e.f");
    }
}
