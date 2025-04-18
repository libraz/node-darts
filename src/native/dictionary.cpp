#include "dictionary.h"
#include <fstream>
#include <stdexcept>

namespace node_darts {

Napi::Value CreateDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    DartsDict* dict = new DartsDict();
    uint32_t handle = AddDictionary(dict);
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
      Napi::TypeError::New(env, "Arguments: (handle: number, filePath: string) expected").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string filePath = info[1].As<Napi::String>().Utf8Value();
    
    DartsDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    int result = dict->open(filePath.c_str());
    if (result != 0) {
      Napi::Error::New(env, "Failed to load dictionary").ThrowAsJavaScriptException();
      return Napi::Boolean::New(env, false);
    }
    
    return Napi::Boolean::New(env, true);
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value SaveDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
      Napi::TypeError::New(env, "Arguments: (handle: number, filePath: string) expected").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string filePath = info[1].As<Napi::String>().Utf8Value();
    
    DartsDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    int result = dict->save(filePath.c_str());
    if (result != 0) {
      Napi::Error::New(env, "Failed to save dictionary").ThrowAsJavaScriptException();
      return Napi::Boolean::New(env, false);
    }
    
    return Napi::Boolean::New(env, true);
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value ExactMatchSearch(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
      Napi::TypeError::New(env, "Arguments: (handle: number, key: string) expected").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string key = info[1].As<Napi::String>().Utf8Value();
    
    DartsDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    int result = dict->exactMatchSearch<int>(key.c_str());
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
      Napi::TypeError::New(env, "Arguments: (handle: number, key: string) expected").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string key = info[1].As<Napi::String>().Utf8Value();
    
    DartsDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // Allow storing up to 100 results
    const size_t MAX_RESULTS = 100;
    int results[MAX_RESULTS];
    
    size_t num_results = dict->commonPrefixSearch<int>(key.c_str(), results, MAX_RESULTS);
    
    Napi::Array result_array = Napi::Array::New(env, num_results);
    for (size_t i = 0; i < num_results; i++) {
      result_array[i] = Napi::Number::New(env, results[i]);
    }
    
    return result_array;
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value Traverse(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsString() || !info[2].IsFunction()) {
      Napi::TypeError::New(env, "Arguments: (handle: number, key: string, callback: function) expected").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    uint32_t handle = info[0].As<Napi::Number>().Uint32Value();
    std::string key = info[1].As<Napi::String>().Utf8Value();
    Napi::Function callback = info[2].As<Napi::Function>();
    
    DartsDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // Starting position for traversal
    size_t node_pos = 0;
    size_t key_pos = 0;
    bool continue_traverse = true;
    
    // Execute traversal for each character in the key
    while (key_pos < key.length() && continue_traverse) {
      int result = dict->traverse(key.c_str() + key_pos, node_pos, key_pos);
      
      // Create result object
      Napi::Object result_obj = Napi::Object::New(env);
      result_obj.Set("node", Napi::Number::New(env, static_cast<int>(node_pos)));
      result_obj.Set("key", Napi::Number::New(env, static_cast<int>(key_pos)));
      result_obj.Set("value", Napi::Number::New(env, result));
      
      // Call the callback function
      Napi::Value callback_result = callback.Call({result_obj});
      
      // Stop traversal if callback returns false
      if (callback_result.IsBoolean() && callback_result.As<Napi::Boolean>().Value() == false) {
        continue_traverse = false;
      }
      
      // Also stop if traversal fails
      if (result < 0) {
        continue_traverse = false;
      }
      
      // Move to the next character
      key_pos++;
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
    
    DartsDict* dict = GetDictionaryFromHandle(handle);
    if (!dict) {
      Napi::Error::New(env, "Invalid dictionary handle").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    size_t size = dict->size();
    return Napi::Number::New(env, static_cast<double>(size));
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

}  // namespace node_darts