#ifndef DARTS_DICTIONARY_H_
#define DARTS_DICTIONARY_H_

// Include standard library header files first
#include <cstdint>
#include <cstddef>

#include <napi.h>
#include "common.h"

namespace node_darts {

Napi::Value CreateDictionary(const Napi::CallbackInfo& info);
Napi::Value DestroyDictionary(const Napi::CallbackInfo& info);
Napi::Value LoadDictionary(const Napi::CallbackInfo& info);
Napi::Value SaveDictionary(const Napi::CallbackInfo& info);
Napi::Value ExactMatchSearch(const Napi::CallbackInfo& info);
Napi::Value CommonPrefixSearch(const Napi::CallbackInfo& info);
Napi::Value Traverse(const Napi::CallbackInfo& info);
Napi::Value Size(const Napi::CallbackInfo& info);

}  // namespace node_darts

#endif  // DARTS_DICTIONARY_H_