{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages.default = pkgs.buildNpmPackage {
          pname = "blog-nyctef-com";
          version = "1.0.0";
          src = ./.;
          npmDepsHash = "sha256-kJ1Wck+NgyyH62vZ+MyrrecKHH5drK3kkw/w8uYHF2g=";
          installPhase = "runHook preInstall; cp -r dist $out; runHook postInstall";
        };
        formatter = pkgs.nixfmt-tree;
      }
    );

}
