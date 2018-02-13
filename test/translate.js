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
