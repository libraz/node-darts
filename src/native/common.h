#ifndef DARTS_COMMON_H_
#define DARTS_COMMON_H_

// Shared declarations for the Node-API binding layer. Backend-agnostic: the
// concrete Darts implementations live behind the BackendDict interface
// declared in backend.h, and the handle table holds owning pointers to
// BackendDict instances.

#include <cstddef>
#include <cstdint>
#include <vector>

#include <napi.h>

#include "backend.h"

namespace node_darts {

// Global dictionary handle table. Owns the BackendDict pointers it stores.
extern std::vector<BackendDict*> g_dictionaries;

BackendDict* GetDictionaryFromHandle(uint32_t handle);

// Inserts `dict` (taking ownership) and returns its handle.
uint32_t AddDictionary(BackendDict* dict);

// Replaces the dict at `handle` with `dict` (taking ownership), deleting the
// previous occupant. Used by load() when auto-detect picks a different
// backend than the one allocated at createDictionary() time.
void ReplaceDictionary(uint32_t handle, BackendDict* dict);

void RemoveDictionary(uint32_t handle);

// Parses a backend argument from JS. Accepts undefined/null (returns
// default_kind), or string 'darts' / 'clone'. On parse error, throws a
// TypeError into env and returns false.
bool ParseBackendArg(const Napi::Env& env,
                      const Napi::Value& value,
                      BackendKind& out,
                      BackendKind default_kind = BackendKind::Darts);

}  // namespace node_darts

#endif  // DARTS_COMMON_H_
