import React, { Suspense } from "react";
import { lazyWithReload } from "../AppErrorBoundary";

// The map library is large: load it only when a map is actually shown (like the other map pages),
// so the order list and the basket stay light.
const PinMap = lazyWithReload(() => import("./PinMap"));

export default function LazyPinMap(props) {
  return (
    <Suspense fallback={<div className="pm-map pm-loading" style={{ height: props.height || 280 }} aria-hidden="true" />}>
      <PinMap {...props} />
    </Suspense>
  );
}
