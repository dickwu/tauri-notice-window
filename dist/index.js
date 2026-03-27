import { create as ve } from "zustand";
import { syncTabs as Se } from "zustand-sync";
import We from "dexie";
import { useCallback as H, createContext as ze, useContext as Ae, useState as E, useRef as ie, useEffect as P } from "react";
import { jsx as C } from "react/jsx-runtime";
const ce = "tauri-notice-config", G = {
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
  autoSizeTimeout: 3e3
  // Fallback show timeout if measurement fails
}, de = () => {
  if (typeof window > "u") return G;
  try {
    const t = localStorage.getItem(ce);
    if (t)
      return { ...G, ...JSON.parse(t) };
  } catch (t) {
    console.warn("Failed to load config from localStorage:", t);
  }
  return G;
}, Ne = (t) => {
  if (!(typeof window > "u"))
    try {
      localStorage.setItem(ce, JSON.stringify(t));
    } catch (e) {
      console.warn("Failed to save config to localStorage:", e);
    }
}, at = (t) => {
  const i = { ...de(), ...t };
  Ne(i);
}, T = () => de();
class xe extends We {
  messages;
  constructor(e) {
    super(e), this.version(1).stores({
      messages: "id, queueStatus, queuePosition, timestamp"
    });
  }
}
let k = null;
const we = () => {
  if (!k) {
    const t = T();
    k = new xe(t.databaseName);
  }
  return k;
}, f = () => k || we(), De = async (t) => {
  const e = {
    ...t,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: !1,
    isShown: !1,
    queueStatus: "pending",
    queuePosition: 0
  };
  await f().messages.put(e);
}, Me = async (t) => !!await f().messages.get(t), Oe = async (t) => {
  const e = await f().messages.get(t);
  return e?.isShown === !0 || e?.queueStatus === "shown";
}, Ie = async () => await f().messages.where("queueStatus").equals("pending").sortBy("queuePosition"), Pe = async (t, e) => {
  await f().messages.update(t, { queueStatus: e });
}, Ce = async (t) => {
  await f().messages.update(t, {
    queueStatus: "shown",
    isShown: !0
  });
}, ke = async (t) => {
  await f().messages.update(t, {
    queueStatus: "hidden"
  });
}, he = async (t) => await f().messages.get(t), Le = async (t) => {
  await f().messages.delete(t);
}, Te = async () => {
  await f().messages.where("queueStatus").anyOf(["pending", "showing"]).delete();
}, Re = async (t) => {
  const e = t.map(
    (i) => f().messages.update(i.id, { queuePosition: i.position })
  );
  await Promise.all(e);
}, Ee = (t, e) => ({
  // Initial state
  queue: [],
  currentMessage: null,
  isProcessing: !1,
  initialized: !1,
  activeWindowIds: [],
  // Enqueue a new message
  enqueue: async (i) => {
    const n = e();
    if (await Oe(i.id)) {
      console.log(`Message ${i.id} was already shown, skipping`);
      return;
    }
    if (await Me(i.id) || await De(i), !n.queue.some((g) => g.id === i.id)) {
      const g = [...n.queue, i];
      t({ queue: g }), await e().persistQueue();
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
    if (!await he(n.id)) {
      console.log(`Message ${n.id} was deleted, skipping to next`), await e().showNext();
      return;
    }
    t({
      currentMessage: n,
      isProcessing: !0
    }), await Pe(n.id, "showing"), await e().persistQueue();
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
    const n = await Ie();
    n.length > 0 && (t({ queue: n }), await e().showNext());
  },
  // Persist queue to database
  persistQueue: async () => {
    const n = e().queue.map((a, l) => ({
      id: a.id,
      position: l
    }));
    await Re(n);
  },
  // Clear all messages on logout
  clearOnLogout: async () => {
    t({
      queue: [],
      currentMessage: null,
      isProcessing: !1,
      activeWindowIds: [],
      initialized: !1
    }), await Te();
  },
  // Remove a specific message from the queue by ID (memory only)
  removeFromQueue: async (i) => {
    const n = e(), a = n.queue.filter((l) => l.id !== i);
    t({ queue: a }), await e().persistQueue(), n.currentMessage?.id === i && e().clearCurrent();
  },
  // Delete message completely (from both memory and database)
  deleteMessage: async (i) => {
    await Le(i), await e().removeFromQueue(i);
  },
  // Hide a message (mark as hidden and remove from queue)
  hideMessage: async (i) => {
    await ke(i), await e().removeFromQueue(i);
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
      activeWindowIds: n.activeWindowIds.filter((l) => l !== a)
    });
  },
  // Check if window is active
  isWindowActive: (i) => {
    const n = e(), a = String(i);
    return n.activeWindowIds.includes(a);
  }
}), d = ve()(
  Se(Ee, {
    name: "tauri-notice-queue"
  })
), F = {
  queueLength: (t) => t.queue.length,
  currentMessage: (t) => t.currentMessage,
  isProcessing: (t) => t.isProcessing,
  queue: (t) => t.queue
}, rt = () => {
  const t = d((i) => i.enqueue);
  return { showNotice: H(
    async (i) => {
      await t(i);
    },
    [t]
  ) };
};
function Fe(t, e, i, n) {
  if (typeof e == "function" ? t !== e || !n : !e.has(t)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return i === "m" ? n : i === "a" ? n.call(t) : n ? n.value : e.get(t);
}
function qe(t, e, i, n, a) {
  if (typeof e == "function" ? t !== e || !0 : !e.has(t)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return e.set(t, i), i;
}
var q;
const p = "__TAURI_TO_IPC_KEY__";
function Be(t, e = !1) {
  return window.__TAURI_INTERNALS__.transformCallback(t, e);
}
async function s(t, e = {}, i) {
  return window.__TAURI_INTERNALS__.invoke(t, e, i);
}
class He {
  get rid() {
    return Fe(this, q, "f");
  }
  constructor(e) {
    q.set(this, void 0), qe(this, q, e);
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
q = /* @__PURE__ */ new WeakMap();
class Z {
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
    return new W(this.width * e, this.height * e);
  }
  [p]() {
    return {
      width: this.width,
      height: this.height
    };
  }
  toJSON() {
    return this[p]();
  }
}
class W {
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
    return new Z(this.width / e, this.height / e);
  }
  [p]() {
    return {
      width: this.width,
      height: this.height
    };
  }
  toJSON() {
    return this[p]();
  }
}
class S {
  constructor(e) {
    this.size = e;
  }
  toLogical(e) {
    return this.size instanceof Z ? this.size : this.size.toLogical(e);
  }
  toPhysical(e) {
    return this.size instanceof W ? this.size : this.size.toPhysical(e);
  }
  [p]() {
    return {
      [`${this.size.type}`]: {
        width: this.size.width,
        height: this.size.height
      }
    };
  }
  toJSON() {
    return this[p]();
  }
}
class Y {
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
    return new h(this.x * e, this.y * e);
  }
  [p]() {
    return {
      x: this.x,
      y: this.y
    };
  }
  toJSON() {
    return this[p]();
  }
}
class h {
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
    return new Y(this.x / e, this.y / e);
  }
  [p]() {
    return {
      x: this.x,
      y: this.y
    };
  }
  toJSON() {
    return this[p]();
  }
}
class x {
  constructor(e) {
    this.position = e;
  }
  toLogical(e) {
    return this.position instanceof Y ? this.position : this.position.toLogical(e);
  }
  toPhysical(e) {
    return this.position instanceof h ? this.position : this.position.toPhysical(e);
  }
  [p]() {
    return {
      [`${this.position.type}`]: {
        x: this.position.x,
        y: this.position.y
      }
    };
  }
  toJSON() {
    return this[p]();
  }
}
var c;
(function(t) {
  t.WINDOW_RESIZED = "tauri://resize", t.WINDOW_MOVED = "tauri://move", t.WINDOW_CLOSE_REQUESTED = "tauri://close-requested", t.WINDOW_DESTROYED = "tauri://destroyed", t.WINDOW_FOCUS = "tauri://focus", t.WINDOW_BLUR = "tauri://blur", t.WINDOW_SCALE_FACTOR_CHANGED = "tauri://scale-change", t.WINDOW_THEME_CHANGED = "tauri://theme-changed", t.WINDOW_CREATED = "tauri://window-created", t.WEBVIEW_CREATED = "tauri://webview-created", t.DRAG_ENTER = "tauri://drag-enter", t.DRAG_OVER = "tauri://drag-over", t.DRAG_DROP = "tauri://drag-drop", t.DRAG_LEAVE = "tauri://drag-leave";
})(c || (c = {}));
async function ge(t, e) {
  window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(t, e), await s("plugin:event|unlisten", {
    event: t,
    eventId: e
  });
}
async function $(t, e, i) {
  var n;
  const a = typeof i?.target == "string" ? { kind: "AnyLabel", label: i.target } : (n = i?.target) !== null && n !== void 0 ? n : { kind: "Any" };
  return s("plugin:event|listen", {
    event: t,
    target: a,
    handler: Be(e)
  }).then((l) => async () => ge(t, l));
}
async function K(t, e, i) {
  return $(t, (n) => {
    ge(t, n.id), e(n);
  }, i);
}
async function ye(t, e) {
  await s("plugin:event|emit", {
    event: t,
    payload: e
  });
}
async function be(t, e, i) {
  await s("plugin:event|emit_to", {
    target: typeof t == "string" ? { kind: "AnyLabel", label: t } : t,
    event: e,
    payload: i
  });
}
class L extends He {
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
      rgba: B(e),
      width: i,
      height: n
    }).then((a) => new L(a));
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
      bytes: B(e)
    }).then((i) => new L(i));
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
    return s("plugin:image|from_path", { path: e }).then((i) => new L(i));
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
function B(t) {
  return t == null ? null : typeof t == "string" ? t : t instanceof L ? t.rid : t;
}
var J;
(function(t) {
  t[t.Critical = 1] = "Critical", t[t.Informational = 2] = "Informational";
})(J || (J = {}));
class $e {
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
var ne;
(function(t) {
  t.None = "none", t.Normal = "normal", t.Indeterminate = "indeterminate", t.Paused = "paused", t.Error = "error";
})(ne || (ne = {}));
function pe() {
  return new U(window.__TAURI_INTERNALS__.metadata.currentWindow.label, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  });
}
async function Q() {
  return s("plugin:window|get_all_windows").then((t) => t.map((e) => new U(e, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  })));
}
const V = ["tauri://created", "tauri://error"];
class U {
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
    return (i = (await Q()).find((n) => n.label === e)) !== null && i !== void 0 ? i : null;
  }
  /**
   * Get an instance of `Window` for the current window.
   */
  static getCurrent() {
    return pe();
  }
  /**
   * Gets a list of instances of `Window` for all available windows.
   */
  static async getAll() {
    return Q();
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
    for (const e of await Q())
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
    } : $(e, i, {
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
    } : K(e, i, {
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
    if (V.includes(e)) {
      for (const n of this.listeners[e] || [])
        n({
          event: e,
          id: -1,
          payload: i
        });
      return;
    }
    return ye(e, i);
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
    if (V.includes(i)) {
      for (const a of this.listeners[i] || [])
        a({
          event: i,
          id: -1,
          payload: n
        });
      return;
    }
    return be(e, i, n);
  }
  /** @ignore */
  _handleTauriEvent(e, i) {
    return V.includes(e) ? (e in this.listeners ? this.listeners[e].push(i) : this.listeners[e] = [i], !0) : !1;
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
    }).then((e) => new h(e));
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
    }).then((e) => new h(e));
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
    }).then((e) => new W(e));
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
    }).then((e) => new W(e));
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
    return e && (e === J.Critical ? i = { type: "Critical" } : i = { type: "Informational" }), s("plugin:window|request_user_attention", {
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
      value: e instanceof S ? e : new S(e)
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
      value: e instanceof S ? e : e ? new S(e) : null
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
      value: e instanceof S ? e : e ? new S(e) : null
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
      value: e instanceof x ? e : new x(e)
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
      value: B(e)
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
      value: e instanceof x ? e : new x(e)
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
      value: e ? B(e) : void 0
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
    return this.listen(c.WINDOW_RESIZED, (i) => {
      i.payload = new W(i.payload), e(i);
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
    return this.listen(c.WINDOW_MOVED, (i) => {
      i.payload = new h(i.payload), e(i);
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
    return this.listen(c.WINDOW_CLOSE_REQUESTED, async (i) => {
      const n = new $e(i);
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
    const i = await this.listen(c.DRAG_ENTER, (r) => {
      e({
        ...r,
        payload: {
          type: "enter",
          paths: r.payload.paths,
          position: new h(r.payload.position)
        }
      });
    }), n = await this.listen(c.DRAG_OVER, (r) => {
      e({
        ...r,
        payload: {
          type: "over",
          position: new h(r.payload.position)
        }
      });
    }), a = await this.listen(c.DRAG_DROP, (r) => {
      e({
        ...r,
        payload: {
          type: "drop",
          paths: r.payload.paths,
          position: new h(r.payload.position)
        }
      });
    }), l = await this.listen(c.DRAG_LEAVE, (r) => {
      e({ ...r, payload: { type: "leave" } });
    });
    return () => {
      i(), a(), n(), l();
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
    const i = await this.listen(c.WINDOW_FOCUS, (a) => {
      e({ ...a, payload: !0 });
    }), n = await this.listen(c.WINDOW_BLUR, (a) => {
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
    return this.listen(c.WINDOW_SCALE_FACTOR_CHANGED, e);
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
    return this.listen(c.WINDOW_THEME_CHANGED, e);
  }
}
var se;
(function(t) {
  t.Disabled = "disabled", t.Throttle = "throttle", t.Suspend = "suspend";
})(se || (se = {}));
var ae;
(function(t) {
  t.Default = "default", t.FluentOverlay = "fluentOverlay";
})(ae || (ae = {}));
var re;
(function(t) {
  t.AppearanceBased = "appearanceBased", t.Light = "light", t.Dark = "dark", t.MediumLight = "mediumLight", t.UltraDark = "ultraDark", t.Titlebar = "titlebar", t.Selection = "selection", t.Menu = "menu", t.Popover = "popover", t.Sidebar = "sidebar", t.HeaderView = "headerView", t.Sheet = "sheet", t.WindowBackground = "windowBackground", t.HudWindow = "hudWindow", t.FullScreenUI = "fullScreenUI", t.Tooltip = "tooltip", t.ContentBackground = "contentBackground", t.UnderWindowBackground = "underWindowBackground", t.UnderPageBackground = "underPageBackground", t.Mica = "mica", t.Blur = "blur", t.Acrylic = "acrylic", t.Tabbed = "tabbed", t.TabbedDark = "tabbedDark", t.TabbedLight = "tabbedLight";
})(re || (re = {}));
var oe;
(function(t) {
  t.FollowsWindowActiveState = "followsWindowActiveState", t.Active = "active", t.Inactive = "inactive";
})(oe || (oe = {}));
function Ue(t) {
  return t === null ? null : {
    name: t.name,
    scaleFactor: t.scaleFactor,
    position: new h(t.position),
    size: new W(t.size),
    workArea: {
      position: new h(t.workArea.position),
      size: new W(t.workArea.size)
    }
  };
}
async function Ge() {
  return s("plugin:window|primary_monitor").then(Ue);
}
function fe() {
  return new X(pe(), window.__TAURI_INTERNALS__.metadata.currentWebview.label, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  });
}
async function le() {
  return s("plugin:webview|get_all_webviews").then((t) => t.map((e) => new X(new U(e.windowLabel, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  }), e.label, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  })));
}
const j = ["tauri://created", "tauri://error"];
class X {
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
    return (i = (await le()).find((n) => n.label === e)) !== null && i !== void 0 ? i : null;
  }
  /**
   * Get an instance of `Webview` for the current webview.
   */
  static getCurrent() {
    return fe();
  }
  /**
   * Gets a list of instances of `Webview` for all available webviews.
   */
  static async getAll() {
    return le();
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
    } : $(e, i, {
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
    } : K(e, i, {
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
    if (j.includes(e)) {
      for (const n of this.listeners[e] || [])
        n({
          event: e,
          id: -1,
          payload: i
        });
      return;
    }
    return ye(e, i);
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
    if (j.includes(i)) {
      for (const a of this.listeners[i] || [])
        a({
          event: i,
          id: -1,
          payload: n
        });
      return;
    }
    return be(e, i, n);
  }
  /** @ignore */
  _handleTauriEvent(e, i) {
    return j.includes(e) ? (e in this.listeners ? this.listeners[e].push(i) : this.listeners[e] = [i], !0) : !1;
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
    }).then((e) => new h(e));
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
    }).then((e) => new W(e));
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
      value: e instanceof S ? e : new S(e)
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
      value: e instanceof x ? e : new x(e)
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
    const i = await this.listen(c.DRAG_ENTER, (r) => {
      e({
        ...r,
        payload: {
          type: "enter",
          paths: r.payload.paths,
          position: new h(r.payload.position)
        }
      });
    }), n = await this.listen(c.DRAG_OVER, (r) => {
      e({
        ...r,
        payload: {
          type: "over",
          position: new h(r.payload.position)
        }
      });
    }), a = await this.listen(c.DRAG_DROP, (r) => {
      e({
        ...r,
        payload: {
          type: "drop",
          paths: r.payload.paths,
          position: new h(r.payload.position)
        }
      });
    }), l = await this.listen(c.DRAG_LEAVE, (r) => {
      e({ ...r, payload: { type: "leave" } });
    });
    return () => {
      i(), a(), n(), l();
    };
  }
}
function A() {
  const t = fe();
  return new D(t.label, { skip: !0 });
}
async function ue() {
  return s("plugin:window|get_all_windows").then((t) => t.map((e) => new D(e, {
    // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
    skip: !0
  })));
}
class D {
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
    const n = (i = (await ue()).find((a) => a.label === e)) !== null && i !== void 0 ? i : null;
    return n ? new D(n.label, { skip: !0 }) : null;
  }
  /**
   * Get an instance of `Webview` for the current webview.
   */
  static getCurrent() {
    return A();
  }
  /**
   * Gets a list of instances of `Webview` for all available webviews.
   */
  static async getAll() {
    return ue();
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
    } : $(e, i, {
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
    } : K(e, i, {
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
Qe(D, [U, X]);
function Qe(t, e) {
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
const R = /* @__PURE__ */ new Map(), Ve = () => navigator.platform.toLowerCase().includes("mac") || navigator.userAgent.toLowerCase().includes("mac"), je = (t) => {
  if (!t || t.trim() === "") return !1;
  try {
    return !!(t.startsWith("/") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("tauri://"));
  } catch {
    return !1;
  }
}, Je = async () => {
  let t = 1920, e = 1080;
  try {
    const i = await Ge();
    if (i?.size) {
      const n = i.scaleFactor || 1;
      t = i.size.width / n, e = i.size.height / n;
    }
  } catch (i) {
    console.warn("Failed to get monitor info, using defaults:", i);
  }
  return { screenWidth: t, screenHeight: e };
}, me = async (t, e, i) => {
  const n = i?.padding ?? 20;
  if (i?.x !== void 0 && i?.y !== void 0)
    return { x: i.x, y: i.y };
  const { screenWidth: a, screenHeight: l } = await Je();
  switch (i?.position ?? "right-bottom") {
    case "right-bottom":
      return {
        x: a - t - n,
        y: l - e - n
      };
    case "right-top":
      return {
        x: a - t - n,
        y: n
      };
    case "left-bottom":
      return {
        x: n,
        y: l - e - n
      };
    case "left-top":
      return {
        x: n,
        y: n
      };
    case "center":
      return {
        x: (a - t) / 2,
        y: (l - e) / 2
      };
    default:
      return {
        x: a - t - n,
        y: l - e - n
      };
  }
}, Ze = async (t) => {
  const e = String(t.id), i = d.getState();
  if (i.isWindowActive(e)) {
    console.log(`Notice window already open for message: ${e}`);
    return;
  }
  const n = T(), a = `notice-${e}`;
  let l = `${n.routePrefix}/${t.type}?id=${t.id}`;
  je(l) || (console.warn(`Invalid window URL: ${l}. Using fallback 404 page.`), l = n.notFoundUrl || "/404");
  const r = n.autoSize ?? !0, g = t.min_width || n.defaultWidth, m = r ? n.maxHeight ?? 800 : t.min_height || n.defaultHeight, y = t.decorations ?? n.defaultDecorations ?? !0, z = t.min_height || n.defaultHeight, { x: M, y: O } = await me(g, z, t.windowPosition);
  try {
    const w = {
      url: l,
      title: t.title,
      width: g,
      height: m,
      x: M,
      y: O,
      resizable: !0,
      skipTaskbar: !1,
      alwaysOnTop: !0
    };
    r && (w.visible = !1), y ? w.decorations = !0 : Ve() ? (w.decorations = !0, w.titleBarStyle = "overlay", w.hiddenTitle = !0) : (w.decorations = !1, w.transparent = !0);
    const b = new D(a, w);
    R.set(e, b), i.addActiveWindow(e);
    let u = null;
    const _ = n.loadTimeout ?? 1e4;
    !y && _ > 0 && (u = setTimeout(async () => {
      console.warn(`Notice window ${a} load timeout - auto closing`);
      try {
        await b.close();
      } catch {
      }
    }, _)), b.once("tauri://created", () => {
      u && (clearTimeout(u), u = null), console.log(`Notice window created successfully: ${a}`);
    }), b.once("tauri://error", async (o) => {
      if (console.error(`Notice window error: ${a}`, o), u && (clearTimeout(u), u = null), !y)
        try {
          await b.close();
        } catch {
        }
    }), b.once("tauri://destroyed", async () => {
      u && (clearTimeout(u), u = null), R.delete(e), i.removeActiveWindow(e), await i.markMessageAsShown(e), i.clearCurrent();
    }), console.log(`Created notice window: ${a} (autoSize: ${r}, visible: ${!r})`);
  } catch (w) {
    console.error("Failed to create notice window:", w), i.removeActiveWindow(e), i.clearCurrent();
  }
}, ee = async (t) => {
  const e = String(t), i = R.get(e), n = d.getState();
  if (i)
    try {
      await i.close(), R.delete(e), n.removeActiveWindow(e), await n.markMessageAsShown(e), n.clearCurrent(), console.log(`Closed notice window: ${e}`);
    } catch (a) {
      console.error("Failed to close notice window:", a);
    }
}, Ye = async () => {
  const t = Array.from(R.keys()).map(
    (e) => ee(e)
  );
  await Promise.all(t);
}, Ke = () => {
  let t = null;
  d.subscribe((e) => {
    const i = e.currentMessage;
    i && i !== t ? (t = i, Ze(i)) : i || (t = null);
  }), console.log("Notice window system initialized");
}, ot = () => {
  const t = d((i) => i.currentMessage);
  return { closeNotice: H(async () => {
    t && await ee(t.id);
  }, [t]) };
}, lt = () => {
  const t = d((i) => i.hideMessage);
  return { hideNotice: H(
    async (i) => {
      await t(i), await ee(i);
    },
    [t]
  ) };
}, ut = () => {
  const t = d((i) => i.clearOnLogout);
  return { hideAllNotices: H(async () => {
    await Ye(), await t();
  }, [t]) };
}, ct = () => {
  const t = d(F.queueLength), e = d(F.currentMessage), i = d(F.isProcessing), n = d(F.queue);
  return {
    queueLength: t,
    currentMessage: e,
    isProcessing: i,
    queue: n
  };
}, _e = ze({ windowReady: !0 }), dt = () => Ae(_e), Xe = async (t) => {
  try {
    const e = T(), i = e.defaultWidth || 400, n = e.maxHeight ?? 800, a = e.defaultHeight || 300, l = 32, r = Math.ceil(t) + l, g = Math.max(a, Math.min(r, n)), m = A();
    await m.setSize(new Z(i, g));
    const { x: y, y: z } = await me(i, g);
    await m.setPosition(new Y(y, z)), await m.show(), console.log(`[NoticeLayout] Auto-sized window to ${i}x${g} (content=${Math.ceil(t)}, chrome=${l})`);
  } catch (e) {
    console.error("[NoticeLayout] Failed to auto-size, showing window as-is:", e);
    try {
      await A().show();
    } catch {
    }
  }
}, wt = ({ children: t, onLoad: e, onClose: i }) => {
  const [n, a] = E(null), [l, r] = E(!0), [g, m] = E(null), [y, z] = E(!1), M = ie(null), O = ie(!1), w = T(), b = w.autoSize ?? !0;
  return P(() => {
    b || z(!0);
  }, [b]), P(() => {
    (async () => {
      try {
        const o = new URLSearchParams(window.location.search).get("id");
        if (!o) {
          m("No message ID provided"), r(!1), setTimeout(async () => {
            try {
              await A().close();
            } catch (v) {
              console.error("Failed to close window:", v);
            }
          }, 1e3);
          return;
        }
        const I = await he(o);
        if (!I) {
          console.log(`Message ${o} not found in database, closing window`), m("Message not found"), r(!1), setTimeout(async () => {
            try {
              await A().close();
            } catch (v) {
              console.error("Failed to close window:", v);
            }
          }, 500);
          return;
        }
        a(I), r(!1), e && e(I);
      } catch (_) {
        console.error("Failed to load message:", _), m("Failed to load message"), r(!1), setTimeout(async () => {
          try {
            await A().close();
          } catch (o) {
            console.error("Failed to close window:", o);
          }
        }, 1e3);
      }
    })();
  }, [e]), P(() => {
    if (!b || !n || y || O.current) return;
    let u;
    const _ = requestAnimationFrame(() => {
      u = requestAnimationFrame(() => {
        if (!M.current || O.current) return;
        O.current = !0;
        const o = M.current, v = T().defaultWidth || 400, N = {
          position: o.style.position,
          top: o.style.top,
          left: o.style.left,
          width: o.style.width,
          height: o.style.height,
          overflow: o.style.overflow
        };
        o.style.position = "fixed", o.style.top = "0", o.style.left = "0", o.style.width = `${v}px`, o.style.height = "auto", o.style.overflow = "visible", o.offsetHeight;
        const te = o.scrollHeight;
        console.log(`[NoticeLayout] Measured content height: ${te}px (container detached at ${v}px width)`), o.style.position = N.position, o.style.top = N.top, o.style.left = N.left, o.style.width = N.width, o.style.height = N.height, o.style.overflow = N.overflow, Xe(te).then(() => {
          z(!0);
        });
      });
    });
    return () => {
      cancelAnimationFrame(_), u !== void 0 && cancelAnimationFrame(u);
    };
  }, [b, n, y]), P(() => {
    if (!b || y) return;
    const u = w.autoSizeTimeout ?? 3e3, _ = setTimeout(async () => {
      if (!y) {
        console.warn("[NoticeLayout] Auto-size timeout reached, showing window as-is");
        try {
          await A().show();
        } catch {
        }
        z(!0);
      }
    }, u);
    return () => clearTimeout(_);
  }, [b, y, w.autoSizeTimeout]), P(() => {
    if (!n || !i) return;
    const u = () => {
      i(n);
    };
    return window.addEventListener("beforeunload", u), () => window.removeEventListener("beforeunload", u);
  }, [n, i]), l ? /* @__PURE__ */ C("div", { style: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif"
  }, children: "Loading..." }) : g ? /* @__PURE__ */ C("div", { style: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#ef4444"
  }, children: g }) : n ? /* @__PURE__ */ C(_e.Provider, { value: { windowReady: y }, children: /* @__PURE__ */ C(
    "div",
    {
      ref: M,
      style: y ? { height: "100vh" } : void 0,
      children: t(n)
    }
  ) }) : /* @__PURE__ */ C("div", { style: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#ef4444"
  }, children: "Closing window..." });
}, ht = async () => {
  we(), Ke();
  const { initializeFromDatabase: t } = d.getState();
  await t(), console.log("Tauri Notice System initialized");
}, gt = async (t) => {
  await d.getState().deleteMessage(t);
}, yt = async (t) => {
  await d.getState().hideMessage(t);
}, bt = async (t) => {
  await d.getState().markMessageAsShown(t);
};
export {
  wt as NoticeLayout,
  me as calculateWindowPosition,
  Ye as closeAllNoticeWindows,
  ee as closeNoticeWindow,
  Ze as createNoticeWindow,
  gt as deleteMessageById,
  Je as getLogicalScreenSize,
  he as getMessage,
  T as getNoticeConfig,
  Ie as getPendingMessages,
  yt as hideMessageById,
  we as initializeDatabase,
  ht as initializeNoticeSystem,
  Ke as initializeNoticeWindowSystem,
  bt as markMessageAsShown,
  F as messageQueueSelectors,
  at as setNoticeConfig,
  ot as useCloseNotice,
  ut as useHideAllNotices,
  lt as useHideNotice,
  ct as useMessageQueue,
  d as useMessageQueueStore,
  rt as useNoticeWindow,
  dt as useNoticeWindowContext
};
//# sourceMappingURL=index.js.map
