import type { Decorator } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { RouterProvider, createMemoryRouter } from "react-router";

type RouterParameters = {
  route?: string;
  outlet?: ReactNode;
};

export const withRouter: Decorator = (Story, context) => {
  const { route = "/", outlet } = (context.parameters.reactRouter ??
    {}) as RouterParameters;
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: <Story />,
        children: outlet ? [{ index: true, element: outlet }] : undefined,
      },
    ],
    { initialEntries: [route] },
  );

  return <RouterProvider router={router} />;
};
