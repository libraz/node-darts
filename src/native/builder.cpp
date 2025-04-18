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
    uint32_t num_keys = keys_array.Length();
    
    if (num_keys == 0) {
      Napi::Error::New(env, "Empty keys array").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // Create an array of keys
    std::vector<std::string> keys;
    keys.reserve(num_keys);
    
    for (uint32_t i = 0; i < num_keys; i++) {
      Napi::Value key_val = keys_array[i];
      if (!key_val.IsString()) {
        Napi::TypeError::New(env, "All keys must be strings").ThrowAsJavaScriptException();
        return env.Null();
      }
      keys.push_back(key_val.As<Napi::String>().Utf8Value());
    }
    
    // Sort the keys
    std::sort(keys.begin(), keys.end());
    
    // Remove duplicates
    auto last = std::unique(keys.begin(), keys.end());
    keys.erase(last, keys.end());
    
    // Actual number of keys to use
    num_keys = static_cast<uint32_t>(keys.size());
    
    // Create an array of key pointers
    std::vector<const char*> key_ptrs;
    key_ptrs.reserve(num_keys);
    
    for (const auto& key : keys) {
      key_ptrs.push_back(key.c_str());
    }
    
    // Create an array of values
    std::vector<int> values;
    
    if (info.Length() >= 2 && info[1].IsArray()) {
      Napi::Array values_array = info[1].As<Napi::Array>();
      
      if (values_array.Length() != num_keys) {
        Napi::Error::New(env, "Values array length must match keys array length").ThrowAsJavaScriptException();
        return env.Null();
      }
      
      values.reserve(num_keys);
      
      for (uint32_t i = 0; i < num_keys; i++) {
        Napi::Value value_val = values_array[i];
        if (!value_val.IsNumber()) {
          Napi::TypeError::New(env, "All values must be numbers").ThrowAsJavaScriptException();
          return env.Null();
        }
        values.push_back(value_val.As<Napi::Number>().Int32Value());
      }
    } else {
      // If no values are specified, use indices as values
      values.resize(num_keys);
      for (uint32_t i = 0; i < num_keys; i++) {
        values[i] = i;
      }
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