// Include C standard library header files first
#include <stddef.h>
#include <stdint.h>

// C++ standard library header files
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

#include <napi.h>

#include "backend.h"
#include "builder.h"
#include "common.h"
#include "dictionary.h"

namespace node_darts {

// Global dictionary handle table. Owns the BackendDict pointers.
std::vector<BackendDict*> g_dictionaries;

BackendDict* GetDictionaryFromHandle(uint32_t handle) {
  if (handle < g_dictionaries.size()) {
    return g_dictionaries[handle];
  }
  return nullptr;
}

uint32_t AddDictionary(BackendDict* dict) {
  for (uint32_t i = 0; i < g_dictionaries.size(); i++) {
    if (g_dictionaries[i] == nullptr) {
      g_dictionaries[i] = dict;
      return i;
    }
  }
  g_dictionaries.push_back(dict);
  return static_cast<uint32_t>(g_dictionaries.size() - 1);
}

void ReplaceDictionary(uint32_t handle, BackendDict* dict) {
  if (handle >= g_dictionaries.size()) return;
  delete g_dictionaries[handle];
  g_dictionaries[handle] = dict;
}

void RemoveDictionary(uint32_t handle) {
  if (handle < g_dictionaries.size() && g_dictionaries[handle] != nullptr) {
    delete g_dictionaries[handle];
    g_dictionaries[handle] = nullptr;
  }
}

bool ParseBackendArg(const Napi::Env& env,
                      const Napi::Value& value,
                      BackendKind& out,
                      BackendKind default_kind) {
  if (value.IsUndefined() || value.IsNull()) {
    out = default_kind;
    return true;
  }
  if (!value.IsString()) {
    Napi::TypeError::New(env, "backend must be 'darts' or 'clone'")
        .ThrowAsJavaScriptException();
    return false;
  }
  const std::string s = value.As<Napi::String>().Utf8Value();
  if (s == "darts") {
    out = BackendKind::Darts;
    return true;
  }
  if (s == "clone") {
    out = BackendKind::Clone;
    return true;
  }
  Napi::TypeError::New(env, "backend must be 'darts' or 'clone'")
      .ThrowAsJavaScriptException();
  return false;
}

Napi::Value GetBackend(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
  BackendDict* dict = GetDictionaryFromHandle(handle);
  if (!dict) {
    Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::String::New(env, BackendName(dict->kind()));
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("createDictionary", Napi::Function::New(env, CreateDictionary));
  exports.Set("destroyDictionary", Napi::Function::New(env, DestroyDictionary));
  exports.Set("loadDictionary", Napi::Function::New(env, LoadDictionary));
  exports.Set("saveDictionary", Napi::Function::New(env, SaveDictionary));
  exports.Set("exactMatchSearch", Napi::Function::New(env, ExactMatchSearch));
  exports.Set("commonPrefixSearch", Napi::Function::New(env, CommonPrefixSearch));
  exports.Set("traverse", Napi::Function::New(env, Traverse));
  exports.Set("size", Napi::Function::New(env, Size));
  exports.Set("getBackend", Napi::Function::New(env, GetBackend));
  exports.Set("build", Napi::Function::New(env, Build));
  return exports;
}

NODE_API_MODULE(node_darts, Init)

}  // namespace node_darts
