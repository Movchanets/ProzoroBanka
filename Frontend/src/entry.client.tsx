import { hydrateRoot } from "react-dom/client";
import { startTransition } from "react";
import { HydratedRouter } from "react-router/dom";

startTransition(() => {
  hydrateRoot(
    document,
    <HydratedRouter />
  );
});
