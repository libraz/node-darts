# Rust core (core/) compiled to WebAssembly + TypeScript package (src/).

.PHONY: build wasm test test-rust test-js format format-check lint clean

build:
	yarn build

wasm:
	yarn build:wasm

test: test-rust test-js

test-rust:
	cargo test --locked

# The JS suite runs once per backend; it needs src/generated from `make wasm`.
test-js:
	NODE_DARTS_TEST_BACKEND=clone yarn test
	NODE_DARTS_TEST_BACKEND=darts yarn test

format:
	cargo fmt --all
	yarn check:fix
	$(MAKE) lint

format-check:
	cargo fmt --all -- --check
	$(MAKE) lint

lint:
	cargo clippy --locked --all-targets -- -D warnings
	cargo clippy --locked --target wasm32-unknown-unknown -- -D warnings
	yarn check
	yarn typecheck

clean:
	yarn clean
	cargo clean
	rm -rf src/generated
