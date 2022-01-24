contract C {
	function f(uint x) public pure {
		uint i = 0;
		while (i < x)
			++i;
		assert(i == x);
	}
}
