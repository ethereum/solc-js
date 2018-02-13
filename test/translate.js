const tape = require('tape');
const translate = require('../translate.js');
const versionToSemver = translate.versionToSemver;

tape('Version string to Semver translator', function (t) {
  t.test('Only numbers', function (st) {
    st.equal(versionToSemver('0.1.0'), '0.1.0');
    st.end();
  });
  t.test('New style release (semver)', function (st) {
    st.equal(versionToSemver('0.4.5+commit.b318366e.Emscripten.clang'), '0.4.5+commit.b318366e.Emscripten.clang');
    st.end();
  });
  t.test('New style nightly (semver)', function (st) {
    st.equal(versionToSemver('0.4.20-nightly.2018.2.13+commit.27ef9794.Emscripten.clang'), '0.4.20-nightly.2018.2.13+commit.27ef9794.Emscripten.clang');
    st.end();
  });
  t.test('Old style 0.1.1', function (st) {
    st.equal(versionToSemver('0.1.1-6ff4cd6b/RelWithDebInfo-Emscripten/clang/int'), '0.1.1+commit.6ff4cd6b');
    st.end();
  });
  t.test('Old style 0.1.2', function (st) {
    st.equal(versionToSemver('0.1.2-5c3bfd4b*/.-/clang/int'), '0.1.2+commit.5c3bfd4b');
    st.end();
  });
  t.test('Broken 0.1.3', function (st) {
    st.equal(versionToSemver('0.1.3-0/.-/clang/int linked to libethereum-0.9.92-0/.-/clang/int'), '0.1.3');
    st.end();
  });
  t.test('Old style 0.2.0', function (st) {
    st.equal(
      versionToSemver('0.2.0-e7098958/.-Emscripten/clang/int linked to libethereum-1.1.1-bbb80ab0/.-Emscripten/clang/int'),
      '0.2.0+commit.e7098958'
    );
    st.end();
  });
  t.test('Old style 0.3.5', function (st) {
    st.equal(versionToSemver('0.3.5-371690f0/Release-Emscripten/clang/Interpreter'), '0.3.5+commit.371690f0');
    st.end();
  });
  t.test('Old style 0.3.6', function (st) {
    st.equal(versionToSemver('0.3.6-3fc68da5/Release-Emscripten/clang'), '0.3.6+commit.3fc68da5');
    st.end();
  });
});

var fixtureAsmJson = {
   ".code" : [
      {
         "begin" : 0,
         "end" : 80,
         "name" : "PUSH",
         "value" : "60"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "PUSH",
         "value" : "40"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "MSTORE"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "CALLVALUE"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "ISZERO"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "PUSH [tag]",
         "value" : "1"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "JUMPI"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "PUSH",
         "value" : "0"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "DUP1"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "REVERT"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "tag",
         "value" : "1"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "JUMPDEST"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "PUSH #[$]",
         "value" : "0000000000000000000000000000000000000000000000000000000000000000"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "DUP1"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "PUSH [$]",
         "value" : "0000000000000000000000000000000000000000000000000000000000000000"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "PUSH",
         "value" : "0"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "CODECOPY"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "PUSH",
         "value" : "0"
      },
      {
         "begin" : 0,
         "end" : 80,
         "name" : "RETURN"
      }
   ],
   ".data" : {
      "0" : {
         ".auxdata" : "a165627a7a72305820984496c30d592ecde4b00d5e2c0697b33d6779fd3dc1eb57dc4a34c5c4fa5c760029",
         ".code" : [
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH",
               "value" : "60"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH",
               "value" : "40"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "MSTORE"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH",
               "value" : "4"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "CALLDATASIZE"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "LT"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH [tag]",
               "value" : "1"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "JUMPI"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH",
               "value" : "0"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "CALLDATALOAD"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH",
               "value" : "100000000000000000000000000000000000000000000000000000000"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "SWAP1"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "DIV"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH",
               "value" : "FFFFFFFF"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "AND"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "DUP1"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH",
               "value" : "26121FF0"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "EQ"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH [tag]",
               "value" : "2"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "JUMPI"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "tag",
               "value" : "1"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "JUMPDEST"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "PUSH",
               "value" : "0"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "DUP1"
            },
            {
               "begin" : 0,
               "end" : 80,
               "name" : "REVERT"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "tag",
               "value" : "2"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "JUMPDEST"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "CALLVALUE"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "ISZERO"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH [tag]",
               "value" : "3"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "JUMPI"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH",
               "value" : "0"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "DUP1"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "REVERT"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "tag",
               "value" : "3"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "JUMPDEST"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH [tag]",
               "value" : "4"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH [tag]",
               "value" : "5"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "JUMP"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "tag",
               "value" : "4"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "JUMPDEST"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH",
               "value" : "40"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "MLOAD"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "DUP1"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "DUP3"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH",
               "value" : "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "NOT"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "AND"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH",
               "value" : "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "NOT"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "AND"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "DUP2"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "MSTORE"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH",
               "value" : "20"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "ADD"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "SWAP2"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "POP"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "POP"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "PUSH",
               "value" : "40"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "MLOAD"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "DUP1"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "SWAP2"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "SUB"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "SWAP1"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "RETURN"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "tag",
               "value" : "5"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "JUMPDEST"
            },
            {
               "begin" : 37,
               "end" : 43,
               "name" : "PUSH",
               "value" : "0"
            },
            {
               "begin" : 58,
               "end" : 62,
               "name" : "ADDRESS"
            },
            {
               "begin" : 58,
               "end" : 64,
               "name" : "PUSH",
               "value" : "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
            },
            {
               "begin" : 58,
               "end" : 64,
               "name" : "AND"
            },
            {
               "begin" : 58,
               "end" : 64,
               "name" : "PUSH",
               "value" : "26121FF0"
            },
            {
               "begin" : 58,
               "end" : 73,
               "name" : "SWAP1"
            },
            {
               "begin" : 58,
               "end" : 73,
               "name" : "POP"
            },
            {
               "begin" : 58,
               "end" : 73,
               "name" : "PUSH",
               "value" : "100000000000000000000000000000000000000000000000000000000"
            },
            {
               "begin" : 58,
               "end" : 73,
               "name" : "MUL"
            },
            {
               "begin" : 51,
               "end" : 73,
               "name" : "SWAP1"
            },
            {
               "begin" : 51,
               "end" : 73,
               "name" : "POP"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "SWAP1"
            },
            {
               "begin" : 15,
               "end" : 78,
               "name" : "JUMP",
               "value" : "[out]"
            }
         ]
      }
   }
};

var fixtureAsmJsonSource = `contract C {
  function f() returns (bytes4) {
    return this.f.selector;
  }
}`

var fixtureAsmJsonOutput = `.code
  PUSH 60			contract C {\\n  function f() r...
  PUSH 40			contract C {\\n  function f() r...
  MSTORE 			contract C {\\n  function f() r...
  CALLVALUE 			contract C {\\n  function f() r...
  ISZERO 			contract C {\\n  function f() r...
  PUSH [tag] 1			contract C {\\n  function f() r...
  JUMPI 			contract C {\\n  function f() r...
  PUSH 0			contract C {\\n  function f() r...
  DUP1 			contract C {\\n  function f() r...
  REVERT 			contract C {\\n  function f() r...
tag 1			contract C {\\n  function f() r...
  JUMPDEST 			contract C {\\n  function f() r...
  PUSH #[$] 0000000000000000000000000000000000000000000000000000000000000000			contract C {\\n  function f() r...
  DUP1 			contract C {\\n  function f() r...
  PUSH [$] 0000000000000000000000000000000000000000000000000000000000000000			contract C {\\n  function f() r...
  PUSH 0			contract C {\\n  function f() r...
  CODECOPY 			contract C {\\n  function f() r...
  PUSH 0			contract C {\\n  function f() r...
  RETURN 			contract C {\\n  function f() r...
.data
  0:
    .code
      PUSH 60			contract C {\\n  function f() r...
      PUSH 40			contract C {\\n  function f() r...
      MSTORE 			contract C {\\n  function f() r...
      PUSH 4			contract C {\\n  function f() r...
      CALLDATASIZE 			contract C {\\n  function f() r...
      LT 			contract C {\\n  function f() r...
      PUSH [tag] 1			contract C {\\n  function f() r...
      JUMPI 			contract C {\\n  function f() r...
      PUSH 0			contract C {\\n  function f() r...
      CALLDATALOAD 			contract C {\\n  function f() r...
      PUSH 100000000000000000000000000000000000000000000000000000000			contract C {\\n  function f() r...
      SWAP1 			contract C {\\n  function f() r...
      DIV 			contract C {\\n  function f() r...
      PUSH FFFFFFFF			contract C {\\n  function f() r...
      AND 			contract C {\\n  function f() r...
      DUP1 			contract C {\\n  function f() r...
      PUSH 26121FF0			contract C {\\n  function f() r...
      EQ 			contract C {\\n  function f() r...
      PUSH [tag] 2			contract C {\\n  function f() r...
      JUMPI 			contract C {\\n  function f() r...
    tag 1			contract C {\\n  function f() r...
      JUMPDEST 			contract C {\\n  function f() r...
      PUSH 0			contract C {\\n  function f() r...
      DUP1 			contract C {\\n  function f() r...
      REVERT 			contract C {\\n  function f() r...
    tag 2			function f() returns (bytes4) ...
      JUMPDEST 			function f() returns (bytes4) ...
      CALLVALUE 			function f() returns (bytes4) ...
      ISZERO 			function f() returns (bytes4) ...
      PUSH [tag] 3			function f() returns (bytes4) ...
      JUMPI 			function f() returns (bytes4) ...
      PUSH 0			function f() returns (bytes4) ...
      DUP1 			function f() returns (bytes4) ...
      REVERT 			function f() returns (bytes4) ...
    tag 3			function f() returns (bytes4) ...
      JUMPDEST 			function f() returns (bytes4) ...
      PUSH [tag] 4			function f() returns (bytes4) ...
      PUSH [tag] 5			function f() returns (bytes4) ...
      JUMP 			function f() returns (bytes4) ...
    tag 4			function f() returns (bytes4) ...
      JUMPDEST 			function f() returns (bytes4) ...
      PUSH 40			function f() returns (bytes4) ...
      MLOAD 			function f() returns (bytes4) ...
      DUP1 			function f() returns (bytes4) ...
      DUP3 			function f() returns (bytes4) ...
      PUSH FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF			function f() returns (bytes4) ...
      NOT 			function f() returns (bytes4) ...
      AND 			function f() returns (bytes4) ...
      PUSH FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF			function f() returns (bytes4) ...
      NOT 			function f() returns (bytes4) ...
      AND 			function f() returns (bytes4) ...
      DUP2 			function f() returns (bytes4) ...
      MSTORE 			function f() returns (bytes4) ...
      PUSH 20			function f() returns (bytes4) ...
      ADD 			function f() returns (bytes4) ...
      SWAP2 			function f() returns (bytes4) ...
      POP 			function f() returns (bytes4) ...
      POP 			function f() returns (bytes4) ...
      PUSH 40			function f() returns (bytes4) ...
      MLOAD 			function f() returns (bytes4) ...
      DUP1 			function f() returns (bytes4) ...
      SWAP2 			function f() returns (bytes4) ...
      SUB 			function f() returns (bytes4) ...
      SWAP1 			function f() returns (bytes4) ...
      RETURN 			function f() returns (bytes4) ...
    tag 5			function f() returns (bytes4) ...
      JUMPDEST 			function f() returns (bytes4) ...
      PUSH 0			bytes4
      ADDRESS 			this
      PUSH FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF			this.f
      AND 			this.f
      PUSH 26121FF0			this.f
      SWAP1 			this.f.selector
      POP 			this.f.selector
      PUSH 100000000000000000000000000000000000000000000000000000000			this.f.selector
      MUL 			this.f.selector
      SWAP1 			return this.f.selector
      POP 			return this.f.selector
      SWAP1 			function f() returns (bytes4) ...
      JUMP [out]			function f() returns (bytes4) ...
    .data
`

tape('prettyPrintLegacyAssemblyJSON', function (t) {
  t.test('Works properly', function (st) {
    st.equal(translate.prettyPrintLegacyAssemblyJSON(fixtureAsmJson, fixtureAsmJsonSource), fixtureAsmJsonOutput);
    st.end();
  });
});
