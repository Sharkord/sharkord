{
  description = "Nodejs flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    {
      self,
      nixpkgs,
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      forAllSystems =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f (import nixpkgs {
            inherit system;
          })
        );
    in
    {
      devShells = forAllSystems (
        pkgs:
        {
          default = pkgs.mkShell {
            buildInputs =
              with pkgs;
              [
                nodejs
                pnpm
                bun
                tmux
              ]
              ++ nixpkgs.lib.optionals pkgs.stdenv.isLinux [
                docker
                docker-compose
              ];
          };
        }
      );
    };
}
