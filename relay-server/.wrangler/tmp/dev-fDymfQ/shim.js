var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// build/index.js
import { WorkerEntrypoint as at } from "cloudflare:workers";
import D from "./d52907f1e71527a602467fb5e4ef5c0bc2ada763-index_bg.wasm";
var r;
var d = new Array(128).fill(void 0);
d.push(void 0, null, true, false);
function o(e) {
  return d[e];
}
__name(o, "o");
var l = 0;
var E = null;
function j() {
  return (E === null || E.byteLength === 0) && (E = new Uint8Array(r.memory.buffer)), E;
}
__name(j, "j");
var W = typeof TextEncoder < "u" ? new TextEncoder("utf-8") : { encode: /* @__PURE__ */ __name(() => {
  throw Error("TextEncoder not available");
}, "encode") };
var J = typeof W.encodeInto == "function" ? function(e, t) {
  return W.encodeInto(e, t);
} : function(e, t) {
  let n = W.encode(e);
  return t.set(n), { read: e.length, written: n.length };
};
function I(e, t, n) {
  if (n === void 0) {
    let g = W.encode(e), v = t(g.length, 1) >>> 0;
    return j().subarray(v, v + g.length).set(g), l = g.length, v;
  }
  let _ = e.length, i = t(_, 1) >>> 0, f = j(), u = 0;
  for (; u < _; u++) {
    let g = e.charCodeAt(u);
    if (g > 127) break;
    f[i + u] = g;
  }
  if (u !== _) {
    u !== 0 && (e = e.slice(u)), i = n(i, _, _ = u + e.length * 3, 1) >>> 0;
    let g = j().subarray(i + u, i + _), v = J(e, g);
    u += v.written, i = n(i, _, u, 1) >>> 0;
  }
  return l = u, i;
}
__name(I, "I");
var y = null;
function a() {
  return (y === null || y.buffer.detached === true || y.buffer.detached === void 0 && y.buffer !== r.memory.buffer) && (y = new DataView(r.memory.buffer)), y;
}
__name(a, "a");
var m = d.length;
function s(e) {
  m === d.length && d.push(d.length + 1);
  let t = m;
  return m = d[t], d[t] = e, t;
}
__name(s, "s");
function b(e) {
  return e == null;
}
__name(b, "b");
function w(e, t) {
  try {
    return e.apply(this, t);
  } catch (n) {
    r.__wbindgen_export_2(s(n));
  }
}
__name(w, "w");
var L = typeof TextDecoder < "u" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: /* @__PURE__ */ __name(() => {
  throw Error("TextDecoder not available");
}, "decode") };
L.decode();
function G(e, t) {
  return L.decode(j().subarray(e, e + t));
}
__name(G, "G");
function h(e, t) {
  return e = e >>> 0, G(e, t);
}
__name(h, "h");
function K(e, t) {
  return e = e >>> 0, j().subarray(e / 1, e / 1 + t);
}
__name(K, "K");
function M(e) {
  let t = typeof e;
  if (t == "number" || t == "boolean" || e == null) return `${e}`;
  if (t == "string") return `"${e}"`;
  if (t == "symbol") {
    let i = e.description;
    return i == null ? "Symbol" : `Symbol(${i})`;
  }
  if (t == "function") {
    let i = e.name;
    return typeof i == "string" && i.length > 0 ? `Function(${i})` : "Function";
  }
  if (Array.isArray(e)) {
    let i = e.length, f = "[";
    i > 0 && (f += M(e[0]));
    for (let u = 1; u < i; u++) f += ", " + M(e[u]);
    return f += "]", f;
  }
  let n = /\[object ([^\]]+)\]/.exec(toString.call(e)), _;
  if (n && n.length > 1) _ = n[1];
  else return toString.call(e);
  if (_ == "Object") try {
    return "Object(" + JSON.stringify(e) + ")";
  } catch {
    return "Object";
  }
  return e instanceof Error ? `${e.name}: ${e.message}
${e.stack}` : _;
}
__name(M, "M");
var C = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry((e) => {
  e.instance === c && r.__wbindgen_export_3.get(e.dtor)(e.a, e.b);
});
function Q(e, t, n, _) {
  let i = { a: e, b: t, cnt: 1, dtor: n, instance: c }, f = /* @__PURE__ */ __name((...u) => {
    if (i.instance !== c) throw new Error("Cannot invoke closure from previous WASM instance");
    i.cnt++;
    let g = i.a;
    i.a = 0;
    try {
      return _(g, i.b, ...u);
    } finally {
      --i.cnt === 0 ? (r.__wbindgen_export_3.get(i.dtor)(g, i.b), C.unregister(i)) : i.a = g;
    }
  }, "f");
  return f.original = i, C.register(f, i, i), f;
}
__name(Q, "Q");
function X(e) {
  e < 132 || (d[e] = m, m = e);
}
__name(X, "X");
function p(e) {
  let t = o(e);
  return X(e), t;
}
__name(p, "p");
function q(e, t, n) {
  let _ = r.fetch(s(e), s(t), s(n));
  return p(_);
}
__name(q, "q");
function Y(e, t) {
  e = e >>> 0;
  let n = a(), _ = [];
  for (let i = e; i < e + 4 * t; i += 4) _.push(p(n.getUint32(i, true)));
  return _;
}
__name(Y, "Y");
function Z(e, t) {
  let n = t(e.length * 4, 4) >>> 0, _ = a();
  for (let i = 0; i < e.length; i++) _.setUint32(n + 4 * i, s(e[i]), true);
  return l = e.length, n;
}
__name(Z, "Z");
function H(e) {
  r.setPanicHook(s(e));
}
__name(H, "H");
function tt(e, t, n) {
  r.__wbindgen_export_5(e, t, s(n));
}
__name(tt, "tt");
function et(e, t, n, _) {
  r.__wbindgen_export_6(e, t, s(n), s(_));
}
__name(et, "et");
var nt = ["bytes"];
var c = 0;
function B() {
  c++, y = null, E = null, typeof numBytesDecoded < "u" && (numBytesDecoded = 0), typeof l < "u" && (l = 0), typeof d < "u" && (d = new Array(128).fill(void 0), d = d.concat([void 0, null, true, false]), typeof m < "u" && (m = d.length)), r = new WebAssembly.Instance(D, $).exports, r.__wbindgen_start();
}
__name(B, "B");
var rt = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e, instance: t }) => {
  t === c && r.__wbg_containerstartupoptions_free(e >>> 0, 1);
});
var R = class {
  static {
    __name(this, "R");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, rt.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    r.__wbg_containerstartupoptions_free(t, 0);
  }
  get entrypoint() {
    try {
      if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
      let i = r.__wbindgen_add_to_stack_pointer(-16);
      r.__wbg_get_containerstartupoptions_entrypoint(i, this.__wbg_ptr);
      var t = a().getInt32(i + 0, true), n = a().getInt32(i + 4, true), _ = Y(t, n).slice();
      return r.__wbindgen_export_4(t, n * 4, 4), _;
    } finally {
      r.__wbindgen_add_to_stack_pointer(16);
    }
  }
  set entrypoint(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let n = Z(t, r.__wbindgen_export_0), _ = l;
    r.__wbg_set_containerstartupoptions_entrypoint(this.__wbg_ptr, n, _);
  }
  get enableInternet() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let t = r.__wbg_get_containerstartupoptions_enableInternet(this.__wbg_ptr);
    return t === 16777215 ? void 0 : t !== 0;
  }
  set enableInternet(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.__wbg_set_containerstartupoptions_enableInternet(this.__wbg_ptr, b(t) ? 16777215 : t ? 1 : 0);
  }
  get env() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let t = r.__wbg_get_containerstartupoptions_env(this.__wbg_ptr);
    return p(t);
  }
  set env(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.__wbg_set_containerstartupoptions_env(this.__wbg_ptr, s(t));
  }
};
var _t = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e, instance: t }) => {
  t === c && r.__wbg_intounderlyingbytesource_free(e >>> 0, 1);
});
var k = class {
  static {
    __name(this, "k");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, _t.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    r.__wbg_intounderlyingbytesource_free(t, 0);
  }
  get type() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let t = r.intounderlyingbytesource_type(this.__wbg_ptr);
    return nt[t];
  }
  get autoAllocateChunkSize() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    return r.intounderlyingbytesource_autoAllocateChunkSize(this.__wbg_ptr) >>> 0;
  }
  start(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.intounderlyingbytesource_start(this.__wbg_ptr, s(t));
  }
  pull(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let n = r.intounderlyingbytesource_pull(this.__wbg_ptr, s(t));
    return p(n);
  }
  cancel() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let t = this.__destroy_into_raw();
    r.intounderlyingbytesource_cancel(t);
  }
};
var it = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e, instance: t }) => {
  t === c && r.__wbg_intounderlyingsink_free(e >>> 0, 1);
});
var S = class {
  static {
    __name(this, "S");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, it.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    r.__wbg_intounderlyingsink_free(t, 0);
  }
  write(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let n = r.intounderlyingsink_write(this.__wbg_ptr, s(t));
    return p(n);
  }
  close() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let t = this.__destroy_into_raw(), n = r.intounderlyingsink_close(t);
    return p(n);
  }
  abort(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let n = this.__destroy_into_raw(), _ = r.intounderlyingsink_abort(n, s(t));
    return p(_);
  }
};
var ot = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e, instance: t }) => {
  t === c && r.__wbg_intounderlyingsource_free(e >>> 0, 1);
});
var z = class {
  static {
    __name(this, "z");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, ot.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    r.__wbg_intounderlyingsource_free(t, 0);
  }
  pull(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let n = r.intounderlyingsource_pull(this.__wbg_ptr, s(t));
    return p(n);
  }
  cancel() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    let t = this.__destroy_into_raw();
    r.intounderlyingsource_cancel(t);
  }
};
var st = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e, instance: t }) => {
  t === c && r.__wbg_minifyconfig_free(e >>> 0, 1);
});
var A = class {
  static {
    __name(this, "A");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, st.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    r.__wbg_minifyconfig_free(t, 0);
  }
  get js() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    return r.__wbg_get_minifyconfig_js(this.__wbg_ptr) !== 0;
  }
  set js(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.__wbg_set_minifyconfig_js(this.__wbg_ptr, t);
  }
  get html() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    return r.__wbg_get_minifyconfig_html(this.__wbg_ptr) !== 0;
  }
  set html(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.__wbg_set_minifyconfig_html(this.__wbg_ptr, t);
  }
  get css() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    return r.__wbg_get_minifyconfig_css(this.__wbg_ptr) !== 0;
  }
  set css(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.__wbg_set_minifyconfig_css(this.__wbg_ptr, t);
  }
};
var ct = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e, instance: t }) => {
  t === c && r.__wbg_r2range_free(e >>> 0, 1);
});
var O = class {
  static {
    __name(this, "O");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, ct.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    r.__wbg_r2range_free(t, 0);
  }
  get offset() {
    try {
      if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
      let _ = r.__wbindgen_add_to_stack_pointer(-16);
      r.__wbg_get_r2range_offset(_, this.__wbg_ptr);
      var t = a().getInt32(_ + 0, true), n = a().getFloat64(_ + 8, true);
      return t === 0 ? void 0 : n;
    } finally {
      r.__wbindgen_add_to_stack_pointer(16);
    }
  }
  set offset(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.__wbg_set_r2range_offset(this.__wbg_ptr, !b(t), b(t) ? 0 : t);
  }
  get length() {
    try {
      if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
      let _ = r.__wbindgen_add_to_stack_pointer(-16);
      r.__wbg_get_r2range_length(_, this.__wbg_ptr);
      var t = a().getInt32(_ + 0, true), n = a().getFloat64(_ + 8, true);
      return t === 0 ? void 0 : n;
    } finally {
      r.__wbindgen_add_to_stack_pointer(16);
    }
  }
  set length(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.__wbg_set_r2range_length(this.__wbg_ptr, !b(t), b(t) ? 0 : t);
  }
  get suffix() {
    try {
      if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
      let _ = r.__wbindgen_add_to_stack_pointer(-16);
      r.__wbg_get_r2range_suffix(_, this.__wbg_ptr);
      var t = a().getInt32(_ + 0, true), n = a().getFloat64(_ + 8, true);
      return t === 0 ? void 0 : n;
    } finally {
      r.__wbindgen_add_to_stack_pointer(16);
    }
  }
  set suffix(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== c) throw new Error("Invalid stale object from previous Wasm instance");
    r.__wbg_set_r2range_suffix(this.__wbg_ptr, !b(t), b(t) ? 0 : t);
  }
};
var $ = { __wbindgen_placeholder__: { __wbg_String_8f0eb39a4a4c2f66: /* @__PURE__ */ __name(function(e, t) {
  let n = String(o(t)), _ = I(n, r.__wbindgen_export_0, r.__wbindgen_export_1), i = l;
  a().setInt32(e + 4, i, true), a().setInt32(e + 0, _, true);
}, "__wbg_String_8f0eb39a4a4c2f66"), __wbg_buffer_1f897e9f3ed6b41d: /* @__PURE__ */ __name(function(e) {
  let t = o(e).buffer;
  return s(t);
}, "__wbg_buffer_1f897e9f3ed6b41d"), __wbg_byobRequest_ba853121442653bf: /* @__PURE__ */ __name(function(e) {
  let t = o(e).byobRequest;
  return b(t) ? 0 : s(t);
}, "__wbg_byobRequest_ba853121442653bf"), __wbg_byteLength_7029fecd0c136e6d: /* @__PURE__ */ __name(function(e) {
  return o(e).byteLength;
}, "__wbg_byteLength_7029fecd0c136e6d"), __wbg_byteOffset_8161a341c0d72844: /* @__PURE__ */ __name(function(e) {
  return o(e).byteOffset;
}, "__wbg_byteOffset_8161a341c0d72844"), __wbg_call_2f8d426a20a307fe: /* @__PURE__ */ __name(function() {
  return w(function(e, t) {
    let n = o(e).call(o(t));
    return s(n);
  }, arguments);
}, "__wbg_call_2f8d426a20a307fe"), __wbg_call_f53f0647ceb9c567: /* @__PURE__ */ __name(function() {
  return w(function(e, t, n) {
    let _ = o(e).call(o(t), o(n));
    return s(_);
  }, arguments);
}, "__wbg_call_f53f0647ceb9c567"), __wbg_cause_94f62e1c92956ce2: /* @__PURE__ */ __name(function(e) {
  let t = o(e).cause;
  return s(t);
}, "__wbg_cause_94f62e1c92956ce2"), __wbg_cf_20dff013be44f394: /* @__PURE__ */ __name(function() {
  return w(function(e) {
    let t = o(e).cf;
    return b(t) ? 0 : s(t);
  }, arguments);
}, "__wbg_cf_20dff013be44f394"), __wbg_close_a90439b2444e47b4: /* @__PURE__ */ __name(function() {
  return w(function(e) {
    o(e).close();
  }, arguments);
}, "__wbg_close_a90439b2444e47b4"), __wbg_close_f602227805f17f95: /* @__PURE__ */ __name(function() {
  return w(function(e) {
    o(e).close();
  }, arguments);
}, "__wbg_close_f602227805f17f95"), __wbg_constructor_c7dddb218e3a03d0: /* @__PURE__ */ __name(function(e) {
  let t = o(e).constructor;
  return s(t);
}, "__wbg_constructor_c7dddb218e3a03d0"), __wbg_enqueue_1e58bed4477a141f: /* @__PURE__ */ __name(function() {
  return w(function(e, t) {
    o(e).enqueue(o(t));
  }, arguments);
}, "__wbg_enqueue_1e58bed4477a141f"), __wbg_error_41f0589870426ea4: /* @__PURE__ */ __name(function(e) {
  console.error(o(e));
}, "__wbg_error_41f0589870426ea4"), __wbg_error_93e9c80f4a42a374: /* @__PURE__ */ __name(function(e, t) {
  console.error(o(e), o(t));
}, "__wbg_error_93e9c80f4a42a374"), __wbg_get_27b4bcbec57323ca: /* @__PURE__ */ __name(function() {
  return w(function(e, t) {
    let n = Reflect.get(o(e), o(t));
    return s(n);
  }, arguments);
}, "__wbg_get_27b4bcbec57323ca"), __wbg_headers_391e2f64884c873b: /* @__PURE__ */ __name(function(e) {
  let t = o(e).headers;
  return s(t);
}, "__wbg_headers_391e2f64884c873b"), __wbg_instanceof_Error_1e51a63e1736444c: /* @__PURE__ */ __name(function(e) {
  let t;
  try {
    t = o(e) instanceof Error;
  } catch {
    t = false;
  }
  return t;
}, "__wbg_instanceof_Error_1e51a63e1736444c"), __wbg_length_904c0910ed998bf3: /* @__PURE__ */ __name(function(e) {
  return o(e).length;
}, "__wbg_length_904c0910ed998bf3"), __wbg_method_fae4b8c4f36afc79: /* @__PURE__ */ __name(function(e, t) {
  let n = o(t).method, _ = I(n, r.__wbindgen_export_0, r.__wbindgen_export_1), i = l;
  a().setInt32(e + 4, i, true), a().setInt32(e + 0, _, true);
}, "__wbg_method_fae4b8c4f36afc79"), __wbg_name_00d9be20bd992493: /* @__PURE__ */ __name(function(e) {
  let t = o(e).name;
  return s(t);
}, "__wbg_name_00d9be20bd992493"), __wbg_new_12588505388d0897: /* @__PURE__ */ __name(function() {
  return w(function() {
    let e = new Headers();
    return s(e);
  }, arguments);
}, "__wbg_new_12588505388d0897"), __wbg_new_1930cbb8d9ffc31b: /* @__PURE__ */ __name(function() {
  let e = new Object();
  return s(e);
}, "__wbg_new_1930cbb8d9ffc31b"), __wbg_new_97ddeb994a38bb69: /* @__PURE__ */ __name(function(e, t) {
  let n = new Error(h(e, t));
  return s(n);
}, "__wbg_new_97ddeb994a38bb69"), __wbg_new_d5e3800b120e37e1: /* @__PURE__ */ __name(function(e, t) {
  try {
    var n = { a: e, b: t }, _ = /* @__PURE__ */ __name((f, u) => {
      let g = n.a;
      n.a = 0;
      try {
        return et(g, n.b, f, u);
      } finally {
        n.a = g;
      }
    }, "_");
    let i = new Promise(_);
    return s(i);
  } finally {
    n.a = n.b = 0;
  }
}, "__wbg_new_d5e3800b120e37e1"), __wbg_newnoargs_a81330f6e05d8aca: /* @__PURE__ */ __name(function(e, t) {
  let n = new Function(h(e, t));
  return s(n);
}, "__wbg_newnoargs_a81330f6e05d8aca"), __wbg_newwithbyteoffsetandlength_9aade108cd45cf37: /* @__PURE__ */ __name(function(e, t, n) {
  let _ = new Uint8Array(o(e), t >>> 0, n >>> 0);
  return s(_);
}, "__wbg_newwithbyteoffsetandlength_9aade108cd45cf37"), __wbg_newwithlength_ed0ee6c1edca86fc: /* @__PURE__ */ __name(function(e) {
  let t = new Uint8Array(e >>> 0);
  return s(t);
}, "__wbg_newwithlength_ed0ee6c1edca86fc"), __wbg_newwithoptbuffersourceandinit_1ae53058d0c31edb: /* @__PURE__ */ __name(function() {
  return w(function(e, t) {
    let n = new Response(o(e), o(t));
    return s(n);
  }, arguments);
}, "__wbg_newwithoptbuffersourceandinit_1ae53058d0c31edb"), __wbg_newwithoptreadablestreamandinit_1852001bbe784578: /* @__PURE__ */ __name(function() {
  return w(function(e, t) {
    let n = new Response(o(e), o(t));
    return s(n);
  }, arguments);
}, "__wbg_newwithoptreadablestreamandinit_1852001bbe784578"), __wbg_newwithoptstrandinit_125912a3dc6108e9: /* @__PURE__ */ __name(function() {
  return w(function(e, t, n) {
    let _ = new Response(e === 0 ? void 0 : h(e, t), o(n));
    return s(_);
  }, arguments);
}, "__wbg_newwithoptstrandinit_125912a3dc6108e9"), __wbg_now_e3057dd824ca0191: /* @__PURE__ */ __name(function() {
  return Date.now();
}, "__wbg_now_e3057dd824ca0191"), __wbg_queueMicrotask_bcc6e26d899696db: /* @__PURE__ */ __name(function(e) {
  let t = o(e).queueMicrotask;
  return s(t);
}, "__wbg_queueMicrotask_bcc6e26d899696db"), __wbg_queueMicrotask_f24a794d09c42640: /* @__PURE__ */ __name(function(e) {
  queueMicrotask(o(e));
}, "__wbg_queueMicrotask_f24a794d09c42640"), __wbg_resolve_5775c0ef9222f556: /* @__PURE__ */ __name(function(e) {
  let t = Promise.resolve(o(e));
  return s(t);
}, "__wbg_resolve_5775c0ef9222f556"), __wbg_respond_0003f7c68aa35ef6: /* @__PURE__ */ __name(function() {
  return w(function(e, t) {
    o(e).respond(t >>> 0);
  }, arguments);
}, "__wbg_respond_0003f7c68aa35ef6"), __wbg_set_1d5fe1e3f51a48d8: /* @__PURE__ */ __name(function(e, t, n) {
  o(e).set(K(t, n));
}, "__wbg_set_1d5fe1e3f51a48d8"), __wbg_set_2df374478acad331: /* @__PURE__ */ __name(function() {
  return w(function(e, t, n, _, i) {
    o(e).set(h(t, n), h(_, i));
  }, arguments);
}, "__wbg_set_2df374478acad331"), __wbg_set_b33e7a98099eed58: /* @__PURE__ */ __name(function() {
  return w(function(e, t, n) {
    return Reflect.set(o(e), o(t), o(n));
  }, arguments);
}, "__wbg_set_b33e7a98099eed58"), __wbg_setheaders_2a0ac3b03d7e9869: /* @__PURE__ */ __name(function(e, t) {
  o(e).headers = o(t);
}, "__wbg_setheaders_2a0ac3b03d7e9869"), __wbg_setstatus_b5511c976f28265b: /* @__PURE__ */ __name(function(e, t) {
  o(e).status = t;
}, "__wbg_setstatus_b5511c976f28265b"), __wbg_static_accessor_GLOBAL_1f13249cc3acc96d: /* @__PURE__ */ __name(function() {
  let e = typeof global > "u" ? null : global;
  return b(e) ? 0 : s(e);
}, "__wbg_static_accessor_GLOBAL_1f13249cc3acc96d"), __wbg_static_accessor_GLOBAL_THIS_df7ae94b1e0ed6a3: /* @__PURE__ */ __name(function() {
  let e = typeof globalThis > "u" ? null : globalThis;
  return b(e) ? 0 : s(e);
}, "__wbg_static_accessor_GLOBAL_THIS_df7ae94b1e0ed6a3"), __wbg_static_accessor_SELF_6265471db3b3c228: /* @__PURE__ */ __name(function() {
  let e = typeof self > "u" ? null : self;
  return b(e) ? 0 : s(e);
}, "__wbg_static_accessor_SELF_6265471db3b3c228"), __wbg_static_accessor_WINDOW_16fb482f8ec52863: /* @__PURE__ */ __name(function() {
  let e = typeof window > "u" ? null : window;
  return b(e) ? 0 : s(e);
}, "__wbg_static_accessor_WINDOW_16fb482f8ec52863"), __wbg_then_9cc266be2bf537b6: /* @__PURE__ */ __name(function(e, t) {
  let n = o(e).then(o(t));
  return s(n);
}, "__wbg_then_9cc266be2bf537b6"), __wbg_toString_1588a16751ba3f70: /* @__PURE__ */ __name(function(e) {
  let t = o(e).toString();
  return s(t);
}, "__wbg_toString_1588a16751ba3f70"), __wbg_url_f1601da69a879f0d: /* @__PURE__ */ __name(function(e, t) {
  let n = o(t).url, _ = I(n, r.__wbindgen_export_0, r.__wbindgen_export_1), i = l;
  a().setInt32(e + 4, i, true), a().setInt32(e + 0, _, true);
}, "__wbg_url_f1601da69a879f0d"), __wbg_view_d36d28552eb70661: /* @__PURE__ */ __name(function(e) {
  let t = o(e).view;
  return b(t) ? 0 : s(t);
}, "__wbg_view_d36d28552eb70661"), __wbg_wbindgencbdrop_a85ed476c6a370b9: /* @__PURE__ */ __name(function(e) {
  let t = o(e).original;
  return t.cnt-- == 1 ? (t.a = 0, true) : false;
}, "__wbg_wbindgencbdrop_a85ed476c6a370b9"), __wbg_wbindgendebugstring_bb652b1bc2061b6d: /* @__PURE__ */ __name(function(e, t) {
  let n = M(o(t)), _ = I(n, r.__wbindgen_export_0, r.__wbindgen_export_1), i = l;
  a().setInt32(e + 4, i, true), a().setInt32(e + 0, _, true);
}, "__wbg_wbindgendebugstring_bb652b1bc2061b6d"), __wbg_wbindgenisfunction_ea72b9d66a0e1705: /* @__PURE__ */ __name(function(e) {
  return typeof o(e) == "function";
}, "__wbg_wbindgenisfunction_ea72b9d66a0e1705"), __wbg_wbindgenisundefined_71f08a6ade4354e7: /* @__PURE__ */ __name(function(e) {
  return o(e) === void 0;
}, "__wbg_wbindgenisundefined_71f08a6ade4354e7"), __wbg_wbindgenstringget_43fe05afe34b0cb1: /* @__PURE__ */ __name(function(e, t) {
  let n = o(t), _ = typeof n == "string" ? n : void 0;
  var i = b(_) ? 0 : I(_, r.__wbindgen_export_0, r.__wbindgen_export_1), f = l;
  a().setInt32(e + 4, f, true), a().setInt32(e + 0, i, true);
}, "__wbg_wbindgenstringget_43fe05afe34b0cb1"), __wbg_wbindgenthrow_4c11a24fca429ccf: /* @__PURE__ */ __name(function(e, t) {
  throw new Error(h(e, t));
}, "__wbg_wbindgenthrow_4c11a24fca429ccf"), __wbindgen_cast_2241b6af4c4b2941: /* @__PURE__ */ __name(function(e, t) {
  let n = h(e, t);
  return s(n);
}, "__wbindgen_cast_2241b6af4c4b2941"), __wbindgen_cast_257c51b8abf9285e: /* @__PURE__ */ __name(function(e, t) {
  let n = Q(e, t, 57, tt);
  return s(n);
}, "__wbindgen_cast_257c51b8abf9285e"), __wbindgen_object_clone_ref: /* @__PURE__ */ __name(function(e) {
  let t = o(e);
  return s(t);
}, "__wbindgen_object_clone_ref"), __wbindgen_object_drop_ref: /* @__PURE__ */ __name(function(e) {
  p(e);
}, "__wbindgen_object_drop_ref") } };
var ut = new WebAssembly.Instance(D, $);
r = ut.exports;
var T = null;
Error.stackTraceLimit = 100;
function V() {
  H(function(e) {
    T = new Error("Critical Rust panic: " + e), console.error(T);
  });
}
__name(V, "V");
V();
function U() {
  if (T) {
    console.log("Reinitializing Wasm application"), B(), T = null, V();
    for (let e of N) {
      let t = Reflect.construct(e.target, e.args, e.newTarget);
      e.instance = t;
    }
  }
}
__name(U, "U");
var P = class extends at {
  static {
    __name(this, "P");
  }
  async fetch(t) {
    return U(), await q(t, this.env, this.ctx);
  }
  async queue(t) {
    return U(), await (void 0)(t, this.env, this.ctx);
  }
  async scheduled(t) {
    return U(), await (void 0)(t, this.env, this.ctx);
  }
};
var N = [];
var x = { construct(e, t, n) {
  let _ = { instance: Reflect.construct(e, t, n), target: e, args: t, newTarget: n };
  return N.push(_), new Proxy(_, { get(i, f, u) {
    return Reflect.get(i.instance, f, u);
  }, set(i, f, u, g) {
    return Reflect.set(i.instance, f, u, g);
  } });
} };
var bt = new Proxy(R, x);
var wt = new Proxy(k, x);
var dt = new Proxy(S, x);
var lt = new Proxy(z, x);
var pt = new Proxy(A, x);
var ht = new Proxy(O, x);

// ../../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-nm9GOF/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = P;

// ../../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-nm9GOF/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  bt as ContainerStartupOptions,
  wt as IntoUnderlyingByteSource,
  dt as IntoUnderlyingSink,
  lt as IntoUnderlyingSource,
  pt as MinifyConfig,
  ht as R2Range,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  B as __wbg_reset_state,
  middleware_loader_entry_default as default,
  q as fetch,
  H as setPanicHook
};
//# sourceMappingURL=shim.js.map
