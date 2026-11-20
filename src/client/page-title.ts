import { useEffect } from "react";

export const buildPageTitle = (viewTitle: string, siteTitle: string) =>
  `${siteTitle} – ${viewTitle}`;

export const usePageTitle = (
  viewTitle: string | undefined,
  siteTitle = "Wizzaroo",
) => {
  useEffect(() => {
    if (viewTitle !== undefined) {
      document.title = buildPageTitle(viewTitle, siteTitle);
    }
  }, [viewTitle, siteTitle]);
};

export const parentSiteTitle = "Wizzaroo for Parents";
