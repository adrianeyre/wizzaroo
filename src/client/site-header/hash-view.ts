import { useEffect, useRef, useState } from "react";

const findHashView = <View extends string>(
  views: readonly View[],
): View | undefined => {
  const hash = window.location.hash.slice(1);
  return views.find((view) => view === hash);
};

const focusViewHeading = () => {
  const heading = document.querySelector("main h1");
  if (heading instanceof HTMLElement) {
    heading.tabIndex = -1;
    heading.focus();
  }
};

export const useHashView = <View extends string>(
  views: readonly View[],
): View | undefined => {
  const [hashView, setHashView] = useState(() => findHashView(views));
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    const showHashView = () => {
      hasNavigatedRef.current = true;
      setHashView(findHashView(views));
    };
    window.addEventListener("hashchange", showHashView);
    return () => {
      window.removeEventListener("hashchange", showHashView);
    };
  }, [views]);

  useEffect(() => {
    if (hasNavigatedRef.current) {
      focusViewHeading();
    }
  }, [hashView]);

  return hashView;
};
