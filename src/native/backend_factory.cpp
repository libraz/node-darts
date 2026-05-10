#include "backend.h"

namespace node_darts {

// Defined in backend_darts.cpp / backend_clone.cpp respectively.
std::unique_ptr<BackendDict> MakeDartsBackend();
std::unique_ptr<BackendDict> MakeCloneBackend();

std::unique_ptr<BackendDict> MakeBackend(BackendKind kind) {
  switch (kind) {
    case BackendKind::Darts:
      return MakeDartsBackend();
    case BackendKind::Clone:
      return MakeCloneBackend();
  }
  return nullptr;
}

const char* BackendName(BackendKind kind) {
  switch (kind) {
    case BackendKind::Darts:
      return "darts";
    case BackendKind::Clone:
      return "clone";
  }
  return "unknown";
}

}  // namespace node_darts
