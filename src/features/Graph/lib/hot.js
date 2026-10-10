// hotTags come from calculateVelocity, which lowercases tags. Node tags keep
// their original case, so the comparison has to lowercase the node side.

export function isHotNode(tags, hotTags) {
  if (!hotTags || hotTags.size === 0 || !Array.isArray(tags)) return false;
  return tags.some((tag) => hotTags.has(String(tag).toLowerCase()));
}
