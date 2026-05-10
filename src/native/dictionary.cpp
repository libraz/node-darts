#include "dictionary.h"

#include <stdexcept>
#include <vector>

#include "backend.h"
#include "common.h"

namespace node_darts {

Napi::Value CreateDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  try {
    BackendKind kind = BackendKind::Darts;
    if (info.Length() >= 1) {
      if (!ParseBackendArg(env, info[0], kind, BackendKind::Darts)) {
        return env.Null();
      }
    }
    auto dict = MakeBackend(kind);
    if (!dict) {
      Napi::Error::New(env, "Failed to allocate backend").ThrowAsJavaScriptException();
      return env.Null();
    }
    uint32_t handle = AddDictionary(dict.release());
    return Napi::Number::New(env, handle);
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value DestroyDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 1 || !info[0].IsNumber()) {
      Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
      return env.Null();
    }
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    RemoveDictionary(handle);
    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value LoadDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
      Napi::TypeError::New(env,
          "Arguments: (handle: number, filePath: string, backend?: string) expected")
          .ThrowAsJavaScriptException();
      return env.Null();
    }

    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string filePath = info[1].As<Napi::String>().Utf8Value();

    BackendDict* current = GetDictionaryFromHandle(handle);
    if (!current) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }

    const bool has_backend_arg = info.Length() >= 3 && !info[2].IsUndefined() && !info[2].IsNull();

    if (has_backend_arg) {
      BackendKind kind = BackendKind::Darts;
      if (!ParseBackendArg(env, info[2], kind, BackendKind::Darts)) {
        return env.Null();
      }
      auto next = MakeBackend(kind);
      if (!next || next->Open(filePath.c_str()) != 0) {
        return Napi::Boolean::New(env, false);
      }
      ReplaceDictionary(handle, next.release());
      return Napi::Boolean::New(env, true);
    }

    // Auto-detect: probe darts-clone first because it validates the on-disk
    // format strictly (taku910 may accept malformed files and crash later).
    auto probe_clone = MakeBackend(BackendKind::Clone);
    if (probe_clone && probe_clone->Open(filePath.c_str()) == 0) {
      ReplaceDictionary(handle, probe_clone.release());
      return Napi::Boolean::New(env, true);
    }
    auto probe_darts = MakeBackend(BackendKind::Darts);
    if (probe_darts && probe_darts->Open(filePath.c_str()) == 0) {
      ReplaceDictionary(handle, probe_darts.release());
      return Napi::Boolean::New(env, true);
    }
    return Napi::Boolean::New(env, false);
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value SaveDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
      Napi::TypeError::New(env, "Arguments: (handle: number, filePath: string) expected")
          .ThrowAsJavaScriptException();
      return env.Null();
    }
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string filePath = info[1].As<Napi::String>().Utf8Value();

    BackendDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }

    int result = dict->Save(filePath.c_str());
    return Napi::Boolean::New(env, result == 0);
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value ExactMatchSearch(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
      Napi::TypeError::New(env, "Arguments: (handle: number, key: string) expected")
          .ThrowAsJavaScriptException();
      return env.Null();
    }
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string key = info[1].As<Napi::String>().Utf8Value();

    BackendDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }

    int result = dict->ExactMatchSearch(key.c_str(), key.length());
    return Napi::Number::New(env, result);
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value CommonPrefixSearch(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
      Napi::TypeError::New(env, "Arguments: (handle: number, key: string) expected")
          .ThrowAsJavaScriptException();
      return env.Null();
    }
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string key = info[1].As<Napi::String>().Utf8Value();

    BackendDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Common-prefix matches are bounded by the key length plus one terminal
    // node. CommonPrefixSearch clamps the returned count to capacity.
    const std::size_t capacity = key.length() + 1;
    std::vector<int> results(capacity);
    std::size_t num = dict->CommonPrefixSearch(key.c_str(), key.length(), results.data(), capacity);

    Napi::Array out = Napi::Array::New(env, num);
    for (std::size_t i = 0; i < num; i++) {
      out[i] = Napi::Number::New(env, results[i]);
    }
    return out;
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value Traverse(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsString() || !info[2].IsFunction()) {
      Napi::TypeError::New(env,
          "Arguments: (handle: number, key: string, callback: function) expected")
          .ThrowAsJavaScriptException();
      return env.Null();
    }

    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string key = info[1].As<Napi::String>().Utf8Value();
    Napi::Function callback = info[2].As<Napi::Function>();

    BackendDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }

    std::size_t node_pos = 0;
    std::size_t key_pos = 0;
    bool continue_traverse = true;
    const std::size_t key_len = key.length();

    // Advance one character per call; the JS callback fires once per character.
    while (key_pos < key_len && continue_traverse) {
      const std::size_t prev_key_pos = key_pos;
      int result = dict->TraverseOne(key.c_str(), key_len, node_pos, key_pos);

      Napi::Object result_obj = Napi::Object::New(env);
      result_obj.Set("node", Napi::Number::New(env, static_cast<double>(node_pos)));
      result_obj.Set("key", Napi::Number::New(env, static_cast<double>(key_pos)));
      result_obj.Set("value", Napi::Number::New(env, result));

      Napi::Value cb_result = callback.Call({result_obj});
      if (cb_result.IsBoolean() && cb_result.As<Napi::Boolean>().Value() == false) {
        continue_traverse = false;
      }

      // Stop if no further trie path exists. Both backends return -2 when the
      // next character is not present, leaving key_pos unchanged.
      if (result == -2 || key_pos == prev_key_pos) {
        break;
      }
    }

    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value Size(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  try {
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
    return Napi::Number::New(env, static_cast<double>(dict->Size()));
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

}  // namespace node_darts
