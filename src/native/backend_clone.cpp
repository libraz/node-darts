// Wrapper for the s-yata/darts-clone backend.
//
// darts-clone declares `class Darts::DoubleArray` in the same namespace as
// taku910/darts, so linking both into one .node hits ODR violations on the
// shared `Darts::Details::*` symbols. We rename the upstream namespace
// translation-unit-locally via the preprocessor and keep the rename active
// for the entire TU so that template instantiations (which expand
// DARTS_THROW -> Darts::Details::Exception) still see the renamed namespace.
//
// The vendored header at src/native/third_party/darts-clone/include/darts.h
// is unmodified; only this TU sees `Darts` as `DartsClone`.

// Include system headers BEFORE the rename so std:: is unaffected and so any
// `<Darts...>` mention inside system headers (none expected, but defensive)
// would not collide.
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <exception>
#include <memory>
#include <new>
#include <string>
#include <vector>

#define Darts DartsClone
#include "third_party/darts-clone/include/darts.h"
// Rename stays active for the rest of this TU (see header comment).

#include "backend.h"

namespace node_darts {

namespace {

class CloneBackend : public BackendDict {
 public:
  BackendKind kind() const override { return BackendKind::Clone; }

  int Open(const char* file_path) override { return array_.open(file_path); }
  int Save(const char* file_path) override { return array_.save(file_path); }

  int Build(std::size_t num_keys,
            const char* const* keys,
            const std::size_t* lengths,
            const int* values) override {
    return array_.build(num_keys, keys, lengths, values);
  }

  int ExactMatchSearch(const char* key, std::size_t length) const override {
    return array_.exactMatchSearch<int>(key, length);
  }

  std::size_t CommonPrefixSearch(const char* key,
                                  std::size_t length,
                                  int* results,
                                  std::size_t capacity) const override {
    std::size_t found = array_.commonPrefixSearch<int>(key, results, capacity, length);
    return found < capacity ? found : capacity;
  }

  int TraverseOne(const char* key,
                  std::size_t /*key_len*/,
                  std::size_t& node_pos,
                  std::size_t& key_pos) override {
    return array_.traverse(key, node_pos, key_pos, key_pos + 1);
  }

  std::size_t Size() const override { return array_.size(); }

 private:
  DartsClone::DoubleArray array_;
};

}  // namespace

std::unique_ptr<BackendDict> MakeCloneBackend() {
  return std::unique_ptr<BackendDict>(new CloneBackend());
}

}  // namespace node_darts
