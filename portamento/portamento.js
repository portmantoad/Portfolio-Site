var portamento = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// src/props.js
	var STYLE_PROPS = {
		minHeight: "min-height",
		height: "height",
		blend: "mix-blend-mode"
	};
	var STYLE_KEYS = Object.keys(STYLE_PROPS);
	var LAYER_KEYS = [
		"colStart",
		"colEnd",
		"alignX",
		"alignY",
		"translateX",
		"translateY",
		"rotate",
		"scale",
		"bleed",
		"fadeDuration",
		"fluid",
		"fluidFrom",
		"fluidTo",
		...STYLE_KEYS
	];
	var SECTION_KEYS = [
		"fadeDistance",
		"fadeDuration",
		"triggerInset",
		"stackBelow",
		"fullWidthBelow",
		...STYLE_KEYS
	];
	var GROUP_KEYS = [
		"stackBelow",
		"fullWidthBelow",
		"fluid",
		"fluidFrom",
		"fluidTo",
		...STYLE_KEYS
	];
	var ROW_KEYS = [
		"rowGap",
		"stackBelow",
		"fullWidthBelow",
		"fluid",
		"fluidFrom",
		"fluidTo",
		...STYLE_KEYS
	];
	var ANIM_KEYS = [
		"xStart",
		"xMid",
		"xEnd",
		"yStart",
		"yMid",
		"yEnd",
		"scaleStart",
		"scaleMid",
		"scaleEnd",
		"rotateStart",
		"rotateMid",
		"rotateEnd",
		"skewStart",
		"skewMid",
		"skewEnd",
		"filterStart",
		"filterMid",
		"filterEnd",
		"opacityStart",
		"opacityMid",
		"opacityEnd",
		"parallax",
		"sectionParallax",
		"pinDistance",
		"range",
		"ease",
		"timeline",
		"composition",
		"inRange",
		"outRange",
		"inEase",
		"outEase",
		"transformRange",
		"transformEase",
		"transformTimeline",
		"transformComposition",
		"filterRange",
		"filterEase",
		"filterTimeline",
		"filterComposition",
		"opacityRange",
		"opacityEase",
		"opacityTimeline",
		"parallaxRange",
		"parallaxTimeline",
		"parallaxComposition",
		"extra",
		"extraRange",
		"extraTimeline",
		"extraComposition",
		"blend"
	];
	var LAYER_ANIM_KEYS = ANIM_KEYS.filter((key) => key !== "blend");
	function toVarName(key) {
		return "--pt-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
	}
	function toCssName(key) {
		return STYLE_PROPS[key] ?? toVarName(key);
	}
	var WIDTH_PRESETS = {
		xs: 375,
		sm: 640,
		md: 768,
		lg: 1024,
		xl: 1280,
		"2xl": 1536
	};
	var customWidths = {};
	var htmlWidths = {
		source: null,
		map: {}
	};
	function defineWidths(widths) {
		for (const [name, px] of Object.entries(widths)) customWidths[name] = parseFloat(px);
	}
	function namedWidth(name) {
		if (name in customWidths) return customWidths[name];
		if (typeof document !== "undefined") {
			const source = document.documentElement?.dataset.ptWidths ?? "";
			if (source !== htmlWidths.source) {
				htmlWidths = {
					source,
					map: {}
				};
				for (const part of source.trim().split(/\s+/).filter(Boolean)) {
					const at = part.indexOf(":");
					htmlWidths.map[part.slice(0, at)] = parseFloat(part.slice(at + 1));
				}
			}
			if (name in htmlWidths.map) return htmlWidths.map[name];
		}
		return WIDTH_PRESETS[name];
	}
	function splitTopLevel(text) {
		const parts = [];
		let depth = 0;
		let part = "";
		for (const c of text.trim()) {
			if (c === "(") depth++;
			if (c === ")") depth--;
			if (/\s/.test(c) && depth === 0) {
				if (part) parts.push(part);
				part = "";
			} else part += c;
		}
		if (part) parts.push(part);
		return parts;
	}
	var RESPONSIVE_KEYS = /* @__PURE__ */ new Set([
		"colStart",
		"colEnd",
		"alignX",
		"alignY",
		"translateX",
		"translateY",
		"rotate",
		"scale",
		"bleed",
		"minHeight",
		"height",
		"rowGap",
		"xStart",
		"xMid",
		"xEnd",
		"yStart",
		"yMid",
		"yEnd",
		"scaleStart",
		"scaleMid",
		"scaleEnd",
		"rotateStart",
		"rotateMid",
		"rotateEnd",
		"skewStart",
		"skewMid",
		"skewEnd",
		"opacityStart",
		"opacityMid",
		"opacityEnd",
		"parallax",
		"sectionParallax"
	]);
	function parseWidthMap(value) {
		let entries;
		if (value && typeof value === "object" && !Array.isArray(value)) entries = Object.entries(value);
		else if (typeof value === "string" && value.includes(":")) entries = splitTopLevel(value).map((part) => {
			const at = part.indexOf(":");
			return [part.slice(0, at), part.slice(at + 1)];
		});
		else return null;
		const stops = [];
		for (const [width, v] of entries) {
			const px = /^\d+(\.\d+)?(px)?$/.test(width) ? parseFloat(width) : namedWidth(width);
			if (!Number.isFinite(px)) throw new Error(`portamento: unknown width "${width}" in a width map (use px, ${Object.keys(WIDTH_PRESETS).join(", ")}, or a name from defineWidths())`);
			stops.push([px, String(v)]);
		}
		return stops.sort((a, b) => a[0] - b[0]);
	}
	var isResponsive = (key, value) => RESPONSIVE_KEYS.has(key) && parseWidthMap(value) !== null;
	function widthMapValue(stops) {
		if (stops.length === 1) return stops[0][1];
		let expr = stops[0][1];
		for (let i = 1; i < stops.length; i++) {
			const [w0, v0] = stops[i - 1];
			const [w1, v1] = stops[i];
			if (w1 === w0) {
				expr += ` + (${v1} - ${v0}) * clamp(0, tan(atan2(var(--_pt-vw, 100vw) - ${w0}px + 1px, 1px)) * 1e5, 1)`;
				continue;
			}
			expr += ` + (${v1} - ${v0}) * clamp(0, tan(atan2(var(--_pt-vw, 100vw) - ${w0}px, ${w1 - w0}px)), 1)`;
		}
		return `calc(${expr})`;
	}
	function widthMapStep(stops, width) {
		let value = stops[0][1];
		for (const [w, v] of stops) if (width >= w) value = v;
		return value;
	}
	function toVars(options, keys, { width } = {}) {
		const vars = {};
		for (const key of keys) {
			const value = options[key];
			if (value == null || value === false) continue;
			if (key === "bleed" && (value === true || value === "")) continue;
			if (key === "triggerInset" && /\S\s+\S/.test(String(value).trim())) {
				const [top, bottom] = splitTopLevel(String(value));
				vars["--pt-trigger-inset-top"] = top;
				vars["--pt-trigger-inset-bottom"] = bottom;
				continue;
			}
			if (isResponsive(key, value)) {
				const px = (v) => key in STYLE_PROPS && /^-?[\d.]+$/.test(v) ? `${v}px` : v;
				const stops = parseWidthMap(value).map(([w, v]) => [w, px(v)]);
				vars[toCssName(key)] = width == null ? widthMapValue(stops) : widthMapStep(stops, width);
				if (key === "colStart" || key === "colEnd") vars["--_pt-fluid-cols"] = "1";
				continue;
			}
			const bare = typeof value === "number" || /^-?[\d.]+$/.test(value);
			vars[toCssName(key)] = bare && key in STYLE_PROPS && key !== "blend" ? `${value}px` : String(value);
		}
		return vars;
	}
	// src/elements.js
	var LAYER_ALL_KEYS = [...LAYER_KEYS, ...LAYER_ANIM_KEYS];
	var toAttr = (key) => key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
	var applied = /* @__PURE__ */ new WeakMap();
	var slides = typeof CSS === "undefined" || CSS.supports("width", "calc(1px * tan(atan2(1px, 1px)))");
	var stepped = /* @__PURE__ */ new Map();
	var resizing = 0;
	if (!slides) addEventListener("resize", () => {
		cancelAnimationFrame(resizing);
		resizing = requestAnimationFrame(() => {
			for (const [el, keys] of stepped) el.isConnected ? syncVars(el, keys) : stepped.delete(el);
		});
	});
	function syncVars(el, keys) {
		const options = {};
		for (const key of keys) {
			const value = el.getAttribute(toAttr(key));
			if (value != null) options[key] = value;
		}
		const vars = toVars(options, keys, slides ? {} : { width: innerWidth });
		if (!slides) {
			if (Object.values(options).some((value) => value.includes(":"))) stepped.set(el, keys);
			else stepped.delete(el);
		}
		const mine = applied.get(el) ?? /* @__PURE__ */ new Set();
		applied.set(el, mine);
		for (const name of mine) if (!(name in vars)) {
			el.style.removeProperty(name);
			mine.delete(name);
		}
		for (const [name, value] of Object.entries(vars)) {
			el.style.setProperty(name, value);
			mine.add(name);
		}
	}
	var isBlankText = (node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim();
	function reveal() {
		const html = document.documentElement;
		if (customElements.get("pt-layer")) return;
		html.setAttribute("data-pt-revealing", "");
		const value = getComputedStyle(html).getPropertyValue("--pt-reveal-duration").trim();
		const ms = value.endsWith("ms") ? parseFloat(value) : value ? parseFloat(value) * 1e3 : 600;
		setTimeout(() => html.removeAttribute("data-pt-revealing"), (Number.isFinite(ms) ? ms : 600) + 100);
	}
	function defineElements() {
		if (typeof customElements === "undefined") return;
		reveal();
		class PtSection extends HTMLElement {
			static observedAttributes = SECTION_KEYS.map(toAttr);
			connectedCallback() {
				syncVars(this, SECTION_KEYS);
			}
			attributeChangedCallback() {
				syncVars(this, SECTION_KEYS);
			}
		}
		class PtGroup extends HTMLElement {
			static observedAttributes = GROUP_KEYS.map(toAttr);
			connectedCallback() {
				syncVars(this, GROUP_KEYS);
			}
			attributeChangedCallback() {
				syncVars(this, GROUP_KEYS);
			}
		}
		class PtRow extends HTMLElement {
			static observedAttributes = ROW_KEYS.map(toAttr);
			connectedCallback() {
				syncVars(this, ROW_KEYS);
			}
			attributeChangedCallback() {
				syncVars(this, ROW_KEYS);
			}
		}
		class PtLayer extends HTMLElement {
			static observedAttributes = LAYER_ALL_KEYS.map(toAttr);
			#observer = null;
			#animClass = false;
			#sync() {
				syncVars(this, LAYER_ALL_KEYS);
				const animated = LAYER_ANIM_KEYS.some((key) => this.hasAttribute(toAttr(key)));
				if (animated && !this.classList.contains("pt-anim")) {
					this.classList.add("pt-anim");
					this.#animClass = true;
				} else if (!animated && this.#animClass) {
					this.classList.remove("pt-anim");
					this.#animClass = false;
				}
			}
			connectedCallback() {
				this.#sync();
				if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => this.#wrap(), { once: true });
				else this.#wrap();
				this.#observer = new MutationObserver(() => this.#wrap());
				this.#observer.observe(this, { childList: true });
			}
			disconnectedCallback() {
				this.#observer?.disconnect();
				this.#observer = null;
			}
			attributeChangedCallback() {
				this.#sync();
			}
			#wrap() {
				let inner = Array.from(this.children).find((child) => child.classList.contains("pt-layer__inner"));
				const strays = Array.from(this.childNodes).filter((node) => node !== inner && !isBlankText(node));
				if (inner && strays.length === 0) return;
				if (!inner) {
					inner = document.createElement("div");
					inner.className = "pt-layer__inner";
				}
				inner.append(...strays);
				if (inner.parentNode !== this) this.append(inner);
			}
		}
		class PtAnim extends HTMLElement {
			static observedAttributes = ANIM_KEYS.map(toAttr);
			connectedCallback() {
				syncVars(this, ANIM_KEYS);
			}
			attributeChangedCallback() {
				syncVars(this, ANIM_KEYS);
			}
		}
		for (const [name, ctor] of [
			["pt-section", PtSection],
			["pt-group", PtGroup],
			["pt-row", PtRow],
			["pt-layer", PtLayer],
			["pt-anim", PtAnim]
		]) if (!customElements.get(name)) customElements.define(name, ctor);
	}
	defineElements();
	// src/fallback.js
	function initScrollFallback({ root = document, rootMargin } = {}) {
		if (typeof window === "undefined" || !("IntersectionObserver" in window)) return () => {};
		const hasTimelines = CSS.supports("animation-timeline: view()");
		const hasStyleQueries = supportsStyleQueries();
		const cleanups = [];
		if (!hasStyleQueries) cleanups.push(stackFallback(root));
		if (!CSS.supports("width", "calc(1px * tan(atan2(1px, 1px)))")) cleanups.push(fullWidthFallback(root));
		if (!(hasTimelines && hasStyleQueries)) {
			const selector = hasTimelines ? ".pt-section--timed, pt-section[timed]" : ".pt-section, pt-section";
			cleanups.push(inViewFallback(root, selector, rootMargin));
		}
		return () => cleanups.forEach((stop) => stop());
	}
	function inViewFallback(root, selector, rootMargin) {
		const observers = /* @__PURE__ */ new Map();
		const observerFor = (margin) => {
			if (!observers.has(margin)) observers.set(margin, new IntersectionObserver((entries) => {
				for (const entry of entries) entry.target.dataset.ptInView = String(entry.isIntersecting);
			}, { rootMargin: margin }));
			return observers.get(margin);
		};
		for (const section of root.querySelectorAll(selector)) observerFor(rootMargin ?? insetToRootMargin(section)).observe(section);
		return () => {
			for (const observer of observers.values()) observer.disconnect();
		};
	}
	function stackFallback(root) {
		const stops = [];
		const groups = root.querySelectorAll(".pt-group, .pt-section, .pt-row, pt-group, pt-section, pt-row");
		for (const group of groups) {
			const width = lengthToPx(getComputedStyle(group).getPropertyValue("--pt-stack-below"));
			if (!(width > 0)) continue;
			const isRow = group.matches(".pt-row, pt-row");
			const query = matchMedia(`(max-width: ${width - .02}px)`);
			const sync = () => {
				group.toggleAttribute("data-pt-stacked", query.matches);
				if (isRow) group.toggleAttribute("data-pt-unstacked", !query.matches);
			};
			sync();
			query.addEventListener("change", sync);
			stops.push(() => {
				query.removeEventListener("change", sync);
				group.removeAttribute("data-pt-stacked");
				group.removeAttribute("data-pt-unstacked");
			});
		}
		return () => stops.forEach((stop) => stop());
	}
	function fullWidthFallback(root) {
		const queries = /* @__PURE__ */ new Map();
		const px = /* @__PURE__ */ new Map();
		for (const layer of root.querySelectorAll(".pt-layer, pt-layer")) {
			const value = getComputedStyle(layer).getPropertyValue("--pt-full-width-below").trim();
			if (!value) continue;
			if (!px.has(value)) px.set(value, lengthToPx(value));
			const width = px.get(value);
			if (!(width > 0)) continue;
			if (!queries.has(width)) queries.set(width, [matchMedia(`(max-width: ${width - .02}px)`), []]);
			queries.get(width)[1].push(layer);
		}
		const stops = [];
		for (const [query, layers] of queries.values()) {
			const sync = () => layers.forEach((layer) => layer.toggleAttribute("data-pt-full-width", query.matches));
			sync();
			query.addEventListener("change", sync);
			stops.push(() => {
				query.removeEventListener("change", sync);
				layers.forEach((layer) => layer.removeAttribute("data-pt-full-width"));
			});
		}
		return () => stops.forEach((stop) => stop());
	}
	function lengthToPx(value) {
		value = value.trim();
		if (!value) return 0;
		const probe = document.createElement("div");
		probe.style.cssText = `position:absolute;visibility:hidden;height:0;width:${value}`;
		document.body.append(probe);
		const px = probe.getBoundingClientRect().width;
		probe.remove();
		return px;
	}
	function insetToRootMargin(section) {
		const style = getComputedStyle(section);
		const margin = (name) => {
			const match = /^(-?[\d.]+)(d?vh|svh|lvh|px)?$/.exec(style.getPropertyValue(name).trim());
			if (!match) return "-50%";
			const [, number, unit] = match;
			return `${-parseFloat(number)}${unit === "px" ? "px" : "%"}`;
		};
		return `${margin("--_pt-inset-top")} 0px ${margin("--_pt-inset-bottom")} 0px`;
	}
	function supportsStyleQueries() {
		const style = document.createElement("style");
		style.textContent = "@container style(--pt-probe: 1) { .pt-probe { --pt-probe-ok: 1; } }";
		const parent = document.createElement("div");
		parent.style.setProperty("--pt-probe", "1");
		const child = parent.appendChild(document.createElement("div"));
		child.className = "pt-probe";
		document.head.append(style);
		document.documentElement.append(parent);
		const ok = getComputedStyle(child).getPropertyValue("--pt-probe-ok").trim() === "1";
		parent.remove();
		style.remove();
		return ok;
	}
	// src/anchor.js
	var CANDIDATES = [
		".pt-layer:not(.pt-layer--pinned)",
		"pt-layer:not([pinned])",
		".pt-row",
		"pt-row",
		".pt-group",
		"pt-group",
		".pt-section",
		"pt-section"
	].join(", ");
	function keepPlaceOnResize({ root = document } = {}) {
		if (typeof window === "undefined") return () => {};
		const html = document.documentElement;
		const ownAnchoring = html.style.overflowAnchor;
		html.style.overflowAnchor = "none";
		let place = null;
		let width = window.innerWidth;
		let timer = 0;
		let frame = 0;
		const remember = () => {
			const middle = window.innerHeight / 2;
			let best = null;
			for (const el of root.querySelectorAll(CANDIDATES)) {
				const r = el.getBoundingClientRect();
				if (r.height > 0 && r.top <= middle && r.bottom >= middle && (!best || r.height < best.height)) best = {
					el,
					height: r.height,
					at: (middle - r.top) / r.height
				};
			}
			place = best;
		};
		const restore = () => {
			frame = 0;
			if (!place?.el.isConnected) return;
			const r = place.el.getBoundingClientRect();
			const by = r.top + place.at * r.height - window.innerHeight / 2;
			if (Math.abs(by) >= 1) window.scrollBy({
				top: by,
				behavior: "instant"
			});
		};
		const onScroll = () => {
			clearTimeout(timer);
			timer = setTimeout(remember, 150);
		};
		const onResize = () => {
			if (window.innerWidth === width) return;
			width = window.innerWidth;
			clearTimeout(timer);
			if (!frame) frame = requestAnimationFrame(restore);
		};
		remember();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onResize);
			clearTimeout(timer);
			cancelAnimationFrame(frame);
			html.style.overflowAnchor = ownAnchoring;
		};
	}
	exports.defineWidths = defineWidths;
	exports.initScrollFallback = initScrollFallback;
	exports.keepPlaceOnResize = keepPlaceOnResize;
	return exports;
})({});
