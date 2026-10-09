import { createContext, createElement, useContext, useMemo } from "react";
export function ArcAnchor(props) {
  return <a {...props} />;
}
const fillStyle = { position: "absolute", inset: 0, width: "100%", height: "100%" };
export function ArcImg({ alt, fill, priority, loading, style, ...props }) {
  return <img alt={alt} decoding="async" {...props} loading={loading ?? (priority ? "eager" : "lazy")} fetchPriority={priority ? "high" : props.fetchPriority} style={fill ? { ...fillStyle, ...style } : style} />;
}
const ArcContext = createContext({ link: ArcAnchor, image: ArcImg });
export function ArcProvider({ link, image, children }) {
  const parent = useContext(ArcContext);
  const value = useMemo(() => ({ link: link ?? parent.link, image: image ?? parent.image }), [link, image, parent]);
  return <ArcContext.Provider value={value}>{children}</ArcContext.Provider>;
}
export const useArcLink = () => useContext(ArcContext).link;
export const useArcImage = () => useContext(ArcContext).image;
export function ArcLink(props) {
  return createElement(useArcLink(), props);
}
export function ArcImage(props) {
  return createElement(useArcImage(), props);
}
