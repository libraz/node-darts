#ifndef DARTS_COMMON_H_
#define DARTS_COMMON_H_

// Include standard library header files first
#include <cstdint>
#include <cstddef>
#include <vector>
#include <string>

#include <napi.h>
// C++17互換性のために修正されたdarts.hを使用
#include "third_party/darts/darts.h"

// Dartsのエイリアス定義
typedef Darts::DoubleArray DartsDict;

// node_darts名前空間
namespace node_darts {

// ハンドル管理のためのグローバル変数
extern std::vector<DartsDict*> g_dictionaries;

// ユーティリティ関数
DartsDict* GetDictionaryFromHandle(uint32_t handle);
uint32_t AddDictionary(DartsDict* dict);
void RemoveDictionary(uint32_t handle);

} // namespace node_darts

#endif // DARTS_COMMON_H_