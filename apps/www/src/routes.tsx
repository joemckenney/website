import type { ComponentType } from "react";
import { Fragment } from "react";
import { Route, Routes as Switch } from "react-router-dom";

interface PageModule {
  default: ComponentType;
  frontmatter?: {
    title?: string;
    description?: string;
    publishedTime?: string;
    series?: string;
  };
}

const PRESERVED = import.meta.glob("/src/pages/(_app|404).page.tsx", {
  eager: true,
}) as Record<string, PageModule>;

const ROUTES = import.meta.glob("/src/pages/**/[a-z[]*.{page.tsx,mdx}", {
  eager: true,
}) as Record<string, PageModule>;

const preservedRoutes: Partial<Record<string, ComponentType>> = {};
for (const path of Object.keys(PRESERVED)) {
  const route = path
    .replace(/\.page\.tsx$/g, "")
    .replace(/\/src\/pages\//g, "");
  preservedRoutes[route] = PRESERVED[path]?.default;
}

interface RouteEntry {
  route: string;
  Component: ComponentType;
}

const regularRoutes: Record<string, RouteEntry> = {};
for (const path of Object.keys(ROUTES)) {
  let route = path
    .replace(/\/index\.page\.tsx$/g, "")
    .replace(/\.page\.tsx$/g, "")
    .replace(/\.mdx$/g, "")
    .replace(/\/src\/pages/g, "")
    .replace(/\[\.{3}.+\]/, "*");
  while (route.match(/\[(.+?)\]/)) {
    route = route.replace(/\[(.+?)\]/, ":$1");
  }

  const module = ROUTES[path];
  const Component = module.default;

  regularRoutes[route] = {
    route,
    Component,
  };
}

const App = preservedRoutes?._app || Fragment;
const NotFound = preservedRoutes?.["404"] || Fragment;

export const Routes = (): JSX.Element => {
  return (
    <App>
      <Switch>
        <>
          {Object.values(regularRoutes).map(
            ({ route, Component = Fragment }) => (
              <Route key={route} path={route} element={<Component />} />
            ),
          )}
          <Route path="*" element={<NotFound />} />
        </>
      </Switch>
    </App>
  );
};
