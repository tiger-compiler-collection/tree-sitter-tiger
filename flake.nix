{
  description = "Tiger grammar for tree-sitter";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    with flake-utils.lib; eachSystem ["x86_64-linux" "aarch64-darwin"] (system:
      let
        pkgs = import nixpkgs { inherit system; };

        # Core toolchain from
        # https://tree-sitter.github.io/tree-sitter/creating-parsers:
        #   - tree-sitter CLI  (generate / parse / test / build)
        #   - a JavaScript runtime to evaluate grammar.js (Node.js)
        #   - a C compiler (see mkShell below)
        base = with pkgs; [
          tree-sitter
          nodejs
          graphviz # `tree-sitter parse --debug-graph`
        ];

        # The tree-sitter CLI compiles src/parser.c itself via the Rust `cc`
        # crate, which passes `--target arm64-apple-macosx` to the compiler.
        # nixpkgs' wrapped clang/ld64 break on that (and cannot read the
        # macOS 26 SDK .tbd files), so on Darwin we deliberately ship *no*
        # compiler and let the CLI use Xcode Command Line Tools instead.
        # On Linux the stdenv gcc from mkShell works fine.
        mkShell = if pkgs.stdenv.isDarwin then pkgs.mkShellNoCC else pkgs.mkShell;
      in {
        devShells.default = mkShell {
          packages = base;
        };

        # `tree-sitter build --wasm` / `tree-sitter playground` need emscripten.
        # Kept in a separate shell so the default one stays small:
        #   nix develop .#wasm
        devShells.wasm = mkShell {
          packages = base ++ [ pkgs.emscripten ];
        };
      });
}
