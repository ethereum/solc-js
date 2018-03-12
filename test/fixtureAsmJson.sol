contract C {
  function f() returns (bytes4) {
    return this.f.selector;
  }
}
