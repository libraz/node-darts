#include "backend.h"
#include "third_party/darts/darts.h"

namespace node_darts {

namespace {

class DartsBackend : public BackendDict {
 public:
  BackendKind kind() const override { return BackendKind::Darts; }

  int Open(const char* file_path) override { return array_.open(file_path); }
  int Save(const char* file_path) override { return array_.save(file_path); }

  int Build(std::size_t num_keys,
            const char* const* keys,
            const std::size_t* lengths,
            const int* values) override {
    // taku910's build takes `const char**` and `int*` (non-const outer
    // pointers). Cast away constness; build() does not mutate either.
    return array_.build(num_keys,
                        const_cast<const char**>(keys),
                        const_cast<std::size_t*>(lengths),
                        const_cast<int*>(values));
  }

  int ExactMatchSearch(const char* key, std::size_t length) const override {
    return const_cast<Darts::DoubleArray&>(array_).exactMatchSearch<int>(key, length);
  }

  std::size_t CommonPrefixSearch(const char* key,
                                  std::size_t length,
                                  int* results,
                                  std::size_t capacity) const override {
    std::size_t found = const_cast<Darts::DoubleArray&>(array_)
        .commonPrefixSearch<int>(key, results, capacity, length);
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
  Darts::DoubleArray array_;
};

}  // namespace

std::unique_ptr<BackendDict> MakeDartsBackend() {
  return std::unique_ptr<BackendDict>(new DartsBackend());
}

}  // namespace node_darts
