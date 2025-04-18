#ifndef DARTS_BUILDER_H_
#define DARTS_BUILDER_H_

// Include standard library header files first
#include <cstdint>
#include <cstddef>

#include <napi.h>
#include "common.h"

namespace node_darts {

Napi::Value Build(const Napi::CallbackInfo& info);

}  // namespace node_darts

#endif  // DARTS_BUILDER_H_