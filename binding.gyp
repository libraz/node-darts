{
  "targets": [
    {
      "target_name": "node_darts",
      "sources": [
        "src/native/bindings.cpp",
        "src/native/dictionary.cpp",
        "src/native/builder.cpp",
        "src/native/third_party/darts/darts.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "include",
        "src/native",
        "/Library/Developer/CommandLineTools/SDKs/MacOSX14.5.sdk/usr/include/c++/v1"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }],
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "OTHER_CPLUSPLUSFLAGS": [
              "-isystem", "/Library/Developer/CommandLineTools/SDKs/MacOSX14.5.sdk/usr/include/c++/v1"
            ]
          }
        }],
        ["OS=='linux'", {
          "cflags": ["-std=c++17"],
          "cflags_cc": ["-std=c++17"]
        }]
      ]
    }
  ]
}