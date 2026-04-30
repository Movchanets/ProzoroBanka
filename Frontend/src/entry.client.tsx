import { hydrateRoot } from "react-dom/client";
import { startTransition } from "react";
import { HydratedRouter } from "react-router/dom";
if (import.meta.env.DEV && typeof window !== "undefined") {
  import("react-grab");
}
startTransition(() => {
  hydrateRoot(
    document,
    <HydratedRouter />
  );
});
