declare module "@coral-xyz/anchor" {
  export * from "@coral-xyz/anchor/dist/cjs/index";
  import anchor = require("@coral-xyz/anchor/dist/cjs/index");
  export = anchor;
}
