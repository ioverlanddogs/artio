import { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export async function renderAsync(element: ReactElement) {
  return renderToStaticMarkup(element);
}
