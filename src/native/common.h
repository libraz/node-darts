#ifndef DARTS_COMMON_H_
#define DARTS_COMMON_H_

// Standard library
#include <cstdint>
#include <cstddef>
#include <vector>
#include <string>

#include <napi.h>

// Choose the Darts backend at build time.
//
//   default        : taku910/darts (vendored at third_party/darts)
//   USE_DARTS_CLONE: s-yata/darts-clone (vendored at third_party/darts-clone)
//
// The on-disk dictionary formats are NOT compatible between the two backends.
// Both expose the same public API on Darts::DoubleArray (build, open, save,
// exactMatchSearch<T>, commonPrefixSearch<T>, traverse, size), so the binding
// code below does not need backend-specific branches.
#if defined(USE_DARTS_CLONE)
#  include "third_party/darts-clone/include/darts.h"
#else
#  include "third_party/darts/darts.h"
#endif

// Backend-agnostic alias used throughout the binding.
typedef Darts::DoubleArray DartsDict;

namespace node_darts {

// Global dictionary handle table.
extern std::vector<DartsDict*> g_dictionaries;

// Utility helpers for handle <-> DartsDict* mapping.
DartsDict* GetDictionaryFromHandle(uint32_t handle);
uint32_t AddDictionary(DartsDict* dict);
void RemoveDictionary(uint32_t handle);

}  // namespace node_darts

#endif  // DARTS_COMMON_H_
