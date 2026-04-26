import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  return renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError(error: unknown) {
        responseStatusCode = 500;
        console.error(error);
      },
    }
  ).then((stream) => {
    responseHeaders.set("Content-Type", "text/html");

    return new Response(stream, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  });
}
