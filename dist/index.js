import { create as ye } from "zustand";
import { syncTabs as be } from "zustand-sync";
import Ne from "dexie";
import { useCallback as D, useState as C, useEffect as I, createContext as ke, useContext as xe, useRef as re } from "react";
import { jsx as L } from "react/jsx-runtime";
const pe = "tauri-notice-config", j = {
  routePrefix: "/notice",
  databaseName: "tauri-notice-db",
  defaultWidth: 400,
  defaultHeight: 300,
  notFoundUrl: "/404",
  // Default 404 page
  defaultDecorations: !0,
  // Show title bar by default
  loadTimeout: 4e3,
  // Auto-close after 4s if stuck (only when decorations=false)
  autoSize: !0,
  // Auto-size windows based on rendered content
  maxWidth: 600,
  // Max width when auto-sizing
  maxHeight: 800,
  // Max height when auto-sizing
  autoSizeTimeout: 3e3,
  // Fallback show timeout if measurement fails
  stackRoute: "/notice/stack",
  // Route used by shared stack window
  stackWindowLabel: "notice-stack",
  // Label for shared stack window
  stackWindowOptions: {
    width: 380,
    height: 520,
    decorations: !1,
    resizable: !0,
    alwaysOnTop: !0
  }
}, fe = () => {
  if (typeof window > "u") return j;
  try {
    const t = localStorage.getItem(pe);
    if (t)
      return { ...j, ...JSON.parse(t) };
  } catch (t) {
    console.warn("Failed to load config from localStorage:", t);
  }
  return j;
}, De = (t) => {
  if (!(typeof window > "u"))
    try {
      localStorage.setItem(pe, JSON.stringify(t));
    } catch (e) {
      console.warn("Failed to save config to localStorage:", e);
    }
}, yt = (t) => {
  const i = { ...fe(), ...t };
  De(i);
}, S = () => fe();
class Oe extends Ne {
  messages;
  constructor(e) {
    super(e), this.version(1).stores({
      messages: "id, queueStatus, queuePosition, timestamp"
    });
  }
}
let R = null;
const me = () => {
  if (!R) {
    const t = S();
    R = new Oe(t.databaseName);
  }
  return R;
}, m = () => R || me(), Ie = async (t) => {
  const e = {
    ...t,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: !1,
    isShown: !1,
    queueStatus: "pending",
    queuePosition: 0
  };
  await m().messages.put(e);
}, Me = async (t) => !!await m().messages.get(t), Te = async (t) => {
  const e = await m().messages.get(t);
  return e?.isShown === !0 || e?.queueStatus === "shown";
}, Pe = async () => await m().messages.where("queueStatus").equals("pending").sortBy("queuePosition"), Le = async (t, e) => {
  await m().messages.update(t, { queueStatus: e });
}, Ce = async (t) => {
  await m().messages.update(t, {
    queueStatus: "shown",
    isShown: !0
  });
}, Re = async (t) => {
  await m().messages.update(t, {
    queueStatus: "hidden"
  });
}, _e = async (t) => await m().messages.get(t), Ee = async (t) => {
  await m().messages.delete(t);
}, Fe = async () => {
  await m().messages.where("queueStatus").anyOf(["pending", "showing"]).delete();
}, qe = async (t) => {
  const e = t.map(
    (i) => m().messages.update(i.id, { queuePosition: i.position })
  );
  await Promise.all(e);
}, Be = (t, e) => ({
  // Initial state
  queue: [],
  currentMessage: null,
  isProcessing: !1,
  initialized: !1,
  activeWindowIds: [],
  // Enqueue a new message
  enqueue: async (i) => {
    const n = e();
    if (await Te(i.id)) {
      console.log(`Message ${i.id} was already shown, skipping`);
      return;
    }
    if (await Me(i.id) || await Ie(i), !n.queue.some((w) => w.id === i.id)) {
      const w = [...n.queue, i];
      t({ queue: w }), await e().persistQueue();
    }
    !n.isProcessing && !n.currentMessage && await e().showNext();
  },
  // Dequeue the next message
  dequeue: () => {
    const i = e();
    if (i.queue.length === 0) return null;
    const [n, ...a] = i.queue;
    return t({ queue: a }), n;
  },
  // Show the next message in queue
  showNext: async () => {
    if (e().isProcessing) return;
    const n = e().dequeue();
    if (!n) {
      t({ isProcessing: !1, currentMessage: null });
      return;
    }
    if (!await _e(n.id)) {
      console.log(`Message ${n.id} was deleted, skipping to next`), await e().showNext();
      return;
    }
    t({
      currentMessage: n,
      isProcessing: !0
    }), await Le(n.id, "showing"), await e().persistQueue();
  },
  // Clear current message and show next
  clearCurrent: () => {
    t({
      currentMessage: null,
      isProcessing: !1
    }), e().queue.length > 0 && e().showNext();
  },
  // Set current message directly
  setCurrentMessage: (i) => {
    t({ currentMessage: i });
  },
  // Set processing flag
  setIsProcessing: (i) => {
    t({ isProcessing: i });
  },
  // Set entire queue
  setQueue: (i) => {
    t({ queue: i });
  },
  // Initialize from database on startup
  initializeFromDatabase: async () => {
    if (e().initialized) return;
    t({ initialized: !0 });
    const n = await Pe();
    n.length > 0 && (t({ queue: n }), await e().showNext());
  },
  // Persist queue to database
  persistQueue: async () => {
    const n = e().queue.map((a, r) => ({
      id: a.id,
      position: r
    }));
    await qe(n);
  },
  // Clear all messages on logout
  clearOnLogout: async () => {
    t({
      queue: [],
      currentMessage: null,
      isProcessing: !1,
      activeWindowIds: [],
      initialized: !1
    }), await Fe();
  },
  // Remove a specific message from the queue by ID (memory only)
  removeFromQueue: async (i) => {
    const n = e(), a = n.queue.filter((r) => r.id !== i);
    t({ queue: a }), await e().persistQueue(), n.currentMessage?.id === i && e().clearCurrent();
  },
  // Delete message completely (from both memory and database)
  deleteMessage: async (i) => {
    await Ee(i), await e().removeFromQueue(i);
  },
  // Hide a message (mark as hidden and remove from queue)
  hideMessage: async (i) => {
    await Re(i), await e().removeFromQueue(i);
  },
  // Mark message as shown in database
  markMessageAsShown: async (i) => {
    await Ce(i);
  },
  // Add active window ID
  addActiveWindow: (i) => {
    const n = e(), a = String(i);
    n.activeWindowIds.includes(a) || t({ activeWindowIds: [...n.activeWindowIds, a] });
  },
  // Remove active window ID
  removeActiveWindow: (i) => {
    const n = e(), a = String(i);
    t({
      activeWindowIds: n.activeWindowIds.filter((r) => r !== a)
    });
  },
  // Check if window is active
  isWindowActive: (i) => {
    const n = e(), a = String(i);
    return n.activeWindowIds.includes(a);
  }
}), g = ye()(
  be(Be, {
    name: "tauri-notice-queue"
  })
), B = {
  queueLength: (t) => t.queue.length,
  currentMessage: (t) => t.currentMessage,
  isProcessing: (t) => t.isProcessing,
  queue: (t) => t.queue
}, $e = (t) => ({
  items: [],
  addItem: (e) => {
    t((i) => {
      const n = String(e.id), a = i.items.filter((r) => r.id !== n);
      return a.push({ ...e, id: n }), { items: a };
    });
  },
  removeItem: (e) => {
    const i = String(e);
    t((n) => ({
      items: n.items.filter((a) => a.id !== i)
    }));
  },
  clearAll: () => {
    t({ items: [] });
  }
}), U = ye()(
  be($e, {
    name: "tauri-notice-stack"
  })
), He = () => {
  U.getState().clearAll();
}, Ue = (t) => {
  U.getState().removeItem(t);
}, bt = () => {
  const t = g((i) => i.enqueue);
  return { showNotice: D(
    async (i) => {
      await t(i);
    },
    [t]
  ) };
};
function Ge(t, e, i, n) {
  if (typeof e == "function" ? t !== e || !n : !e.has(t)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return i === "m" ? n : i === "a" ? n.call(t) : n ? n.value : e.get(t);
}
function Qe(t, e, i, n, a) {
  if (typeof e == "function" ? t !== e || !0 : !e.has(t)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return e.set(t, i), i;
}
var $;
const f = "__TAURI_TO_IPC_KEY__";
function je(t, e = !1) {
  return window.__TAURI_INTERNALS__.transformCallback(t, e);
}
async function s(t, e = {}, i) {
  return window.__TAURI_INTERNALS__.invoke(t, e, i);
}
class Ve {
  get rid() {
    return Ge(this, $, "f");
  }
  constructor(e) {
    $.set(this, void 0), Qe(this, $, e);
  }
  /**
   * Destroys and cleans up this resource from memory.
   * **You should not call any method on this object anymore and should drop any reference to it.**
   */
  async close() {
    return s("plugin:resources|close", {
      rid: this.rid
    });
  }
}
$ = /* @__PURE__ */ new WeakMap();
class K {
  constructor(...e) {
    this.type = "Logical", e.length === 1 ? "Logical" in e[0] ? (this.width = e[0].Logical.width, this.height = e[0].Logical.height) : (this.width = e[0].width, this.height = e[0].height) : (this.width = e[0], this.height = e[1]);
  }
  /**
   * Converts the logical size to a physical one.
   * @example
   * ```typescript
   * import { LogicalSize } from '@tauri-apps/api/dpi';
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   *
   * const appWindow = getCurrentWindow();
   * const factor = await appWindow.scaleFactor();
   * const size = new LogicalSize(400, 500);
   * const physical = size.toPhysical(factor);
   * ```
   *
   * @since 2.0.0
   */
  toPhysical(e) {
    return new N(this.width * e, this.height * e);
  }
  [f]() {
    return {
      width: this.width,
      height: this.height
    };
  }
  toJSON() {
    return this[f]();
  }
}
class N {
  constructor(...e) {
    this.type = "Physical", e.length === 1 ? "Physical" in e[0] ? (this.width = e[0].Physical.width, this.height = e[0].Physical.height) : (this.width = e[0].width, this.height = e[0].height) : (this.width = e[0], this.height = e[1]);
  }
  /**
   * Converts the physical size to a logical one.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const appWindow = getCurrentWindow();
   * const factor = await appWindow.scaleFactor();
   * const size = await appWindow.innerSize(); // PhysicalSize
   * const logical = size.toLogical(factor);
   * ```
   */
  toLogical(e) {
    return new K(this.width / e, this.height / e);
  }
  [f]() {
    return {
      width: this.width,
      height: this.height
    };
  }
  toJSON() {
    return this[f]();
  }
}
class A {
  constructor(e) {
    this.size = e;
  }
  toLogical(e) {
    return this.size instanceof K ? this.size : this.size.toLogical(e);
  }
  toPhysical(e) {
    return this.size instanceof N ? this.size : this.size.toPhysical(e);
  }
  [f]() {
    return {
      [`${this.size.type}`]: {
        width: this.size.width,
        height: this.size.height
      }
    };
  }
  toJSON() {
    return this[f]();
  }
}
class X {
  constructor(...e) {
    this.type = "Logical", e.length === 1 ? "Logical" in e[0] ? (this.x = e[0].Logical.x, this.y = e[0].Logical.y) : (this.x = e[0].x, this.y = e[0].y) : (this.x = e[0], this.y = e[1]);
  }
  /**
   * Converts the logical position to a physical one.
   * @example
   * ```typescript
   * import { LogicalPosition } from '@tauri-apps/api/dpi';
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   *
   * const appWindow = getCurrentWindow();
   * const factor = await appWindow.scaleFactor();
   * const position = new LogicalPosition(400, 500);
   * const physical = position.toPhysical(factor);
   * ```
   *
   * @since 2.0.0
   */
  toPhysical(e) {
    return new b(this.x * e, this.y * e);
  }
  [f]() {
    return {
      x: this.x,
      y: this.y
    };
  }
  toJSON() {
    return this[f]();
  }
}
class b {
  constructor(...e) {
    this.type = "Physical", e.length === 1 ? "Physical" in e[0] ? (this.x = e[0].Physical.x, this.y = e[0].Physical.y) : (this.x = e[0].x, this.y = e[0].y) : (this.x = e[0], this.y = e[1]);
  }
  /**
   * Converts the physical position to a logical one.
   * @example
   * ```typescript
   * import { PhysicalPosition } from '@tauri-apps/api/dpi';
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   *
   * const appWindow = getCurrentWindow();
   * const factor = await appWindow.scaleFactor();
   * const position = new PhysicalPosition(400, 500);
   * const physical = position.toLogical(factor);
   * ```
   *
   * @since 2.0.0
   */
  toLogical(e) {
    return new X(this.x / e, this.y / e);
  }
  [f]() {
    return {
      x: this.x,
      y: this.y
    };
  }
  toJSON() {
    return this[f]();
  }
}
class M {
  constructor(e) {
    this.position = e;
  }
  toLogical(e) {
    return this.position instanceof X ? this.position : this.position.toLogical(e);
  }
  toPhysical(e) {
    return this.position instanceof b ? this.position : this.position.toPhysical(e);
  }
  [f]() {
    return {
      [`${this.position.type}`]: {
        x: this.position.x,
        y: this.position.y
      }
    };
  }
  toJSON() {
    return this[f]();
  }
}
var d;
(function(t) {
  t.WINDOW_RESIZED = "tauri://resize", t.WINDOW_MOVED = "tauri://move", t.WINDOW_CLOSE_REQUESTED = "tauri://close-requested", t.WINDOW_DESTROYED = "tauri://destroyed", t.WINDOW_FOCUS = "tauri://focus", t.WINDOW_BLUR = "tauri://blur", t.WINDOW_SCALE_FACTOR_CHANGED = "tauri://scale-change", t.WINDOW_THEME_CHANGED = "tauri://theme-changed", t.WINDOW_CREATED = "tauri://window-created", t.WEBVIEW_CREATED = "tauri://webview-created", t.DRAG_ENTER = "tauri://drag-enter", t.DRAG_OVER = "tauri://drag-over", t.DRAG_DROP = "tauri://drag-drop", t.DRAG_LEAVE = "tauri://drag-leave";
})(d || (d = {}));
async function ve(t, e) {
  window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(t, e), await s("plugin:event|unlisten", {
    event: t,
    eventId: e
  });
}
async function q(t, e, i) {
  var n;
  const a = typeof i?.target == "string" ? { kind: "AnyLabel", label: i.target } : (n = i?.target) !== null && n !== void 0 ? n : { kind: "Any" };
  return s("plugin:event|listen", {
    event: t,
    target: a,
    handler: je(e)
  }).then((r) => async () => ve(t, r));
}
async function G(t, e, i) {
  return q(t, (n) => {
    ve(t, n.id), e(n);
  }, i);
}
async function ee(t, e) {
  await s("plugin:event|emit", {
    event: t,
    payload: e
  });
}
async function te(t, e, i) {
  await s("plugin:event|emit_to", {
    target: typeof t == "string" ? { kind: "AnyLabel", label: t } : t,
    event: e,
    payload: i
  });
}
const Se = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get TauriEvent() {
    return d;
  },
  emit: ee,
  emitTo: te,
  listen: q,
  once: G
}, Symbol.toStringTag, { value: "Module" }));
class E extends Ve {
  /**
   * Creates an Image from a resource ID. For internal use only.
   *
   * @ignore
   */
  constructor(e) {
    super(e);
  }
  /** Creates a new Image using RGBA data, in row-major order from top to bottom, and with specified width and height. */
  static async new(e, i, n) {
    return s("plugin:image|new", {
      rgba: H(e),
      width: i,
      height: n
    }).then((a) => new E(a));
  }
  /**
   * Creates a new image using the provided bytes by inferring the file format.
   * If the format is known, prefer [@link Image.fromPngBytes] or [@link Image.fromIcoBytes].
   *
   * Only `ico` and `png` are supported (based on activated feature flag).
   *
   * Note that you need the `image-ico` or `image-png` Cargo features to use this API.
   * To enable it, change your Cargo.toml file:
   * ```toml
   * [dependencies]
   * tauri = { version = "...", features = ["...", "image-png"] }
   * ```
   */
  static async fromBytes(e) {
    return s("plugin:image|from_bytes", {
      bytes: H(e)
    }).then((i) => new E(i));
  }
  /**
   * Creates a new image using the provided path.
   *
   * Only `ico` and `png` are supported (based on activated feature flag).
   *
   * Note that you need the `image-ico` or `image-png` Cargo features to use this API.
   * To enable it, change your Cargo.toml file:
   * ```toml
   * [dependencies]
   * tauri = { version = "...", features = ["...", "image-png"] }
   * ```
   */
  static async fromPath(e) {
    return s("plugin:image|from_path", { path: e }).then((i) => new E(i));
  }
  /** Returns the RGBA data for this image, in row-major order from top to bottom.  */
  async rgba() {
    return s("plugin:image|rgba", {
      rid: this.rid
    }).then((e) => new Uint8Array(e));
  }
  /** Returns the size of this image.  */
  async size() {
    return s("plugin:image|size", { rid: this.rid });
  }
}
function H(t) {
  return t == null ? null : typeof t == "string" ? t : t instanceof E ? t.rid : t;
}
var Y;
(function(t) {
  t[t.Critical = 1] = "Critical", t[t.Informational = 2] = "Informational";
})(Y || (Y = {}));
class Je {
  constructor(e) {
    this._preventDefault = !1, this.event = e.event, this.id = e.id;
  }
  preventDefault() {
    this._preventDefault = !0;
  }
  isPreventDefault() {
    return this._preventDefault;
  }
}
var le;
(function(t) {
  t.None = "none", t.Normal = "normal", t.Indeterminate = "indeterminate", t.Paused = "paused", t.Error = "error";
})(le || (le = {}));
function We() {
  return new Q(window.__TAURI_INTERNALS__.metadata.currentWindow.label, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  });
}
async function V() {
  return s("plugin:window|get_all_windows").then((t) => t.map((e) => new Q(e, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  })));
}
const J = ["tauri://created", "tauri://error"];
class Q {
  /**
   * Creates a new Window.
   * @example
   * ```typescript
   * import { Window } from '@tauri-apps/api/window';
   * const appWindow = new Window('my-label');
   * appWindow.once('tauri://created', function () {
   *  // window successfully created
   * });
   * appWindow.once('tauri://error', function (e) {
   *  // an error happened creating the window
   * });
   * ```
   *
   * @param label The unique window label. Must be alphanumeric: `a-zA-Z-/:_`.
   * @returns The {@link Window} instance to communicate with the window.
   */
  constructor(e, i = {}) {
    var n;
    this.label = e, this.listeners = /* @__PURE__ */ Object.create(null), i?.skip || s("plugin:window|create", {
      options: {
        ...i,
        parent: typeof i.parent == "string" ? i.parent : (n = i.parent) === null || n === void 0 ? void 0 : n.label,
        label: e
      }
    }).then(async () => this.emit("tauri://created")).catch(async (a) => this.emit("tauri://error", a));
  }
  /**
   * Gets the Window associated with the given label.
   * @example
   * ```typescript
   * import { Window } from '@tauri-apps/api/window';
   * const mainWindow = Window.getByLabel('main');
   * ```
   *
   * @param label The window label.
   * @returns The Window instance to communicate with the window or null if the window doesn't exist.
   */
  static async getByLabel(e) {
    var i;
    return (i = (await V()).find((n) => n.label === e)) !== null && i !== void 0 ? i : null;
  }
  /**
   * Get an instance of `Window` for the current window.
   */
  static getCurrent() {
    return We();
  }
  /**
   * Gets a list of instances of `Window` for all available windows.
   */
  static async getAll() {
    return V();
  }
  /**
   *  Gets the focused window.
   * @example
   * ```typescript
   * import { Window } from '@tauri-apps/api/window';
   * const focusedWindow = Window.getFocusedWindow();
   * ```
   *
   * @returns The Window instance or `undefined` if there is not any focused window.
   */
  static async getFocusedWindow() {
    for (const e of await V())
      if (await e.isFocused())
        return e;
    return null;
  }
  /**
   * Listen to an emitted event on this window.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const unlisten = await getCurrentWindow().listen<string>('state-changed', (event) => {
   *   console.log(`Got error: ${payload}`);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param handler Event handler.
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async listen(e, i) {
    return this._handleTauriEvent(e, i) ? () => {
      const n = this.listeners[e];
      n.splice(n.indexOf(i), 1);
    } : q(e, i, {
      target: { kind: "Window", label: this.label }
    });
  }
  /**
   * Listen to an emitted event on this window only once.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const unlisten = await getCurrentWindow().once<null>('initialized', (event) => {
   *   console.log(`Window initialized!`);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param handler Event handler.
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async once(e, i) {
    return this._handleTauriEvent(e, i) ? () => {
      const n = this.listeners[e];
      n.splice(n.indexOf(i), 1);
    } : G(e, i, {
      target: { kind: "Window", label: this.label }
    });
  }
  /**
   * Emits an event to all {@link EventTarget|targets}.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().emit('window-loaded', { loggedIn: true, token: 'authToken' });
   * ```
   *
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param payload Event payload.
   */
  async emit(e, i) {
    if (J.includes(e)) {
      for (const n of this.listeners[e] || [])
        n({
          event: e,
          id: -1,
          payload: i
        });
      return;
    }
    return ee(e, i);
  }
  /**
   * Emits an event to all {@link EventTarget|targets} matching the given target.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().emit('main', 'window-loaded', { loggedIn: true, token: 'authToken' });
   * ```
   * @param target Label of the target Window/Webview/WebviewWindow or raw {@link EventTarget} object.
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param payload Event payload.
   */
  async emitTo(e, i, n) {
    if (J.includes(i)) {
      for (const a of this.listeners[i] || [])
        a({
          event: i,
          id: -1,
          payload: n
        });
      return;
    }
    return te(e, i, n);
  }
  /** @ignore */
  _handleTauriEvent(e, i) {
    return J.includes(e) ? (e in this.listeners ? this.listeners[e].push(i) : this.listeners[e] = [i], !0) : !1;
  }
  // Getters
  /**
   * The scale factor that can be used to map physical pixels to logical pixels.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const factor = await getCurrentWindow().scaleFactor();
   * ```
   *
   * @returns The window's monitor scale factor.
   */
  async scaleFactor() {
    return s("plugin:window|scale_factor", {
      label: this.label
    });
  }
  /**
   * The position of the top-left hand corner of the window's client area relative to the top-left hand corner of the desktop.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const position = await getCurrentWindow().innerPosition();
   * ```
   *
   * @returns The window's inner position.
   */
  async innerPosition() {
    return s("plugin:window|inner_position", {
      label: this.label
    }).then((e) => new b(e));
  }
  /**
   * The position of the top-left hand corner of the window relative to the top-left hand corner of the desktop.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const position = await getCurrentWindow().outerPosition();
   * ```
   *
   * @returns The window's outer position.
   */
  async outerPosition() {
    return s("plugin:window|outer_position", {
      label: this.label
    }).then((e) => new b(e));
  }
  /**
   * The physical size of the window's client area.
   * The client area is the content of the window, excluding the title bar and borders.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const size = await getCurrentWindow().innerSize();
   * ```
   *
   * @returns The window's inner size.
   */
  async innerSize() {
    return s("plugin:window|inner_size", {
      label: this.label
    }).then((e) => new N(e));
  }
  /**
   * The physical size of the entire window.
   * These dimensions include the title bar and borders. If you don't want that (and you usually don't), use inner_size instead.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const size = await getCurrentWindow().outerSize();
   * ```
   *
   * @returns The window's outer size.
   */
  async outerSize() {
    return s("plugin:window|outer_size", {
      label: this.label
    }).then((e) => new N(e));
  }
  /**
   * Gets the window's current fullscreen state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const fullscreen = await getCurrentWindow().isFullscreen();
   * ```
   *
   * @returns Whether the window is in fullscreen mode or not.
   */
  async isFullscreen() {
    return s("plugin:window|is_fullscreen", {
      label: this.label
    });
  }
  /**
   * Gets the window's current minimized state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const minimized = await getCurrentWindow().isMinimized();
   * ```
   */
  async isMinimized() {
    return s("plugin:window|is_minimized", {
      label: this.label
    });
  }
  /**
   * Gets the window's current maximized state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const maximized = await getCurrentWindow().isMaximized();
   * ```
   *
   * @returns Whether the window is maximized or not.
   */
  async isMaximized() {
    return s("plugin:window|is_maximized", {
      label: this.label
    });
  }
  /**
   * Gets the window's current focus state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const focused = await getCurrentWindow().isFocused();
   * ```
   *
   * @returns Whether the window is focused or not.
   */
  async isFocused() {
    return s("plugin:window|is_focused", {
      label: this.label
    });
  }
  /**
   * Gets the window's current decorated state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const decorated = await getCurrentWindow().isDecorated();
   * ```
   *
   * @returns Whether the window is decorated or not.
   */
  async isDecorated() {
    return s("plugin:window|is_decorated", {
      label: this.label
    });
  }
  /**
   * Gets the window's current resizable state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const resizable = await getCurrentWindow().isResizable();
   * ```
   *
   * @returns Whether the window is resizable or not.
   */
  async isResizable() {
    return s("plugin:window|is_resizable", {
      label: this.label
    });
  }
  /**
   * Gets the window's native maximize button state.
   *
   * #### Platform-specific
   *
   * - **Linux / iOS / Android:** Unsupported.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const maximizable = await getCurrentWindow().isMaximizable();
   * ```
   *
   * @returns Whether the window's native maximize button is enabled or not.
   */
  async isMaximizable() {
    return s("plugin:window|is_maximizable", {
      label: this.label
    });
  }
  /**
   * Gets the window's native minimize button state.
   *
   * #### Platform-specific
   *
   * - **Linux / iOS / Android:** Unsupported.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const minimizable = await getCurrentWindow().isMinimizable();
   * ```
   *
   * @returns Whether the window's native minimize button is enabled or not.
   */
  async isMinimizable() {
    return s("plugin:window|is_minimizable", {
      label: this.label
    });
  }
  /**
   * Gets the window's native close button state.
   *
   * #### Platform-specific
   *
   * - **iOS / Android:** Unsupported.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const closable = await getCurrentWindow().isClosable();
   * ```
   *
   * @returns Whether the window's native close button is enabled or not.
   */
  async isClosable() {
    return s("plugin:window|is_closable", {
      label: this.label
    });
  }
  /**
   * Gets the window's current visible state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const visible = await getCurrentWindow().isVisible();
   * ```
   *
   * @returns Whether the window is visible or not.
   */
  async isVisible() {
    return s("plugin:window|is_visible", {
      label: this.label
    });
  }
  /**
   * Gets the window's current title.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const title = await getCurrentWindow().title();
   * ```
   */
  async title() {
    return s("plugin:window|title", {
      label: this.label
    });
  }
  /**
   * Gets the window's current theme.
   *
   * #### Platform-specific
   *
   * - **macOS:** Theme was introduced on macOS 10.14. Returns `light` on macOS 10.13 and below.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const theme = await getCurrentWindow().theme();
   * ```
   *
   * @returns The window theme.
   */
  async theme() {
    return s("plugin:window|theme", {
      label: this.label
    });
  }
  /**
   * Whether the window is configured to be always on top of other windows or not.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * const alwaysOnTop = await getCurrentWindow().isAlwaysOnTop();
   * ```
   *
   * @returns Whether the window is visible or not.
   */
  async isAlwaysOnTop() {
    return s("plugin:window|is_always_on_top", {
      label: this.label
    });
  }
  // Setters
  /**
   * Centers the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().center();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async center() {
    return s("plugin:window|center", {
      label: this.label
    });
  }
  /**
   *  Requests user attention to the window, this has no effect if the application
   * is already focused. How requesting for user attention manifests is platform dependent,
   * see `UserAttentionType` for details.
   *
   * Providing `null` will unset the request for user attention. Unsetting the request for
   * user attention might not be done automatically by the WM when the window receives input.
   *
   * #### Platform-specific
   *
   * - **macOS:** `null` has no effect.
   * - **Linux:** Urgency levels have the same effect.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().requestUserAttention();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async requestUserAttention(e) {
    let i = null;
    return e && (e === Y.Critical ? i = { type: "Critical" } : i = { type: "Informational" }), s("plugin:window|request_user_attention", {
      label: this.label,
      value: i
    });
  }
  /**
   * Updates the window resizable flag.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setResizable(false);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setResizable(e) {
    return s("plugin:window|set_resizable", {
      label: this.label,
      value: e
    });
  }
  /**
   * Enable or disable the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setEnabled(false);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   *
   * @since 2.0.0
   */
  async setEnabled(e) {
    return s("plugin:window|set_enabled", {
      label: this.label,
      value: e
    });
  }
  /**
   * Whether the window is enabled or disabled.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setEnabled(false);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   *
   * @since 2.0.0
   */
  async isEnabled() {
    return s("plugin:window|is_enabled", {
      label: this.label
    });
  }
  /**
   * Sets whether the window's native maximize button is enabled or not.
   * If resizable is set to false, this setting is ignored.
   *
   * #### Platform-specific
   *
   * - **macOS:** Disables the "zoom" button in the window titlebar, which is also used to enter fullscreen mode.
   * - **Linux / iOS / Android:** Unsupported.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setMaximizable(false);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setMaximizable(e) {
    return s("plugin:window|set_maximizable", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets whether the window's native minimize button is enabled or not.
   *
   * #### Platform-specific
   *
   * - **Linux / iOS / Android:** Unsupported.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setMinimizable(false);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setMinimizable(e) {
    return s("plugin:window|set_minimizable", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets whether the window's native close button is enabled or not.
   *
   * #### Platform-specific
   *
   * - **Linux:** GTK+ will do its best to convince the window manager not to show a close button. Depending on the system, this function may not have any effect when called on a window that is already visible
   * - **iOS / Android:** Unsupported.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setClosable(false);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setClosable(e) {
    return s("plugin:window|set_closable", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets the window title.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setTitle('Tauri');
   * ```
   *
   * @param title The new title
   * @returns A promise indicating the success or failure of the operation.
   */
  async setTitle(e) {
    return s("plugin:window|set_title", {
      label: this.label,
      value: e
    });
  }
  /**
   * Maximizes the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().maximize();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async maximize() {
    return s("plugin:window|maximize", {
      label: this.label
    });
  }
  /**
   * Unmaximizes the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().unmaximize();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async unmaximize() {
    return s("plugin:window|unmaximize", {
      label: this.label
    });
  }
  /**
   * Toggles the window maximized state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().toggleMaximize();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async toggleMaximize() {
    return s("plugin:window|toggle_maximize", {
      label: this.label
    });
  }
  /**
   * Minimizes the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().minimize();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async minimize() {
    return s("plugin:window|minimize", {
      label: this.label
    });
  }
  /**
   * Unminimizes the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().unminimize();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async unminimize() {
    return s("plugin:window|unminimize", {
      label: this.label
    });
  }
  /**
   * Sets the window visibility to true.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().show();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async show() {
    return s("plugin:window|show", {
      label: this.label
    });
  }
  /**
   * Sets the window visibility to false.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().hide();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async hide() {
    return s("plugin:window|hide", {
      label: this.label
    });
  }
  /**
   * Closes the window.
   *
   * Note this emits a closeRequested event so you can intercept it. To force window close, use {@link Window.destroy}.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().close();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async close() {
    return s("plugin:window|close", {
      label: this.label
    });
  }
  /**
   * Destroys the window. Behaves like {@link Window.close} but forces the window close instead of emitting a closeRequested event.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().destroy();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async destroy() {
    return s("plugin:window|destroy", {
      label: this.label
    });
  }
  /**
   * Whether the window should have borders and bars.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setDecorations(false);
   * ```
   *
   * @param decorations Whether the window should have borders and bars.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setDecorations(e) {
    return s("plugin:window|set_decorations", {
      label: this.label,
      value: e
    });
  }
  /**
   * Whether or not the window should have shadow.
   *
   * #### Platform-specific
   *
   * - **Windows:**
   *   - `false` has no effect on decorated window, shadows are always ON.
   *   - `true` will make undecorated window have a 1px white border,
   * and on Windows 11, it will have a rounded corners.
   * - **Linux:** Unsupported.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setShadow(false);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setShadow(e) {
    return s("plugin:window|set_shadow", {
      label: this.label,
      value: e
    });
  }
  /**
   * Set window effects.
   */
  async setEffects(e) {
    return s("plugin:window|set_effects", {
      label: this.label,
      value: e
    });
  }
  /**
   * Clear any applied effects if possible.
   */
  async clearEffects() {
    return s("plugin:window|set_effects", {
      label: this.label,
      value: null
    });
  }
  /**
   * Whether the window should always be on top of other windows.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setAlwaysOnTop(true);
   * ```
   *
   * @param alwaysOnTop Whether the window should always be on top of other windows or not.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setAlwaysOnTop(e) {
    return s("plugin:window|set_always_on_top", {
      label: this.label,
      value: e
    });
  }
  /**
   * Whether the window should always be below other windows.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setAlwaysOnBottom(true);
   * ```
   *
   * @param alwaysOnBottom Whether the window should always be below other windows or not.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setAlwaysOnBottom(e) {
    return s("plugin:window|set_always_on_bottom", {
      label: this.label,
      value: e
    });
  }
  /**
   * Prevents the window contents from being captured by other apps.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setContentProtected(true);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setContentProtected(e) {
    return s("plugin:window|set_content_protected", {
      label: this.label,
      value: e
    });
  }
  /**
   * Resizes the window with a new inner size.
   * @example
   * ```typescript
   * import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
   * await getCurrentWindow().setSize(new LogicalSize(600, 500));
   * ```
   *
   * @param size The logical or physical inner size.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setSize(e) {
    return s("plugin:window|set_size", {
      label: this.label,
      value: e instanceof A ? e : new A(e)
    });
  }
  /**
   * Sets the window minimum inner size. If the `size` argument is not provided, the constraint is unset.
   * @example
   * ```typescript
   * import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window';
   * await getCurrentWindow().setMinSize(new PhysicalSize(600, 500));
   * ```
   *
   * @param size The logical or physical inner size, or `null` to unset the constraint.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setMinSize(e) {
    return s("plugin:window|set_min_size", {
      label: this.label,
      value: e instanceof A ? e : e ? new A(e) : null
    });
  }
  /**
   * Sets the window maximum inner size. If the `size` argument is undefined, the constraint is unset.
   * @example
   * ```typescript
   * import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
   * await getCurrentWindow().setMaxSize(new LogicalSize(600, 500));
   * ```
   *
   * @param size The logical or physical inner size, or `null` to unset the constraint.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setMaxSize(e) {
    return s("plugin:window|set_max_size", {
      label: this.label,
      value: e instanceof A ? e : e ? new A(e) : null
    });
  }
  /**
   * Sets the window inner size constraints.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setSizeConstraints({ minWidth: 300 });
   * ```
   *
   * @param constraints The logical or physical inner size, or `null` to unset the constraint.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setSizeConstraints(e) {
    function i(n) {
      return n ? { Logical: n } : null;
    }
    return s("plugin:window|set_size_constraints", {
      label: this.label,
      value: {
        minWidth: i(e?.minWidth),
        minHeight: i(e?.minHeight),
        maxWidth: i(e?.maxWidth),
        maxHeight: i(e?.maxHeight)
      }
    });
  }
  /**
   * Sets the window outer position.
   * @example
   * ```typescript
   * import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
   * await getCurrentWindow().setPosition(new LogicalPosition(600, 500));
   * ```
   *
   * @param position The new position, in logical or physical pixels.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setPosition(e) {
    return s("plugin:window|set_position", {
      label: this.label,
      value: e instanceof M ? e : new M(e)
    });
  }
  /**
   * Sets the window fullscreen state.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setFullscreen(true);
   * ```
   *
   * @param fullscreen Whether the window should go to fullscreen or not.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setFullscreen(e) {
    return s("plugin:window|set_fullscreen", {
      label: this.label,
      value: e
    });
  }
  /**
   * On macOS, Toggles a fullscreen mode that doesn’t require a new macOS space. Returns a boolean indicating whether the transition was successful (this won’t work if the window was already in the native fullscreen).
   * This is how fullscreen used to work on macOS in versions before Lion. And allows the user to have a fullscreen window without using another space or taking control over the entire monitor.
   *
   * On other platforms, this is the same as {@link Window.setFullscreen}.
   *
   * @param fullscreen Whether the window should go to simple fullscreen or not.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setSimpleFullscreen(e) {
    return s("plugin:window|set_simple_fullscreen", {
      label: this.label,
      value: e
    });
  }
  /**
   * Bring the window to front and focus.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setFocus();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setFocus() {
    return s("plugin:window|set_focus", {
      label: this.label
    });
  }
  /**
   * Sets whether the window can be focused.
   *
   * #### Platform-specific
   *
   * - **macOS**: If the window is already focused, it is not possible to unfocus it after calling `set_focusable(false)`.
   *   In this case, you might consider calling {@link Window.setFocus} but it will move the window to the back i.e. at the bottom in terms of z-order.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setFocusable(true);
   * ```
   *
   * @param focusable Whether the window can be focused.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setFocusable(e) {
    return s("plugin:window|set_focusable", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets the window icon.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setIcon('/tauri/awesome.png');
   * ```
   *
   * Note that you may need the `image-ico` or `image-png` Cargo features to use this API.
   * To enable it, change your Cargo.toml file:
   * ```toml
   * [dependencies]
   * tauri = { version = "...", features = ["...", "image-png"] }
   * ```
   *
   * @param icon Icon bytes or path to the icon file.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setIcon(e) {
    return s("plugin:window|set_icon", {
      label: this.label,
      value: H(e)
    });
  }
  /**
   * Whether the window icon should be hidden from the taskbar or not.
   *
   * #### Platform-specific
   *
   * - **macOS:** Unsupported.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setSkipTaskbar(true);
   * ```
   *
   * @param skip true to hide window icon, false to show it.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setSkipTaskbar(e) {
    return s("plugin:window|set_skip_taskbar", {
      label: this.label,
      value: e
    });
  }
  /**
   * Grabs the cursor, preventing it from leaving the window.
   *
   * There's no guarantee that the cursor will be hidden. You should
   * hide it by yourself if you want so.
   *
   * #### Platform-specific
   *
   * - **Linux:** Unsupported.
   * - **macOS:** This locks the cursor in a fixed location, which looks visually awkward.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setCursorGrab(true);
   * ```
   *
   * @param grab `true` to grab the cursor icon, `false` to release it.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setCursorGrab(e) {
    return s("plugin:window|set_cursor_grab", {
      label: this.label,
      value: e
    });
  }
  /**
   * Modifies the cursor's visibility.
   *
   * #### Platform-specific
   *
   * - **Windows:** The cursor is only hidden within the confines of the window.
   * - **macOS:** The cursor is hidden as long as the window has input focus, even if the cursor is
   *   outside of the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setCursorVisible(false);
   * ```
   *
   * @param visible If `false`, this will hide the cursor. If `true`, this will show the cursor.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setCursorVisible(e) {
    return s("plugin:window|set_cursor_visible", {
      label: this.label,
      value: e
    });
  }
  /**
   * Modifies the cursor icon of the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setCursorIcon('help');
   * ```
   *
   * @param icon The new cursor icon.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setCursorIcon(e) {
    return s("plugin:window|set_cursor_icon", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets the window background color.
   *
   * #### Platform-specific:
   *
   * - **Windows:** alpha channel is ignored.
   * - **iOS / Android:** Unsupported.
   *
   * @returns A promise indicating the success or failure of the operation.
   *
   * @since 2.1.0
   */
  async setBackgroundColor(e) {
    return s("plugin:window|set_background_color", { color: e });
  }
  /**
   * Changes the position of the cursor in window coordinates.
   * @example
   * ```typescript
   * import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
   * await getCurrentWindow().setCursorPosition(new LogicalPosition(600, 300));
   * ```
   *
   * @param position The new cursor position.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setCursorPosition(e) {
    return s("plugin:window|set_cursor_position", {
      label: this.label,
      value: e instanceof M ? e : new M(e)
    });
  }
  /**
   * Changes the cursor events behavior.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setIgnoreCursorEvents(true);
   * ```
   *
   * @param ignore `true` to ignore the cursor events; `false` to process them as usual.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setIgnoreCursorEvents(e) {
    return s("plugin:window|set_ignore_cursor_events", {
      label: this.label,
      value: e
    });
  }
  /**
   * Starts dragging the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().startDragging();
   * ```
   *
   * @return A promise indicating the success or failure of the operation.
   */
  async startDragging() {
    return s("plugin:window|start_dragging", {
      label: this.label
    });
  }
  /**
   * Starts resize-dragging the window.
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().startResizeDragging();
   * ```
   *
   * @return A promise indicating the success or failure of the operation.
   */
  async startResizeDragging(e) {
    return s("plugin:window|start_resize_dragging", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets the badge count. It is app wide and not specific to this window.
   *
   * #### Platform-specific
   *
   * - **Windows**: Unsupported. Use @{linkcode Window.setOverlayIcon} instead.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setBadgeCount(5);
   * ```
   *
   * @param count The badge count. Use `undefined` to remove the badge.
   * @return A promise indicating the success or failure of the operation.
   */
  async setBadgeCount(e) {
    return s("plugin:window|set_badge_count", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets the badge cont **macOS only**.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setBadgeLabel("Hello");
   * ```
   *
   * @param label The badge label. Use `undefined` to remove the badge.
   * @return A promise indicating the success or failure of the operation.
   */
  async setBadgeLabel(e) {
    return s("plugin:window|set_badge_label", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets the overlay icon. **Windows only**
   * The overlay icon can be set for every window.
   *
   *
   * Note that you may need the `image-ico` or `image-png` Cargo features to use this API.
   * To enable it, change your Cargo.toml file:
   *
   * ```toml
   * [dependencies]
   * tauri = { version = "...", features = ["...", "image-png"] }
   * ```
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from '@tauri-apps/api/window';
   * await getCurrentWindow().setOverlayIcon("/tauri/awesome.png");
   * ```
   *
   * @param icon Icon bytes or path to the icon file. Use `undefined` to remove the overlay icon.
   * @return A promise indicating the success or failure of the operation.
   */
  async setOverlayIcon(e) {
    return s("plugin:window|set_overlay_icon", {
      label: this.label,
      value: e ? H(e) : void 0
    });
  }
  /**
   * Sets the taskbar progress state.
   *
   * #### Platform-specific
   *
   * - **Linux / macOS**: Progress bar is app-wide and not specific to this window.
   * - **Linux**: Only supported desktop environments with `libunity` (e.g. GNOME).
   *
   * @example
   * ```typescript
   * import { getCurrentWindow, ProgressBarStatus } from '@tauri-apps/api/window';
   * await getCurrentWindow().setProgressBar({
   *   status: ProgressBarStatus.Normal,
   *   progress: 50,
   * });
   * ```
   *
   * @return A promise indicating the success or failure of the operation.
   */
  async setProgressBar(e) {
    return s("plugin:window|set_progress_bar", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets whether the window should be visible on all workspaces or virtual desktops.
   *
   * #### Platform-specific
   *
   * - **Windows / iOS / Android:** Unsupported.
   *
   * @since 2.0.0
   */
  async setVisibleOnAllWorkspaces(e) {
    return s("plugin:window|set_visible_on_all_workspaces", {
      label: this.label,
      value: e
    });
  }
  /**
   * Sets the title bar style. **macOS only**.
   *
   * @since 2.0.0
   */
  async setTitleBarStyle(e) {
    return s("plugin:window|set_title_bar_style", {
      label: this.label,
      value: e
    });
  }
  /**
   * Set window theme, pass in `null` or `undefined` to follow system theme
   *
   * #### Platform-specific
   *
   * - **Linux / macOS**: Theme is app-wide and not specific to this window.
   * - **iOS / Android:** Unsupported.
   *
   * @since 2.0.0
   */
  async setTheme(e) {
    return s("plugin:window|set_theme", {
      label: this.label,
      value: e
    });
  }
  // Listeners
  /**
   * Listen to window resize.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from "@tauri-apps/api/window";
   * const unlisten = await getCurrentWindow().onResized(({ payload: size }) => {
   *  console.log('Window resized', size);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async onResized(e) {
    return this.listen(d.WINDOW_RESIZED, (i) => {
      i.payload = new N(i.payload), e(i);
    });
  }
  /**
   * Listen to window move.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from "@tauri-apps/api/window";
   * const unlisten = await getCurrentWindow().onMoved(({ payload: position }) => {
   *  console.log('Window moved', position);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async onMoved(e) {
    return this.listen(d.WINDOW_MOVED, (i) => {
      i.payload = new b(i.payload), e(i);
    });
  }
  /**
   * Listen to window close requested. Emitted when the user requests to closes the window.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from "@tauri-apps/api/window";
   * import { confirm } from '@tauri-apps/api/dialog';
   * const unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
   *   const confirmed = await confirm('Are you sure?');
   *   if (!confirmed) {
   *     // user did not confirm closing the window; let's prevent it
   *     event.preventDefault();
   *   }
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async onCloseRequested(e) {
    return this.listen(d.WINDOW_CLOSE_REQUESTED, async (i) => {
      const n = new Je(i);
      await e(n), n.isPreventDefault() || await this.destroy();
    });
  }
  /**
   * Listen to a file drop event.
   * The listener is triggered when the user hovers the selected files on the webview,
   * drops the files or cancels the operation.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from "@tauri-apps/api/webview";
   * const unlisten = await getCurrentWindow().onDragDropEvent((event) => {
   *  if (event.payload.type === 'over') {
   *    console.log('User hovering', event.payload.position);
   *  } else if (event.payload.type === 'drop') {
   *    console.log('User dropped', event.payload.paths);
   *  } else {
   *    console.log('File drop cancelled');
   *  }
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async onDragDropEvent(e) {
    const i = await this.listen(d.DRAG_ENTER, (o) => {
      e({
        ...o,
        payload: {
          type: "enter",
          paths: o.payload.paths,
          position: new b(o.payload.position)
        }
      });
    }), n = await this.listen(d.DRAG_OVER, (o) => {
      e({
        ...o,
        payload: {
          type: "over",
          position: new b(o.payload.position)
        }
      });
    }), a = await this.listen(d.DRAG_DROP, (o) => {
      e({
        ...o,
        payload: {
          type: "drop",
          paths: o.payload.paths,
          position: new b(o.payload.position)
        }
      });
    }), r = await this.listen(d.DRAG_LEAVE, (o) => {
      e({ ...o, payload: { type: "leave" } });
    });
    return () => {
      i(), a(), n(), r();
    };
  }
  /**
   * Listen to window focus change.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from "@tauri-apps/api/window";
   * const unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
   *  console.log('Focus changed, window is focused? ' + focused);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async onFocusChanged(e) {
    const i = await this.listen(d.WINDOW_FOCUS, (a) => {
      e({ ...a, payload: !0 });
    }), n = await this.listen(d.WINDOW_BLUR, (a) => {
      e({ ...a, payload: !1 });
    });
    return () => {
      i(), n();
    };
  }
  /**
   * Listen to window scale change. Emitted when the window's scale factor has changed.
   * The following user actions can cause DPI changes:
   * - Changing the display's resolution.
   * - Changing the display's scale factor (e.g. in Control Panel on Windows).
   * - Moving the window to a display with a different scale factor.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from "@tauri-apps/api/window";
   * const unlisten = await getCurrentWindow().onScaleChanged(({ payload }) => {
   *  console.log('Scale changed', payload.scaleFactor, payload.size);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async onScaleChanged(e) {
    return this.listen(d.WINDOW_SCALE_FACTOR_CHANGED, e);
  }
  /**
   * Listen to the system theme change.
   *
   * @example
   * ```typescript
   * import { getCurrentWindow } from "@tauri-apps/api/window";
   * const unlisten = await getCurrentWindow().onThemeChanged(({ payload: theme }) => {
   *  console.log('New theme: ' + theme);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async onThemeChanged(e) {
    return this.listen(d.WINDOW_THEME_CHANGED, e);
  }
}
var ce;
(function(t) {
  t.Disabled = "disabled", t.Throttle = "throttle", t.Suspend = "suspend";
})(ce || (ce = {}));
var ue;
(function(t) {
  t.Default = "default", t.FluentOverlay = "fluentOverlay";
})(ue || (ue = {}));
var de;
(function(t) {
  t.AppearanceBased = "appearanceBased", t.Light = "light", t.Dark = "dark", t.MediumLight = "mediumLight", t.UltraDark = "ultraDark", t.Titlebar = "titlebar", t.Selection = "selection", t.Menu = "menu", t.Popover = "popover", t.Sidebar = "sidebar", t.HeaderView = "headerView", t.Sheet = "sheet", t.WindowBackground = "windowBackground", t.HudWindow = "hudWindow", t.FullScreenUI = "fullScreenUI", t.Tooltip = "tooltip", t.ContentBackground = "contentBackground", t.UnderWindowBackground = "underWindowBackground", t.UnderPageBackground = "underPageBackground", t.Mica = "mica", t.Blur = "blur", t.Acrylic = "acrylic", t.Tabbed = "tabbed", t.TabbedDark = "tabbedDark", t.TabbedLight = "tabbedLight";
})(de || (de = {}));
var we;
(function(t) {
  t.FollowsWindowActiveState = "followsWindowActiveState", t.Active = "active", t.Inactive = "inactive";
})(we || (we = {}));
function Ze(t) {
  return t === null ? null : {
    name: t.name,
    scaleFactor: t.scaleFactor,
    position: new b(t.position),
    size: new N(t.size),
    workArea: {
      position: new b(t.workArea.position),
      size: new N(t.workArea.size)
    }
  };
}
async function Ye() {
  return s("plugin:window|primary_monitor").then(Ze);
}
function ze() {
  return new ie(We(), window.__TAURI_INTERNALS__.metadata.currentWebview.label, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  });
}
async function he() {
  return s("plugin:webview|get_all_webviews").then((t) => t.map((e) => new ie(new Q(e.windowLabel, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  }), e.label, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  })));
}
const Z = ["tauri://created", "tauri://error"];
class ie {
  /**
   * Creates a new Webview.
   * @example
   * ```typescript
   * import { Window } from '@tauri-apps/api/window'
   * import { Webview } from '@tauri-apps/api/webview'
   * const appWindow = new Window('my-label')
   *
   * appWindow.once('tauri://created', async function() {
   *   const webview = new Webview(appWindow, 'my-label', {
   *     url: 'https://github.com/tauri-apps/tauri',
   *
   *     // create a webview with specific logical position and size
   *     x: 0,
   *     y: 0,
   *     width: 800,
   *     height: 600,
   *   });
   *
   *   webview.once('tauri://created', function () {
   *     // webview successfully created
   *   });
   *   webview.once('tauri://error', function (e) {
   *     // an error happened creating the webview
   *   });
   * });
   * ```
   *
   * @param window the window to add this webview to.
   * @param label The unique webview label. Must be alphanumeric: `a-zA-Z-/:_`.
   * @returns The {@link Webview} instance to communicate with the webview.
   */
  constructor(e, i, n) {
    this.window = e, this.label = i, this.listeners = /* @__PURE__ */ Object.create(null), n?.skip || s("plugin:webview|create_webview", {
      windowLabel: e.label,
      options: {
        ...n,
        label: i
      }
    }).then(async () => this.emit("tauri://created")).catch(async (a) => this.emit("tauri://error", a));
  }
  /**
   * Gets the Webview for the webview associated with the given label.
   * @example
   * ```typescript
   * import { Webview } from '@tauri-apps/api/webview';
   * const mainWebview = Webview.getByLabel('main');
   * ```
   *
   * @param label The webview label.
   * @returns The Webview instance to communicate with the webview or null if the webview doesn't exist.
   */
  static async getByLabel(e) {
    var i;
    return (i = (await he()).find((n) => n.label === e)) !== null && i !== void 0 ? i : null;
  }
  /**
   * Get an instance of `Webview` for the current webview.
   */
  static getCurrent() {
    return ze();
  }
  /**
   * Gets a list of instances of `Webview` for all available webviews.
   */
  static async getAll() {
    return he();
  }
  /**
   * Listen to an emitted event on this webview.
   *
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * const unlisten = await getCurrentWebview().listen<string>('state-changed', (event) => {
   *   console.log(`Got error: ${payload}`);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param handler Event handler.
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async listen(e, i) {
    return this._handleTauriEvent(e, i) ? () => {
      const n = this.listeners[e];
      n.splice(n.indexOf(i), 1);
    } : q(e, i, {
      target: { kind: "Webview", label: this.label }
    });
  }
  /**
   * Listen to an emitted event on this webview only once.
   *
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * const unlisten = await getCurrent().once<null>('initialized', (event) => {
   *   console.log(`Webview initialized!`);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param handler Event handler.
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async once(e, i) {
    return this._handleTauriEvent(e, i) ? () => {
      const n = this.listeners[e];
      n.splice(n.indexOf(i), 1);
    } : G(e, i, {
      target: { kind: "Webview", label: this.label }
    });
  }
  /**
   * Emits an event to all {@link EventTarget|targets}.
   *
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().emit('webview-loaded', { loggedIn: true, token: 'authToken' });
   * ```
   *
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param payload Event payload.
   */
  async emit(e, i) {
    if (Z.includes(e)) {
      for (const n of this.listeners[e] || [])
        n({
          event: e,
          id: -1,
          payload: i
        });
      return;
    }
    return ee(e, i);
  }
  /**
   * Emits an event to all {@link EventTarget|targets} matching the given target.
   *
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().emitTo('main', 'webview-loaded', { loggedIn: true, token: 'authToken' });
   * ```
   *
   * @param target Label of the target Window/Webview/WebviewWindow or raw {@link EventTarget} object.
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param payload Event payload.
   */
  async emitTo(e, i, n) {
    if (Z.includes(i)) {
      for (const a of this.listeners[i] || [])
        a({
          event: i,
          id: -1,
          payload: n
        });
      return;
    }
    return te(e, i, n);
  }
  /** @ignore */
  _handleTauriEvent(e, i) {
    return Z.includes(e) ? (e in this.listeners ? this.listeners[e].push(i) : this.listeners[e] = [i], !0) : !1;
  }
  // Getters
  /**
   * The position of the top-left hand corner of the webview's client area relative to the top-left hand corner of the desktop.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * const position = await getCurrentWebview().position();
   * ```
   *
   * @returns The webview's position.
   */
  async position() {
    return s("plugin:webview|webview_position", {
      label: this.label
    }).then((e) => new b(e));
  }
  /**
   * The physical size of the webview's client area.
   * The client area is the content of the webview, excluding the title bar and borders.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * const size = await getCurrentWebview().size();
   * ```
   *
   * @returns The webview's size.
   */
  async size() {
    return s("plugin:webview|webview_size", {
      label: this.label
    }).then((e) => new N(e));
  }
  // Setters
  /**
   * Closes the webview.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().close();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async close() {
    return s("plugin:webview|webview_close", {
      label: this.label
    });
  }
  /**
   * Resizes the webview.
   * @example
   * ```typescript
   * import { getCurrent, LogicalSize } from '@tauri-apps/api/webview';
   * await getCurrentWebview().setSize(new LogicalSize(600, 500));
   * ```
   *
   * @param size The logical or physical size.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setSize(e) {
    return s("plugin:webview|set_webview_size", {
      label: this.label,
      value: e instanceof A ? e : new A(e)
    });
  }
  /**
   * Sets the webview position.
   * @example
   * ```typescript
   * import { getCurrent, LogicalPosition } from '@tauri-apps/api/webview';
   * await getCurrentWebview().setPosition(new LogicalPosition(600, 500));
   * ```
   *
   * @param position The new position, in logical or physical pixels.
   * @returns A promise indicating the success or failure of the operation.
   */
  async setPosition(e) {
    return s("plugin:webview|set_webview_position", {
      label: this.label,
      value: e instanceof M ? e : new M(e)
    });
  }
  /**
   * Bring the webview to front and focus.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().setFocus();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setFocus() {
    return s("plugin:webview|set_webview_focus", {
      label: this.label
    });
  }
  /**
   * Sets whether the webview should automatically grow and shrink its size and position when the parent window resizes.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().setAutoResize(true);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setAutoResize(e) {
    return s("plugin:webview|set_webview_auto_resize", {
      label: this.label,
      value: e
    });
  }
  /**
   * Hide the webview.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().hide();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async hide() {
    return s("plugin:webview|webview_hide", {
      label: this.label
    });
  }
  /**
   * Show the webview.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().show();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async show() {
    return s("plugin:webview|webview_show", {
      label: this.label
    });
  }
  /**
   * Set webview zoom level.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().setZoom(1.5);
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async setZoom(e) {
    return s("plugin:webview|set_webview_zoom", {
      label: this.label,
      value: e
    });
  }
  /**
   * Moves this webview to the given label.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().reparent('other-window');
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async reparent(e) {
    return s("plugin:webview|reparent", {
      label: this.label,
      window: typeof e == "string" ? e : e.label
    });
  }
  /**
   * Clears all browsing data for this webview.
   * @example
   * ```typescript
   * import { getCurrentWebview } from '@tauri-apps/api/webview';
   * await getCurrentWebview().clearAllBrowsingData();
   * ```
   *
   * @returns A promise indicating the success or failure of the operation.
   */
  async clearAllBrowsingData() {
    return s("plugin:webview|clear_all_browsing_data");
  }
  /**
   * Specify the webview background color.
   *
   * #### Platfrom-specific:
   *
   * - **macOS / iOS**: Not implemented.
   * - **Windows**:
   *   - On Windows 7, transparency is not supported and the alpha value will be ignored.
   *   - On Windows higher than 7: translucent colors are not supported so any alpha value other than `0` will be replaced by `255`
   *
   * @returns A promise indicating the success or failure of the operation.
   *
   * @since 2.1.0
   */
  async setBackgroundColor(e) {
    return s("plugin:webview|set_webview_background_color", { color: e });
  }
  // Listeners
  /**
   * Listen to a file drop event.
   * The listener is triggered when the user hovers the selected files on the webview,
   * drops the files or cancels the operation.
   *
   * @example
   * ```typescript
   * import { getCurrentWebview } from "@tauri-apps/api/webview";
   * const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
   *  if (event.payload.type === 'over') {
   *    console.log('User hovering', event.payload.position);
   *  } else if (event.payload.type === 'drop') {
   *    console.log('User dropped', event.payload.paths);
   *  } else {
   *    console.log('File drop cancelled');
   *  }
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * When the debugger panel is open, the drop position of this event may be inaccurate due to a known limitation.
   * To retrieve the correct drop position, please detach the debugger.
   *
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async onDragDropEvent(e) {
    const i = await this.listen(d.DRAG_ENTER, (o) => {
      e({
        ...o,
        payload: {
          type: "enter",
          paths: o.payload.paths,
          position: new b(o.payload.position)
        }
      });
    }), n = await this.listen(d.DRAG_OVER, (o) => {
      e({
        ...o,
        payload: {
          type: "over",
          position: new b(o.payload.position)
        }
      });
    }), a = await this.listen(d.DRAG_DROP, (o) => {
      e({
        ...o,
        payload: {
          type: "drop",
          paths: o.payload.paths,
          position: new b(o.payload.position)
        }
      });
    }), r = await this.listen(d.DRAG_LEAVE, (o) => {
      e({ ...o, payload: { type: "leave" } });
    });
    return () => {
      i(), a(), n(), r();
    };
  }
}
function x() {
  const t = ze();
  return new W(t.label, { skip: !0 });
}
async function ge() {
  return s("plugin:window|get_all_windows").then((t) => t.map((e) => new W(e, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  })));
}
class W {
  /**
   * Creates a new {@link Window} hosting a {@link Webview}.
   * @example
   * ```typescript
   * import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
   * const webview = new WebviewWindow('my-label', {
   *   url: 'https://github.com/tauri-apps/tauri'
   * });
   * webview.once('tauri://created', function () {
   *  // webview successfully created
   * });
   * webview.once('tauri://error', function (e) {
   *  // an error happened creating the webview
   * });
   * ```
   *
   * @param label The unique webview label. Must be alphanumeric: `a-zA-Z-/:_`.
   * @returns The {@link WebviewWindow} instance to communicate with the window and webview.
   */
  constructor(e, i = {}) {
    var n;
    this.label = e, this.listeners = /* @__PURE__ */ Object.create(null), i?.skip || s("plugin:webview|create_webview_window", {
      options: {
        ...i,
        parent: typeof i.parent == "string" ? i.parent : (n = i.parent) === null || n === void 0 ? void 0 : n.label,
        label: e
      }
    }).then(async () => this.emit("tauri://created")).catch(async (a) => this.emit("tauri://error", a));
  }
  /**
   * Gets the Webview for the webview associated with the given label.
   * @example
   * ```typescript
   * import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
   * const mainWebview = WebviewWindow.getByLabel('main');
   * ```
   *
   * @param label The webview label.
   * @returns The Webview instance to communicate with the webview or null if the webview doesn't exist.
   */
  static async getByLabel(e) {
    var i;
    const n = (i = (await ge()).find((a) => a.label === e)) !== null && i !== void 0 ? i : null;
    return n ? new W(n.label, { skip: !0 }) : null;
  }
  /**
   * Get an instance of `Webview` for the current webview.
   */
  static getCurrent() {
    return x();
  }
  /**
   * Gets a list of instances of `Webview` for all available webviews.
   */
  static async getAll() {
    return ge();
  }
  /**
   * Listen to an emitted event on this webview window.
   *
   * @example
   * ```typescript
   * import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
   * const unlisten = await WebviewWindow.getCurrent().listen<string>('state-changed', (event) => {
   *   console.log(`Got error: ${payload}`);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param handler Event handler.
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async listen(e, i) {
    return this._handleTauriEvent(e, i) ? () => {
      const n = this.listeners[e];
      n.splice(n.indexOf(i), 1);
    } : q(e, i, {
      target: { kind: "WebviewWindow", label: this.label }
    });
  }
  /**
   * Listen to an emitted event on this webview window only once.
   *
   * @example
   * ```typescript
   * import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
   * const unlisten = await WebviewWindow.getCurrent().once<null>('initialized', (event) => {
   *   console.log(`Webview initialized!`);
   * });
   *
   * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
   * unlisten();
   * ```
   *
   * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
   * @param handler Event handler.
   * @returns A promise resolving to a function to unlisten to the event.
   * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
   */
  async once(e, i) {
    return this._handleTauriEvent(e, i) ? () => {
      const n = this.listeners[e];
      n.splice(n.indexOf(i), 1);
    } : G(e, i, {
      target: { kind: "WebviewWindow", label: this.label }
    });
  }
  /**
   * Set the window and webview background color.
   *
   * #### Platform-specific:
   *
   * - **Android / iOS:** Unsupported for the window layer.
   * - **macOS / iOS**: Not implemented for the webview layer.
   * - **Windows**:
   *   - alpha channel is ignored for the window layer.
   *   - On Windows 7, alpha channel is ignored for the webview layer.
   *   - On Windows 8 and newer, if alpha channel is not `0`, it will be ignored.
   *
   * @returns A promise indicating the success or failure of the operation.
   *
   * @since 2.1.0
   */
  async setBackgroundColor(e) {
    return s("plugin:window|set_background_color", { color: e }).then(() => s("plugin:webview|set_webview_background_color", { color: e }));
  }
}
Ke(W, [Q, ie]);
function Ke(t, e) {
  (Array.isArray(e) ? e : [e]).forEach((i) => {
    Object.getOwnPropertyNames(i.prototype).forEach((n) => {
      var a;
      typeof t.prototype == "object" && t.prototype && n in t.prototype || Object.defineProperty(
        t.prototype,
        n,
        // eslint-disable-next-line
        (a = Object.getOwnPropertyDescriptor(i.prototype, n)) !== null && a !== void 0 ? a : /* @__PURE__ */ Object.create(null)
      );
    });
  });
}
const F = /* @__PURE__ */ new Map(), Xe = () => navigator.platform.toLowerCase().includes("mac") || navigator.userAgent.toLowerCase().includes("mac"), et = (t) => {
  if (!t || t.trim() === "") return !1;
  try {
    return !!(t.startsWith("/") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("tauri://"));
  } catch {
    return !1;
  }
}, tt = async () => {
  let t = 1920, e = 1080;
  try {
    const i = await Ye();
    if (i?.size) {
      const n = i.scaleFactor || 1;
      t = i.size.width / n, e = i.size.height / n;
    }
  } catch (i) {
    console.warn("Failed to get monitor info, using defaults:", i);
  }
  return { screenWidth: t, screenHeight: e };
}, ne = async (t, e, i) => {
  const n = i?.padding ?? 20;
  if (i?.x !== void 0 && i?.y !== void 0)
    return { x: i.x, y: i.y };
  const { screenWidth: a, screenHeight: r } = await tt();
  switch (i?.position ?? "right-bottom") {
    case "right-bottom":
      return {
        x: a - t - n,
        y: r - e - n
      };
    case "right-top":
      return {
        x: a - t - n,
        y: n
      };
    case "left-bottom":
      return {
        x: n,
        y: r - e - n
      };
    case "left-top":
      return {
        x: n,
        y: n
      };
    case "center":
      return {
        x: (a - t) / 2,
        y: (r - e) / 2
      };
    default:
      return {
        x: a - t - n,
        y: r - e - n
      };
  }
}, it = async (t) => {
  const e = String(t.id), i = g.getState();
  if (i.isWindowActive(e)) {
    console.log(`Notice window already open for message: ${e}`);
    return;
  }
  const n = S(), a = `notice-${e}`;
  let r = `${n.routePrefix}/${t.type}?id=${t.id}`;
  et(r) || (console.warn(`Invalid window URL: ${r}. Using fallback 404 page.`), r = n.notFoundUrl || "/404");
  const o = n.autoSize ?? !0, w = t.min_width || n.defaultWidth, h = o ? n.maxHeight ?? 800 : t.min_height || n.defaultHeight, u = t.decorations ?? n.defaultDecorations ?? !0, _ = t.min_height || n.defaultHeight, { x: k, y: T } = await ne(w, _, t.windowPosition);
  try {
    const y = {
      url: r,
      title: t.title,
      width: w,
      height: h,
      x: k,
      y: T,
      resizable: !0,
      skipTaskbar: !1,
      alwaysOnTop: !0
    };
    o && (y.visible = !1), u ? y.decorations = !0 : Xe() ? (y.decorations = !0, y.titleBarStyle = "overlay", y.hiddenTitle = !0) : (y.decorations = !1, y.transparent = !0);
    const p = new W(a, y);
    F.set(e, p), i.addActiveWindow(e);
    let c = null;
    const v = n.loadTimeout ?? 1e4;
    !u && v > 0 && (c = setTimeout(async () => {
      console.warn(`Notice window ${a} load timeout - auto closing`);
      try {
        await p.close();
      } catch {
      }
    }, v)), p.once("tauri://created", () => {
      c && (clearTimeout(c), c = null), console.log(`Notice window created successfully: ${a}`);
    }), p.once("tauri://error", async (l) => {
      if (console.error(`Notice window error: ${a}`, l), c && (clearTimeout(c), c = null), !u)
        try {
          await p.close();
        } catch {
        }
    }), p.once("tauri://destroyed", async () => {
      c && (clearTimeout(c), c = null), F.delete(e), i.removeActiveWindow(e), await i.markMessageAsShown(e), i.clearCurrent();
    }), console.log(`Created notice window: ${a} (autoSize: ${o}, visible: ${!o})`);
  } catch (y) {
    console.error("Failed to create notice window:", y), i.removeActiveWindow(e), i.clearCurrent();
  }
}, se = async (t) => {
  const e = String(t), i = F.get(e), n = g.getState();
  if (i)
    try {
      await i.close(), F.delete(e), n.removeActiveWindow(e), await n.markMessageAsShown(e), n.clearCurrent(), console.log(`Closed notice window: ${e}`);
    } catch (a) {
      console.error("Failed to close notice window:", a);
    }
}, nt = async () => {
  const t = Array.from(F.keys()).map(
    (e) => se(e)
  );
  await Promise.all(t);
}, st = () => {
  let t = null;
  g.subscribe((e) => {
    const i = e.currentMessage;
    i && i !== t ? (t = i, it(i)) : i || (t = null);
  }), console.log("Notice window system initialized");
}, pt = () => {
  const t = g((i) => i.currentMessage);
  return { closeNotice: D(async () => {
    t && await se(t.id);
  }, [t]) };
}, ft = () => {
  const t = g((i) => i.hideMessage);
  return { hideNotice: D(
    async (i) => {
      await t(i), await se(i);
    },
    [t]
  ) };
}, mt = () => {
  const t = g((i) => i.clearOnLogout);
  return { hideAllNotices: D(async () => {
    await nt(), await t();
  }, [t]) };
}, _t = () => {
  const t = g(B.queueLength), e = g(B.currentMessage), i = g(B.isProcessing), n = g(B.queue);
  return {
    queueLength: t,
    currentMessage: e,
    isProcessing: i,
    queue: n
  };
}, ae = () => typeof window < "u" && !!window.__TAURI__, at = async (t) => {
  if (ae())
    try {
      const { emit: e } = await Promise.resolve().then(() => Se);
      await e(`${t}-update`);
    } catch {
    }
}, ot = async () => {
  if (!ae()) return;
  const t = S(), e = t.stackWindowLabel || "notice-stack", i = t.stackRoute || "/notice/stack", n = t.stackWindowOptions || {}, a = n.width ?? 380, r = n.height ?? 520, o = n.decorations ?? !1, w = n.resizable ?? !0, h = n.alwaysOnTop ?? !0, u = await W.getByLabel(e);
  if (u) {
    await u.show(), await u.unminimize();
    return;
  }
  const { x: _, y: k } = await ne(a, r, n.position);
  new W(e, {
    url: i,
    title: "Notifications",
    width: a,
    height: r,
    x: _,
    y: k,
    decorations: o,
    resizable: w,
    alwaysOnTop: h,
    skipTaskbar: !1
  });
}, vt = async (t) => {
  const e = {
    id: String(t.id),
    uuid: t.uuid ? String(t.uuid) : void 0,
    type: t.type,
    routeType: t.routeType || t.type,
    title: t.title,
    data: t.data,
    receivedAt: t.receivedAt ?? Date.now()
  };
  U.getState().addItem(e);
  const n = S().stackWindowLabel || "notice-stack";
  return await at(n), await ot(), e;
}, rt = async () => {
  if (!ae()) return;
  const e = S().stackWindowLabel || "notice-stack", i = await W.getByLabel(e);
  i && await i.close();
}, lt = () => typeof window < "u" && !!window.__TAURI__, St = () => {
  const t = U((r) => r.items), [, e] = C(0);
  I(() => {
    if (!lt()) return;
    let r;
    const w = S().stackWindowLabel || "notice-stack";
    return Promise.resolve().then(() => Se).then(
      ({ listen: h }) => h(`${w}-update`, () => {
        e((u) => u + 1);
      })
    ).then((h) => {
      r = h;
    }).catch(() => {
    }), () => r?.();
  }, []);
  const i = D((r) => {
    Ue(r);
  }, []), n = D(() => {
    He();
  }, []), a = D(async () => {
    await rt();
  }, []);
  return {
    items: t,
    total: t.length,
    removeItem: i,
    clearAll: n,
    closeWindow: a
  };
}, Ae = ke({ windowReady: !0 }), Wt = () => xe(Ae), ct = async (t) => {
  try {
    const e = S(), i = e.defaultWidth || 400, n = e.maxHeight ?? 800, a = e.defaultHeight || 300, r = 32, o = Math.ceil(t) + r, w = Math.max(a, Math.min(o, n)), h = x();
    await h.setSize(new K(i, w));
    const { x: u, y: _ } = await ne(i, w);
    await h.setPosition(new X(u, _)), await h.show(), console.log(`[NoticeLayout] Auto-sized window to ${i}x${w} (content=${Math.ceil(t)}, chrome=${r})`);
  } catch (e) {
    console.error("[NoticeLayout] Failed to auto-size, showing window as-is:", e);
    try {
      await x().show();
    } catch {
    }
  }
}, zt = ({ children: t, onLoad: e, onClose: i }) => {
  const [n, a] = C(null), [r, o] = C(!0), [w, h] = C(null), [u, _] = C(!1), k = re(null), T = re(!1), y = S(), p = y.autoSize ?? !0;
  return I(() => {
    p || _(!0);
  }, [p]), I(() => {
    (async () => {
      try {
        const l = new URLSearchParams(window.location.search).get("id");
        if (!l) {
          h("No message ID provided"), o(!1), setTimeout(async () => {
            try {
              await x().close();
            } catch (z) {
              console.error("Failed to close window:", z);
            }
          }, 1e3);
          return;
        }
        const P = await _e(l);
        if (!P) {
          console.log(`Message ${l} not found in database, closing window`), h("Message not found"), o(!1), setTimeout(async () => {
            try {
              await x().close();
            } catch (z) {
              console.error("Failed to close window:", z);
            }
          }, 500);
          return;
        }
        a(P), o(!1), e && e(P);
      } catch (v) {
        console.error("Failed to load message:", v), h("Failed to load message"), o(!1), setTimeout(async () => {
          try {
            await x().close();
          } catch (l) {
            console.error("Failed to close window:", l);
          }
        }, 1e3);
      }
    })();
  }, [e]), I(() => {
    if (!p || !n || u || T.current) return;
    let c;
    const v = requestAnimationFrame(() => {
      c = requestAnimationFrame(() => {
        if (!k.current || T.current) return;
        T.current = !0;
        const l = k.current, z = S().defaultWidth || 400, O = {
          position: l.style.position,
          top: l.style.top,
          left: l.style.left,
          width: l.style.width,
          height: l.style.height,
          overflow: l.style.overflow
        };
        l.style.position = "fixed", l.style.top = "0", l.style.left = "0", l.style.width = `${z}px`, l.style.height = "auto", l.style.overflow = "visible", l.offsetHeight;
        const oe = l.scrollHeight;
        console.log(`[NoticeLayout] Measured content height: ${oe}px (container detached at ${z}px width)`), l.style.position = O.position, l.style.top = O.top, l.style.left = O.left, l.style.width = O.width, l.style.height = O.height, l.style.overflow = O.overflow, ct(oe).then(() => {
          _(!0);
        });
      });
    });
    return () => {
      cancelAnimationFrame(v), c !== void 0 && cancelAnimationFrame(c);
    };
  }, [p, n, u]), I(() => {
    if (!p || u) return;
    const c = y.autoSizeTimeout ?? 3e3, v = setTimeout(async () => {
      if (!u) {
        console.warn("[NoticeLayout] Auto-size timeout reached, showing window as-is");
        try {
          await x().show();
        } catch {
        }
        _(!0);
      }
    }, c);
    return () => clearTimeout(v);
  }, [p, u, y.autoSizeTimeout]), I(() => {
    if (!n || !i) return;
    const c = () => {
      i(n);
    };
    return window.addEventListener("beforeunload", c), () => window.removeEventListener("beforeunload", c);
  }, [n, i]), r ? /* @__PURE__ */ L("div", { style: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif"
  }, children: "Loading..." }) : w ? /* @__PURE__ */ L("div", { style: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#ef4444"
  }, children: w }) : n ? /* @__PURE__ */ L(Ae.Provider, { value: { windowReady: u }, children: /* @__PURE__ */ L(
    "div",
    {
      ref: k,
      style: u ? { height: "100vh" } : void 0,
      children: t(n)
    }
  ) }) : /* @__PURE__ */ L("div", { style: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#ef4444"
  }, children: "Closing window..." });
}, At = async () => {
  me(), st();
  const { initializeFromDatabase: t } = g.getState();
  await t(), console.log("Tauri Notice System initialized");
}, Nt = async (t) => {
  await g.getState().deleteMessage(t);
}, kt = async (t) => {
  await g.getState().hideMessage(t);
}, xt = async (t) => {
  await g.getState().markMessageAsShown(t);
};
export {
  zt as NoticeLayout,
  ne as calculateWindowPosition,
  He as clearNoticeStack,
  nt as closeAllNoticeWindows,
  rt as closeNoticeStackWindow,
  se as closeNoticeWindow,
  it as createNoticeWindow,
  Nt as deleteMessageById,
  ot as ensureStackWindow,
  tt as getLogicalScreenSize,
  _e as getMessage,
  S as getNoticeConfig,
  Pe as getPendingMessages,
  kt as hideMessageById,
  me as initializeDatabase,
  At as initializeNoticeSystem,
  st as initializeNoticeWindowSystem,
  xt as markMessageAsShown,
  B as messageQueueSelectors,
  vt as pushToNoticeStack,
  Ue as removeFromNoticeStack,
  yt as setNoticeConfig,
  pt as useCloseNotice,
  mt as useHideAllNotices,
  ft as useHideNotice,
  _t as useMessageQueue,
  g as useMessageQueueStore,
  St as useNoticeStack,
  U as useNoticeStackStore,
  bt as useNoticeWindow,
  Wt as useNoticeWindowContext
};
//# sourceMappingURL=index.js.map
