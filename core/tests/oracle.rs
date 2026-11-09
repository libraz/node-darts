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
                let matches = dict.common_prefix_search(&query);
                let prefix: Vec<i64> = matches.iter().map(|&(v, _)| i64::from(v)).collect();
                assert_eq!(prefix, ints(&case["prefix"][i]), "{ctx}: prefix");
                for &(value, len) in &matches {
                    assert!(len > 0 && len <= query.len(), "{ctx}: length {len}");
                    assert_eq!(
                        dict.exact_match_search(&query[..len]),
                        value,
                        "{ctx}: exact of prefix length {len}"
                    );
                }
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
        // Documented divergence: upstream Darts accepted any byte string, so
        // its recorded acceptance of the non-dictionary blobs as a darts
        // image no longer holds; every real dictionary image is unchanged.
        let upstream_ok = load["ok"].as_bool().unwrap();
        let expected_ok = upstream_ok && !(file.starts_with("blob_") && load["kind"] == "darts");
        assert_eq!(result.is_ok(), expected_ok, "{ctx}: accepted");
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

const NONE: [(i32, usize); 0] = [];

fn built(backend: Backend, keys: &[&[u8]]) -> Dictionary {
    Dictionary::build(backend, keys, None).unwrap()
}

fn traversed(dict: &Dictionary, key: &[u8]) -> Vec<(i32, usize)> {
    let mut steps = Vec::new();
    dict.traverse(key, |s| {
        steps.push((s.value, s.key_pos));
        true
    });
    steps
}

#[test]
fn nul_in_search_input() {
    for b in [Backend::Darts, Backend::Clone] {
        let dict = built(b, &[b"a", b"ab"]);
        assert_eq!(dict.exact_match_search(b"a\0"), -1, "{b:?}");
        assert_eq!(dict.exact_match_search(b"a\0b"), -1, "{b:?}");
        assert_eq!(dict.exact_match_search(b"\0"), -1, "{b:?}");
        assert_eq!(dict.common_prefix_search(b"a\0b"), [(0, 1)], "{b:?}");
        assert_eq!(
            dict.common_prefix_search(b"ab\0zz"),
            dict.common_prefix_search(b"ab"),
            "{b:?}"
        );
        assert_eq!(dict.common_prefix_search(b"\0a"), NONE, "{b:?}");
        assert_eq!(traversed(&dict, b"ab\0b"), traversed(&dict, b"ab"), "{b:?}");
        assert_eq!(traversed(&dict, b"ab\0b").len(), 2, "{b:?}");
        assert_eq!(traversed(&dict, b"\0ab"), NONE, "{b:?}");
    }
}

#[test]
fn darts_load_rejections() {
    let good = built(Backend::Darts, &[b"a"]).to_bytes().unwrap();
    assert!(Dictionary::load(&good, Some(Backend::Darts)).is_ok());
    assert!(Dictionary::load(&[], Some(Backend::Darts)).is_err());
    assert!(Dictionary::load(&[], None).is_err());
    assert!(Dictionary::load(&good[..good.len() - 4], Some(Backend::Darts)).is_err());
    assert!(Dictionary::load(&good[..7], Some(Backend::Darts)).is_err());
    let mut bad_base = good.clone();
    bad_base[0] = 2;
    assert!(Dictionary::load(&bad_base, Some(Backend::Darts)).is_err());
    assert!(Dictionary::load(&[0; 2048], Some(Backend::Darts)).is_err());
    assert!(Dictionary::load(b"not a dictionary", None).is_err());
}

#[test]
fn empty_key_only_found_by_exact() {
    let dict = built(Backend::Darts, &[b"", b"a"]);
    assert_eq!(dict.exact_match_search(b""), 0);
    assert_eq!(dict.exact_match_search(b"a"), 1);
    assert_eq!(dict.common_prefix_search(b"a"), [(1, 1)]);
    assert_eq!(dict.common_prefix_search(b"b"), NONE);
    assert_eq!(dict.common_prefix_search(b""), NONE);
    assert_eq!(traversed(&dict, b"a"), [(1, 1)]);
    assert_eq!(traversed(&dict, b""), NONE);
    let only_empty = built(Backend::Darts, &[b""]);
    assert_eq!(only_empty.exact_match_search(b""), 0);
    assert_eq!(only_empty.common_prefix_search(b"a"), NONE);
    assert!(
        Dictionary::build(Backend::Clone, &[b""], None).is_err(),
        "clone rejects zero-length keys"
    );
}
