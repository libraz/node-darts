// Include C standard library header files first
#include <stdint.h>
#include <stddef.h>

// C++ standard library header files
#include <cstdint>
#include <cstddef>
#include <vector>
#include <string>

#include <napi.h>
#include "dictionary.h"
#include "builder.h"

namespace node_darts {

// Definition of global variables
std::vector<DartsDict*> g_dictionaries;

// Implementation of utility functions
DartsDict* GetDictionaryFromHandle(uint32_t handle) {
  if (handle < g_dictionaries.size() && g_dictionaries[handle] != nullptr) {
    return g_dictionaries[handle];
  }
  return nullptr;
}

uint32_t AddDictionary(DartsDict* dict) {
  // Find an empty slot
  for (uint32_t i = 0; i < g_dictionaries.size(); i++) {
    if (g_dictionaries[i] == nullptr) {
      g_dictionaries[i] = dict;
      return i;
    }
  }
  
  // Add a new one if no empty slot is found
  g_dictionaries.push_back(dict);
  return static_cast<uint32_t>(g_dictionaries.size() - 1);
}

void RemoveDictionary(uint32_t handle) {
  if (handle < g_dictionaries.size() && g_dictionaries[handle] != nullptr) {
    delete g_dictionaries[handle];
    g_dictionaries[handle] = nullptr;
  }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // Dictionary related
  exports.Set("createDictionary", Napi::Function::New(env, CreateDictionary));
  exports.Set("destroyDictionary", Napi::Function::New(env, DestroyDictionary));
  exports.Set("loadDictionary", Napi::Function::New(env, LoadDictionary));
  exports.Set("saveDictionary", Napi::Function::New(env, SaveDictionary));
  exports.Set("exactMatchSearch", Napi::Function::New(env, ExactMatchSearch));
  exports.Set("commonPrefixSearch", Napi::Function::New(env, CommonPrefixSearch));
  exports.Set("traverse", Napi::Function::New(env, Traverse));
  exports.Set("size", Napi::Function::New(env, Size));
  
  // Builder related
  exports.Set("build", Napi::Function::New(env, Build));
  
  return exports;
}

NODE_API_MODULE(node_darts, Init)

}  // namespace node_darts