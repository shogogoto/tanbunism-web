import { useEffect } from "react";
import { Link, type LinkProps, useLocation } from "react-router";

function elementId(hash: string): string | undefined {
  if (!hash.startsWith("#") || hash.length === 1) {
    return undefined;
  }

  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

export function scrollToHash(hash: string): void {
  const id = elementId(hash);
  if (!id) {
    return;
  }

  document.getElementById(id)?.scrollIntoView({ behavior: "auto" });
}

/**
 * 遷移後にURLのhashと同じidを持つ要素までスクロールする。
 * アプリ内に一つだけ配置する。
 */
export function HashScrollRestoration() {
  const { hash } = useLocation();

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollToHash(hash));
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return null;
}

/**
 * React Routerの遷移を保ったまま、同じURLのhashを再度押した場合も
 * 対象要素までスクロールする。
 */
export function HashLink({ onClick, ...props }: LinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          const hash =
            typeof props.to === "string"
              ? new URL(props.to, window.location.href).hash
              : props.to.hash;
          scrollToHash(hash ?? "");
        }
      }}
    />
  );
}
