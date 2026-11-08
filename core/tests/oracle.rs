//! Compares both backends against output recorded from the upstream C++
//! libraries: saved images byte for byte, and every search result.

use std::path::{Path, PathBuf};

use darts_core::dict::{Backend, Dictionary, Step};
use serde_json::Value;

fn fixtures() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/oracle")
}

fn manifest() -> Value {
    let text = std::fs::read_to_string(fixtures().join("manifest.json")).unwrap();
    serde_json::from_str(&text).unwrap()
}

fn bytes(v: &Value) -> Vec<u8> {
    v.as_array()
        .unwrap()
        .iter()
        .map(|b| b.as_u64().unwrap() as u8)
        .collect()
}

fn ints(v: &Value) -> Vec<i64> {
    v.as_array()
        .unwrap()
        .iter()
        .map(|n| n.as_i64().unwrap())
        .collect()
}

fn backend(name: &str) -> Backend {
    match name {
        "darts" => Backend::Darts,
        "clone" => Backend::Clone,
        other => panic!("unknown backend {other}"),
    }
}

fn check_backend(wanted: &str) {
    let manifest = manifest();
    let cases = manifest["cases"].as_array().unwrap();
    let mut checked = 0;
    for case in cases.iter().filter(|c| c["backend"] == wanted) {
        let name = case["name"].as_str().unwrap();
        let keys: Vec<Vec<u8>> = case["keys"].as_array().unwrap().iter().map(bytes).collect();
        let key_refs: Vec<&[u8]> = keys.iter().map(Vec::as_slice).collect();
        let values: Option<Vec<i32>> = case["values"]
            .as_array()
            .map(|v| v.iter().map(|n| n.as_i64().unwrap() as i32).collect());

        let built = Dictionary::build(backend(wanted), &key_refs, values.as_deref())
            .unwrap_or_else(|e| panic!("{name}: build failed: {e:?}"));
        let expected_image =
            std::fs::read(fixtures().join(case["file"].as_str().unwrap())).unwrap();
        assert_eq!(
            built.size() as u64,
            case["size"].as_u64().unwrap(),
            "{name}: size"
        );
        assert!(
            built.to_bytes().unwrap() == expected_image,
            "{name}: saved image differs"
        );

        let loaded = Dictionary::load(&expected_image, Some(backend(wanted))).unwrap();
        for dict in [&built, &loaded] {
            for (i, query) in case["queries"].as_array().unwrap().iter().enumerate() {
                let query = bytes(query);
                let ctx = format!("{name}: query #{i} {:?}", String::from_utf8_lossy(&query));
                assert_eq!(
                    i64::from(dict.exact_match_search(&query)),
                    case["exact"][i].as_i64().unwrap(),
                    "{ctx}: exact"
                );
                let prefix: Vec<i64> = dict
                    .common_prefix_search(&query)
                    .into_iter()
                    .map(i64::from)
                    .collect();
                assert_eq!(prefix, ints(&case["prefix"][i]), "{ctx}: prefix");
                let mut steps = Vec::new();
                dict.traverse(
                    &query,
                    |Step {
                         value,
                         node_pos,
                         key_pos,
                     }| {
                        steps.push(vec![node_pos as i64, key_pos as i64, i64::from(value)]);
                        true
                    },
                );
                let expected: Vec<Vec<i64>> = case["traverse"][i]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(ints)
                    .collect();
                assert_eq!(steps, expected, "{ctx}: traverse");
            }
        }
        checked += 1;
    }
    assert!(checked > 10, "only {checked} cases for {wanted}");
}

#[test]
fn darts_backend_matches_upstream() {
    check_backend("darts");
}

#[test]
fn clone_backend_matches_upstream() {
    check_backend("clone");
}

#[test]
fn load_detection_matches_upstream() {
    let manifest = manifest();
    for load in manifest["loads"].as_array().unwrap() {
        let file = load["blob"].as_str().unwrap();
        let image = std::fs::read(fixtures().join(file)).unwrap();
        let requested = load["backend"].as_str().map(backend);
        let result = Dictionary::load(&image, requested);
        let ctx = format!("{file} with {requested:?}");
        assert_eq!(
            result.is_ok(),
            load["ok"].as_bool().unwrap(),
            "{ctx}: accepted"
        );
        if let Ok(dict) = result {
            assert_eq!(
                dict.backend(),
                backend(load["kind"].as_str().unwrap()),
                "{ctx}: kind"
            );
            assert_eq!(
                dict.size() as u64,
                load["size"].as_u64().unwrap(),
                "{ctx}: size"
            );
            // Arbitrary images must answer without panicking.
            for query in [&b""[..], b"a", b"abc", b"\xff\xfe"] {
                let _ = dict.exact_match_search(query);
                let _ = dict.common_prefix_search(query);
                dict.traverse(query, |_| true);
            }
        }
    }
}
