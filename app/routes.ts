import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layouts/SidebarLayout/index.tsx", [
    // Docs
    index("routes/docs/LandingPage.tsx"),
    route("docs/toc", "routes/docs/toc.tsx"),
    route("docs/get-started", "routes/docs/get-started.mdx"),
    route("docs/concept", "routes/docs/concept.mdx"),
    route("docs/cli", "routes/docs/cli.mdx"),
    route("docs/features", "routes/docs/features.mdx"),

    route("register", "routes/user/register.tsx"),
    route("login", "routes/user/login.tsx"),
    route("quiz", "routes/quiz.tsx"),
    route("quiz/list", "routes/quiz-list.tsx"),
    route("achievement", "routes/achievement.tsx"),

    layout("layouts/SideViewLayout/index.tsx", [
      route("home", "routes/home.tsx"),
      route("tanbun/:id", "routes/tanbun/detail/index.tsx"),
      route("user/edit", "routes/user/edit.tsx"),
      route("user/:userId", "routes/user/detail.tsx"),
      route("resource/:id", "routes/resource/detail.tsx"),
      layout("layouts/SearchTabLayout/index.tsx", {}, [
        route("search", "routes/tanbun/search/index.tsx"),
        route("search/resource", "features/resource/search/index.tsx"),
        route("search/user", "features/user/search/index.tsx"),
      ]),
    ]),
  ]),

  route("/user/signUpload", "routes/user/signUpload.ts"),
  route("/user/deleteImage", "routes/user/deleteImage.ts"),

  route("google/authorize", "routes/sso/google/authorize.tsx"),
  route("google/callback", "routes/sso/google/callback.tsx"),
] satisfies RouteConfig;
