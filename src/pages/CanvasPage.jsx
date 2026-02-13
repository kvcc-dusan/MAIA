// @maia:tabula (react-konva canvas)
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Line, Group, Rect, Text as KText, Arrow, Image as KImage, Circle } from "react-konva";
import { useSize } from "../hooks/useSize.js";

const dottedBg = {
  backgroundColor: "#000",
  backgroundImage: "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
  backgroundPosition: "-10px -10px",
};

const uid = () => Math.random().toString(36).slice(2, 9);

function worldPointer(stage) {
  const p = stage.getPointerPosition();
  const scale = stage.scaleX();
  return {
    x: (p.x - stage.x()) / scale,
    y: (p.y - stage.y()) / scale,
  };
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

/* -------------------------------------------
   Component
------------------------------------------- */
export default function CanvasBoard({ goHome }) {
  // layout
  const [wrapRef, size] = useSize();
  const stageRef = useRef(null);

  // view (pan & zoom)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const isPanningRef = useRef(false);

  // tools
  const [mode, setMode] = useState("select"); // select | draw | text
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [drawSize, setDrawSize] = useState(4);
  const [eraseOn, setEraseOn] = useState(false);

  // model
  const [strokes, setStrokes] = useState([]);            // {id, points[], color, size, erase}
  const [notes, setNotes] = useState([]);                // {id, x,y, w,h, text}
  const [images, setImages] = useState([]);              // {id, x,y, w,h, src}
  const [links, setLinks] = useState([]);                // {id, from, to}
  const [selectedId, setSelectedId] = useState(null);    // note or image id (prefixed)
  const linkingFromRef = useRef(null);                   // id while linking
  const [currentStrokeId, setCurrentStrokeId] = useState(null);

  // State ref to allow stable pushHistory
  const stateRef = useRef({ strokes, notes, images, links, stagePos, stageScale });
  useEffect(() => {
    stateRef.current = { strokes, notes, images, links, stagePos, stageScale };
  }, [strokes, notes, images, links, stagePos, stageScale]);

  // history
  const hist = useRef({ stack: [], idx: -1 });

  const pushHistory = useCallback(() => {
    const snapshot = deepClone(stateRef.current);
    const s = hist.current;
    s.stack = s.stack.slice(0, s.idx + 1).concat(snapshot).slice(-100);
    s.idx = s.stack.length - 1;
  }, []);

  const undo = () => {
    const s = hist.current;
    if (s.idx <= 0) return;
    s.idx -= 1;
    const snap = s.stack[s.idx];
    setStrokes(snap.strokes);
    setNotes(snap.notes);
    setImages(snap.images);
    setLinks(snap.links);
    setStagePos(snap.stagePos);
    setStageScale(snap.stageScale);
  };
  const redo = () => {
    const s = hist.current;
    if (s.idx >= s.stack.length - 1) return;
    s.idx += 1;
    const snap = s.stack[s.idx];
    setStrokes(snap.strokes);
    setNotes(snap.notes);
    setImages(snap.images);
    setLinks(snap.links);
    setStagePos(snap.stagePos);
    setStageScale(snap.stageScale);
  };

  // first snapshot
  useEffect(() => { pushHistory(); }, [pushHistory]);

  /* -------------------------------------------
     Pan & zoom
  ------------------------------------------- */
  const onWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const mousePointTo = worldPointer(stage);
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.08;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setStageScale(newScale);
    // keep mouse under cursor
    const newPos = {
      x: e.evt.offsetX - mousePointTo.x * newScale,
      y: e.evt.offsetY - mousePointTo.y * newScale,
    };
    setStagePos(newPos);
  };

  const onStageMouseDown = (e) => {
    const stage = stageRef.current;
    const target = e.target;
    // start panning if background
    if (target === stage) {
      isPanningRef.current = true;
      stage.container().style.cursor = "grabbing";
      return;
    }

    if (mode === "draw") {
      // begin stroke
      const id = uid();
      const p = worldPointer(stage);
      const stroke = {
        id,
        points: [p.x, p.y],
        color: drawColor,
        size: drawSize,
        erase: eraseOn,
      };
      setStrokes((s) => [...s, stroke]);
      setCurrentStrokeId(id);
    } else if (mode === "text") {
      // create sticky note at click
      if (target === stage) {
        const p = worldPointer(stage);
        const id = `n_${uid()}`;
        setNotes((arr) => [
          ...arr,
          { id, x: p.x, y: p.y, w: 240, h: 120, text: "Note…" },
        ]);
        setSelectedId(id);
        pushHistory();
      }
    } else if (mode === "select") {
      // start linking with Shift on a note
      const name = target?.attrs?.name || "";
      if (e.evt.shiftKey && name.startsWith("note:")) {
        linkingFromRef.current = name.split(":")[1];
      } else {
        if (name) setSelectedId(name.split(":")[1]);
        else setSelectedId(null);
      }
    }
  };

  const onStageMouseMove = (e) => {
    const stage = stageRef.current;

    // panning
    if (isPanningRef.current) {
      setStagePos((pos) => ({
        x: pos.x + e.evt.movementX,
        y: pos.y + e.evt.movementY,
      }));
      return;
    }

    // drawing
    if (mode === "draw" && currentStrokeId) {
      const p = worldPointer(stage);
      setStrokes((arr) =>
        arr.map((s) =>
          s.id === currentStrokeId
            ? { ...s, points: [...s.points, p.x, p.y] }
            : s
        )
      );
    }
  };

  const onStageMouseUp = (e) => {
    const stage = stageRef.current;

    // finish panning
    if (isPanningRef.current) {
      isPanningRef.current = false;
      stage.container().style.cursor = "default";
      pushHistory();
      return;
    }

    // finish drawing
    if (mode === "draw" && currentStrokeId) {
      setCurrentStrokeId(null);
      pushHistory();
      return;
    }

    // finish linking
    const from = linkingFromRef.current;
    if (from) {
      const t = e.target;
      const name = t?.attrs?.name || "";
      const onNote = name.startsWith("note:");
      if (onNote) {
        const to = name.split(":")[1];
        if (to && to !== from) {
          setLinks((ls) => [...ls, { id: uid(), from, to }]);
          pushHistory();
        }
      }
      linkingFromRef.current = null;
    }
  };

  /* -------------------------------------------
     Text editing (overlay textarea)
  ------------------------------------------- */
  const textareaRef = useRef(null);
  const [editing, setEditing] = useState(null); // note id
  useEffect(() => {
    if (!editing) return;
    const note = notes.find((n) => n.id === editing);
    if (!note) return;
    const ta = document.createElement("textarea");
    textareaRef.current = ta;
    const stage = stageRef.current;
    const scale = stage.scaleX();
    ta.value = note.text;
    ta.style.position = "absolute";
    ta.style.left = `${stage.x() + note.x * scale + 16}px`;
    ta.style.top = `${stage.y() + note.y * scale + 14}px`;
    ta.style.width = `${(note.w - 24) * scale}px`;
    ta.style.height = `${(note.h - 24) * scale}px`;
    ta.style.background = "rgba(0,0,0,0.9)";
    ta.style.color = "#e4e4e7";
    ta.style.border = "1px solid #3f3f46";
    ta.style.outline = "none";
    ta.style.resize = "none";
    ta.style.padding = `${8 * scale}px`;
    ta.style.font = `${14 * scale}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    ta.style.zIndex = 50;
    document.body.appendChild(ta);
    ta.focus();

    const finish = () => {
      const val = ta.value;
      setNotes((arr) => arr.map((n) => (n.id === note.id ? { ...n, text: val } : n)));
      document.body.removeChild(ta);
      textareaRef.current = null;
      setEditing(null);
      pushHistory();
    };

    const onBlur = () => finish();
    const onKey = (ev) => {
      // Cmd/Ctrl + Enter saves; Enter alone adds newline
      if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
        ev.preventDefault();
        finish();
      }
    };

    ta.addEventListener("blur", onBlur);
    ta.addEventListener("keydown", onKey);
    return () => {
      try {
        ta.removeEventListener("blur", onBlur);
        ta.removeEventListener("keydown", onKey);
        if (document.body.contains(ta)) document.body.removeChild(ta);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line
  }, [editing, stagePos, stageScale]);

  /* -------------------------------------------
     Drag/drop images
  ------------------------------------------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onPrevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      e.preventDefault();
      const stage = stageRef.current;
      const wp = worldPointer(stage);
      const files = Array.from(e.dataTransfer.files || []);
      let handled = false;

      for (const f of files) {
        if (f.type.startsWith("image/")) {
          const url = URL.createObjectURL(f);
          const id = `img_${uid()}`;
          setImages((arr) => [...arr, { id, x: wp.x, y: wp.y, w: 320, h: 240, src: url }]);
          handled = true;
        }
      }
      // URL text drag
      if (!handled) {
        const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
        if (url && /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)/i.test(url)) {
          const id = `img_${uid()}`;
          setImages((arr) => [...arr, { id, x: wp.x, y: wp.y, w: 320, h: 240, src: url }]);
        }
      }
      pushHistory();
    };

    ["dragenter", "dragover"].forEach((t) => el.addEventListener(t, onPrevent));
    el.addEventListener("drop", onDrop);
    return () => {
      ["dragenter", "dragover"].forEach((t) => el.removeEventListener(t, onPrevent));
      el.removeEventListener("drop", onDrop);
    };
  }, [wrapRef, pushHistory]);

  /* -------------------------------------------
     UI actions
  ------------------------------------------- */
  const clearAll = () => {
    if (!window.confirm("Clear the canvas (strokes, notes, images, connectors)?")) return;
    setStrokes([]);
    setNotes([]);
    setImages([]);
    setLinks([]);
    pushHistory();
  };

  // compute centers for connectors
  const centerOf = (id) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
  };

  const palette = ["#ffffff", "#a1a1aa", "#60a5fa", "#818cf8", "#22d3ee", "#34d399", "#f59e0b", "#f43f5e"];

  /* -------------------------------------------
     Render
  ------------------------------------------- */
  return (
    <div ref={wrapRef} className="h-full relative" style={dottedBg}>
      {/* Top dock */}
      <div className="absolute top-3 left-3 z-20 rounded-full border border-zinc-800 bg-black/70 backdrop-blur px-1 py-1 flex items-center gap-1">
        {/* Back (icon only) */}
        <button
          onClick={() => goHome?.()}
          className="h-8 px-3 rounded-full text-zinc-300 hover:text-zinc-100 hover:bg-white/5"
          title="Back"
          aria-label="Back"
        >
          ←
        </button>

        <div className="w-px h-6 bg-zinc-800/80 mx-1" />

        {["select", "draw", "text"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={[
              "h-8 px-3 rounded-full text-sm",
              mode === m ? "bg-white text-black" : "text-zinc-300 hover:text-zinc-100 hover:bg-white/5",
            ].join(" ")}
          >
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}

        <div className="w-px h-6 bg-zinc-800/80 mx-1" />

        <button onClick={undo} className="h-8 px-3 rounded-full text-zinc-300 hover:text-zinc-100 hover:bg-white/5">
          Undo
        </button>
        <button onClick={redo} className="h-8 px-3 rounded-full text-zinc-300 hover:text-zinc-100 hover:bg-white/5">
          Redo
        </button>
        <button onClick={clearAll} className="h-8 px-3 rounded-full text-zinc-300 hover:text-zinc-100 hover:bg-white/5">
          Clear
        </button>
      </div>

      {/* Draw dock */}
      {mode === "draw" && (
        <div className="absolute top-14 left-3 z-20 rounded-full border border-zinc-800 bg-black/70 backdrop-blur px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => { setDrawColor(c); setEraseOn(false); }}
                className="w-5 h-5 rounded-full"
                style={{
                  background: c,
                  boxShadow: drawColor === c && !eraseOn ? "0 0 0 2px #fff, inset 0 0 0 1px #000" : "inset 0 0 0 1px rgba(0,0,0,0.45)",
                }}
                title={c}
              />
            ))}
          </div>

          {/* eraser toggle */}
          <div className="w-px h-5 bg-zinc-800/80 mx-1" />
          <button
            onClick={() => setEraseOn((v) => !v)}
            className={[
              "h-7 px-3 rounded-full text-xs",
              eraseOn ? "bg-white text-black" : "text-zinc-300 hover:text-zinc-100 hover:bg-white/5",
            ].join(" ")}
          >
            Eraser
          </button>

          <div className="w-px h-5 bg-zinc-800/80 mx-1" />
          <label className="text-xs text-zinc-400 mr-1">Size</label>
          <input
            type="range"
            min="1"
            max="36"
            value={drawSize}
            onChange={(e) => setDrawSize(Number(e.target.value))}
            className="accent-white"
          />
        </div>
      )}

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        onWheel={onWheel}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        style={{ cursor: isPanningRef.current ? "grabbing" : mode === "draw" ? "crosshair" : "default" }}
      >
        {/* Connectors */}
        <Layer listening={true}>
          {links.map((lnk) => {
            const a = centerOf(lnk.from);
            const b = centerOf(lnk.to);
            return (
              <Arrow
                key={lnk.id}
                points={[a.x, a.y, b.x, b.y]}
                pointerLength={10}
                pointerWidth={10}
                stroke="#71717a"
                fill="#71717a"
                strokeWidth={2}
                tension={0}
              />
            );
          })}
        </Layer>

        {/* Draw layer */}
        <Layer>
          {strokes.map((s) => (
            <Line
              key={s.id}
              points={s.points}
              stroke={s.color}
              strokeWidth={s.size}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={s.erase ? "destination-out" : "source-over"}
              tension={0.4}
            />
          ))}
        </Layer>

        {/* Objects (notes & images) */}
        <Layer>
          {/* Notes */}
          {notes.map((n) => (
            <Group
              key={n.id}
              name={`note:${n.id}`}
              x={n.x}
              y={n.y}
              draggable={mode === "select"}
              onDragMove={(e) => {
                const { x, y } = e.target.position();
                setNotes((arr) => arr.map((it) => (it.id === n.id ? { ...it, x, y } : it)));
              }}
              onDblClick={() => setEditing(n.id)}
              onClick={() => setSelectedId(n.id)}
            >
              <Rect
                width={n.w}
                height={n.h}
                cornerRadius={12}
                fill="#0b0b0b"
                stroke={selectedId === n.id ? "#ffffff" : "#3f3f46"}
                strokeWidth={selectedId === n.id ? 1.5 : 1}
                shadowBlur={selectedId === n.id ? 4 : 0}
              />
              <KText
                x={12}
                y={10}
                width={n.w - 24}
                height={n.h - 20}
                text={n.text}
                fontSize={14}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                fill="#e4e4e7"
                lineHeight={1.35}
                wrap="word"
                listening={false}
              />
              {/* little anchor to hint linking (optional visual) */}
              <Circle x={n.w - 10} y={n.h / 2} radius={4} fill="#71717a" opacity={0.5} listening={false} />
            </Group>
          ))}

          {/* Images */}
          {images.map((img) => (
            <URLImage
              key={img.id}
              id={img.id}
              x={img.x}
              y={img.y}
              w={img.w}
              h={img.h}
              src={img.src}
              selected={selectedId === img.id}
              draggable={mode === "select"}
              onDragMove={(x, y) =>
                setImages((arr) => arr.map((it) => (it.id === img.id ? { ...it, x, y } : it)))
              }
              onSelect={() => setSelectedId(img.id)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

/* -------------------------------------------
   URLImage helper (drag + render)
------------------------------------------- */
function URLImage({ id, x, y, w, h, src, selected, draggable, onDragMove, onSelect }) {
  const [image, setImage] = useState(null);
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => setImage(img);
  }, [src]);

  return (
    <Group
      name={`img:${id}`}
      x={x}
      y={y}
      draggable={draggable}
      onDragMove={(e) => {
        const p = e.target.position();
        onDragMove?.(p.x, p.y);
      }}
      onClick={onSelect}
    >
      <KImage image={image} width={w} height={h} />
      <Rect width={w} height={h} stroke={selected ? "#ffffff" : "#3f3f46"} strokeWidth={selected ? 1.5 : 1} />
    </Group>
  );
}
