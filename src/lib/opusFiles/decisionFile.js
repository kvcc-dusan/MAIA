// @maia:opusFiles - project decision <-> markdown (Opus/<project>/decisions/*.md)
import {
  makeCodec, asString, optString, resolveRef, refName,
} from "./fileCodec.js";

const KEYS = ["id", "title", "date", "by", "workstream"];

const parse = (data, body, { fallbackId, fallbackTitle, ctx, warnings }) => ({
  id: optString(data.id) ?? fallbackId,
  title: optString(data.title) ?? fallbackTitle ?? "Untitled",
  date: optString(data.date) ?? "",
  by: optString(data.by) ?? "",
  workstreamId: resolveRef(data.workstream, ctx.workstreams, "name", "Workstream", warnings),
  detail: body,
});

const toFields = (decision, ctx) => ({
  id: decision.id,
  title: asString(decision.title),
  date: optString(decision.date),
  by: optString(decision.by),
  workstream: refName(decision.workstreamId, ctx.workstreams, "name"),
});

export const { fromFile, toFile } = makeCodec({
  knownKeys: KEYS,
  parse,
  toFields,
  bodyOf: (decision) => decision.detail,
});
