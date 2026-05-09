#include "builder.h"
#include <vector>
#include <string>
#include <algorithm>
#include <stdexcept>

namespace node_darts {

Napi::Value Build(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    if (info.Length() < 1 || !info[0].IsArray()) {
      Napi::TypeError::New(env, "First argument must be an array of keys").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    Napi::Array keys_array = info[0].As<Napi::Array>();
    const uint32_t input_len = keys_array.Length();

    if (input_len == 0) {
      Napi::Error::New(env, "Empty keys array").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Validate values length BEFORE we read keys, so a length mismatch is
    // reported regardless of duplicates.
    const bool has_values = info.Length() >= 2 && info[1].IsArray();
    Napi::Array values_array;
    if (has_values) {
      values_array = info[1].As<Napi::Array>();
      if (values_array.Length() != input_len) {
        Napi::Error::New(env, "Values array length must match keys array length").ThrowAsJavaScriptException();
        return env.Null();
      }
    }

    // Read keys and (optionally) values into paired vector so sort+dedup keep
    // them aligned. Without pairing, std::sort on keys silently desynchronises
    // the values when input is unsorted.
    std::vector<std::pair<std::string, int>> pairs;
    pairs.reserve(input_len);

    for (uint32_t i = 0; i < input_len; i++) {
      Napi::Value key_val = keys_array[i];
      if (!key_val.IsString()) {
        Napi::TypeError::New(env, "All keys must be strings").ThrowAsJavaScriptException();
        return env.Null();
      }
      int v = static_cast<int>(i);
      if (has_values) {
        Napi::Value value_val = values_array[i];
        if (!value_val.IsNumber()) {
          Napi::TypeError::New(env, "All values must be numbers").ThrowAsJavaScriptException();
          return env.Null();
        }
        v = value_val.As<Napi::Number>().Int32Value();
      }
      pairs.emplace_back(key_val.As<Napi::String>().Utf8Value(), v);
    }

    // Stable-sort by key so duplicate-key dedup keeps the first occurrence.
    std::stable_sort(pairs.begin(), pairs.end(),
                     [](const std::pair<std::string, int>& a,
                        const std::pair<std::string, int>& b) {
                       return a.first < b.first;
                     });

    // Dedup by key (drop later duplicates, keep first value for that key).
    auto last = std::unique(pairs.begin(), pairs.end(),
                            [](const std::pair<std::string, int>& a,
                               const std::pair<std::string, int>& b) {
                              return a.first == b.first;
                            });
    pairs.erase(last, pairs.end());

    const uint32_t num_keys = static_cast<uint32_t>(pairs.size());

    std::vector<std::string> keys;
    std::vector<const char*> key_ptrs;
    std::vector<int> values;
    keys.reserve(num_keys);
    key_ptrs.reserve(num_keys);
    values.reserve(num_keys);

    for (const auto& p : pairs) {
      keys.push_back(p.first);
      values.push_back(p.second);
    }
    for (const auto& key : keys) {
      key_ptrs.push_back(key.c_str());
    }

    // Build the Double-Array
    DartsDict* dict = new DartsDict();
    int result = dict->build(num_keys, key_ptrs.data(), nullptr, values.data());

    if (result != 0) {
      delete dict;
      Napi::Error::New(env, "Failed to build dictionary").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Return the handle
    uint32_t handle = AddDictionary(dict);
    return Napi::Number::New(env, handle);
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

}  // namespace node_darts