#ifndef NODE_DARTS_BACKEND_H_
#define NODE_DARTS_BACKEND_H_

// Backend abstraction over the two vendored Darts implementations.
//
//   BackendKind::Darts  -> taku910/darts          (third_party/darts)
//   BackendKind::Clone  -> s-yata/darts-clone     (third_party/darts-clone)
//
// Both upstreams declare `class Darts::DoubleArray` in the same namespace, so
// they cannot share a translation unit. backend_clone.cpp uses
// `#define Darts DartsClone` before including the clone header to side-step
// ODR collision; backend_darts.cpp includes the original header unmodified.
//
// Higher layers (dictionary.cpp / builder.cpp / bindings.cpp) only see this
// interface and never touch the concrete types.

#include <cstddef>
#include <cstdint>
#include <memory>

namespace node_darts {

enum class BackendKind {
  Darts = 0,  // taku910/darts (default; original on-disk format)
  Clone = 1,  // s-yata/darts-clone
};

class BackendDict {
 public:
  virtual ~BackendDict() = default;

  virtual BackendKind kind() const = 0;

  // Returns 0 on success, non-zero otherwise. Mirrors the upstream contract.
  virtual int Open(const char* file_path) = 0;
  virtual int Save(const char* file_path) = 0;

  // `lengths` may be nullptr to indicate strlen-terminated keys.
  // `values` may be nullptr to use sequential indices.
  virtual int Build(std::size_t num_keys,
                    const char* const* keys,
                    const std::size_t* lengths,
                    const int* values) = 0;

  // Returns the matched value, or -1 if no exact match.
  virtual int ExactMatchSearch(const char* key, std::size_t length) const = 0;

  // Writes up to `capacity` matches into `results`; returns count actually
  // written (clamped to `capacity`).
  virtual std::size_t CommonPrefixSearch(const char* key,
                                          std::size_t length,
                                          int* results,
                                          std::size_t capacity) const = 0;

  // Advances `node_pos` and `key_pos` by exactly one character along the trie
  // path starting from the given positions. Returns -2 when no further trie
  // edge exists, -1 when the current node is not a terminal (no value), or the
  // matched value otherwise. Mirrors Darts::DoubleArray::traverse() with
  // length = key_pos + 1.
  virtual int TraverseOne(const char* key,
                          std::size_t key_len,
                          std::size_t& node_pos,
                          std::size_t& key_pos) = 0;

  virtual std::size_t Size() const = 0;
};

// Returns nullptr on unknown kind.
std::unique_ptr<BackendDict> MakeBackend(BackendKind kind);

const char* BackendName(BackendKind kind);

}  // namespace node_darts

#endif  // NODE_DARTS_BACKEND_H_
