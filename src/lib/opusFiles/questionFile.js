// @maia:opusFiles - open question <-> markdown (Opus/<project>/questions/*.md)
// The question text lives in frontmatter; the body is the answer.
import {
  makeCodec, asString, optString, asBool, pickOption, resolveRef, refName,
} from "./fileCodec.js";

export const QUESTION_STATUSES = ["open", "answered"];
const KEYS = ["id", "question", "status", "blocking", "owner", "workstream", "createdAt", "updatedAt"];

const parse = (data, body, { fallbackId, fallbackTitle, ctx, warnings }) => {
  const createdAt = optString(data.createdAt);
  return {
    id: optString(data.id) ?? fallbackId,
    question: optString(data.question) ?? fallbackTitle ?? "Untitled question",
    status: pickOption(data.status, QUESTION_STATUSES, "open", "status", warnings),
    blocking: asBool(data.blocking),
    owner: optString(data.owner) ?? "",
    workstreamId: resolveRef(data.workstream, ctx.workstreams, "name", "Workstream", warnings),
    createdAt,
    updatedAt: optString(data.updatedAt) ?? createdAt,
    answer: body,
  };
};

const toFields = (q, ctx) => ({
  id: q.id,
  question: asString(q.question),
  status: QUESTION_STATUSES.includes(q.status) ? q.status : "open",
  blocking: q.blocking === true ? true : null,
  owner: optString(q.owner),
  workstream: refName(q.workstreamId, ctx.workstreams, "name"),
  createdAt: optString(q.createdAt),
  updatedAt: optString(q.updatedAt),
});

export const { fromFile, toFile } = makeCodec({
  knownKeys: KEYS,
  parse,
  toFields,
  bodyOf: (q) => q.answer,
});
