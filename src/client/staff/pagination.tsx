import { useId, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FirstPageIcon,
  LastPageIcon,
} from "../site-header/icons.js";
import { BusyProgress } from "../busy/busy-progress.js";

export const pageSizes = [5, 10, 25, 50, "all"] as const;

export type PageSize = (typeof pageSizes)[number];

const defaultPageSize: PageSize = 25;

const pagesEachSideOfCurrent = 1;

export type PageButton = number | "gap";

const readPageSize = (value: string): PageSize =>
  pageSizes.find((pageSize) => String(pageSize) === value) ?? defaultPageSize;

export const countPages = (itemCount: number, pageSize: PageSize): number =>
  pageSize === "all" || itemCount === 0 ? 1 : Math.ceil(itemCount / pageSize);

/** Always the first and last page, the current page and its neighbours, and a gap wherever pages are skipped. */
export const listPageButtons = (
  pageNumber: number,
  pageCount: number,
): PageButton[] => {
  const shownPageNumbers = Array.from(
    { length: pageCount },
    (_, index) => index + 1,
  ).filter(
    (candidate) =>
      candidate === 1 ||
      candidate === pageCount ||
      Math.abs(candidate - pageNumber) <= pagesEachSideOfCurrent ||
      (pageNumber <= 3 && candidate <= 4) ||
      (pageNumber >= pageCount - 2 && candidate >= pageCount - 3),
  );
  return shownPageNumbers.flatMap((shown, index): PageButton[] => {
    const previous = shownPageNumbers.at(index - 1);
    if (index === 0 || previous === undefined || shown - previous === 1) {
      return [shown];
    }
    return shown - previous === 2 ? [previous + 1, shown] : ["gap", shown];
  });
};

interface PaginationState<Item> {
  pageItems: Item[];
  pageNumber: number;
  pageCount: number;
  pageSize: PageSize;
  itemCount: number;
  firstShown: number;
  lastShown: number;
  showPage: (pageNumber: number) => void;
  choosePageSize: (pageSize: PageSize) => void;
}

/**
 * Pages through a list, 25 at a time unless the adult chooses otherwise.
 * Goes back to the first page whenever `resetKey` changes, such as a new search.
 */
export const usePagination = <Item,>(
  items: readonly Item[],
  resetKey = "",
): PaginationState<Item> => {
  const [chosenPageNumber, setChosenPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(defaultPageSize);
  const [shownResetKey, setShownResetKey] = useState(resetKey);

  if (shownResetKey !== resetKey) {
    setShownResetKey(resetKey);
    setChosenPageNumber(1);
  }

  const itemCount = items.length;
  const pageCount = countPages(itemCount, pageSize);
  const pageNumber = Math.min(Math.max(chosenPageNumber, 1), pageCount);
  const firstIndex = pageSize === "all" ? 0 : (pageNumber - 1) * pageSize;
  const pageItems =
    pageSize === "all"
      ? [...items]
      : items.slice(firstIndex, firstIndex + pageSize);

  return {
    pageItems,
    pageNumber,
    pageCount,
    pageSize,
    itemCount,
    firstShown: itemCount === 0 ? 0 : firstIndex + 1,
    lastShown: firstIndex + pageItems.length,
    showPage: setChosenPageNumber,
    choosePageSize: (chosenPageSize) => {
      setPageSize(chosenPageSize);
      setChosenPageNumber(1);
    },
  };
};

/** A page the server chose has no page-size choice, so that control is left out. */
export type PaginationControls = Omit<
  PaginationState<unknown>,
  "pageItems" | "choosePageSize"
> & {
  choosePageSize?: (pageSize: PageSize) => void;
  /** What is loading while the server fetches the chosen page, such as "Loading page 3 of the audit log…". */
  busyLabel?: string;
};

interface PaginationProps {
  pagination: PaginationControls;
  itemsName: string;
  children: ReactNode;
}

const describePageSize = (pageSize: PageSize): string =>
  pageSize === "all" ? "All" : String(pageSize);

/**
 * Wraps a paged list with its controls underneath: how many to show, which of them are showing,
 * and buttons for the first, previous, numbered, next and last pages.
 */
export const Pagination = ({
  pagination,
  itemsName,
  children,
}: PaginationProps) => {
  const listTopRef = useRef<HTMLDivElement>(null);
  const pageSizeId = useId();
  const {
    pageNumber,
    pageCount,
    pageSize,
    itemCount,
    firstShown,
    lastShown,
    showPage,
    choosePageSize,
    busyLabel,
  } = pagination;
  const isBusy = busyLabel !== undefined;
  const hasControls = itemCount > pageSizes[0];

  const goToPage = (wantedPageNumber: number) => {
    showPage(wantedPageNumber);
    const listTop = listTopRef.current;
    if (listTop !== null && listTop.getBoundingClientRect().top < 0) {
      listTop.scrollIntoView({ block: "start" });
    }
  };

  const isFirstPage = pageNumber === 1;
  const isLastPage = pageNumber === pageCount;

  return (
    <div className="paginated-list" ref={listTopRef} aria-busy={isBusy}>
      {children}
      {hasControls ? (
        <div className="pagination">
          {choosePageSize === undefined ? null : (
            <div className="pagination-size">
              <label htmlFor={pageSizeId}>Show</label>
              <select
                id={pageSizeId}
                value={String(pageSize)}
                onChange={(event) => {
                  choosePageSize(readPageSize(event.currentTarget.value));
                }}
              >
                {pageSizes.map((size) => (
                  <option key={size} value={String(size)}>
                    {describePageSize(size)}
                  </option>
                ))}
              </select>
              <span>per page</span>
            </div>
          )}
          <p className="pagination-range" aria-live="polite">
            {firstShown === 1 && lastShown === itemCount
              ? `All ${String(itemCount)} ${itemsName}`
              : `${String(firstShown)}–${String(lastShown)} of ${String(itemCount)} ${itemsName}`}
          </p>
          {pageCount > 1 ? (
            <nav
              className="pagination-pages"
              aria-label={`Pages of ${itemsName}`}
            >
              <button
                type="button"
                className="pagination-step"
                aria-label="First page"
                disabled={isFirstPage || isBusy}
                onClick={() => {
                  goToPage(1);
                }}
              >
                <FirstPageIcon />
              </button>
              <button
                type="button"
                className="pagination-step"
                aria-label="Previous page"
                disabled={isFirstPage || isBusy}
                onClick={() => {
                  goToPage(pageNumber - 1);
                }}
              >
                <ChevronLeftIcon />
              </button>
              {listPageButtons(pageNumber, pageCount).map(
                (pageButton, index) =>
                  pageButton === "gap" ? (
                    <span
                      key={`gap-${String(index)}`}
                      className="pagination-gap"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={pageButton}
                      type="button"
                      className="pagination-page"
                      aria-label={`Page ${String(pageButton)}`}
                      aria-current={
                        pageButton === pageNumber ? "page" : undefined
                      }
                      disabled={isBusy}
                      onClick={() => {
                        goToPage(pageButton);
                      }}
                    >
                      {pageButton}
                    </button>
                  ),
              )}
              <button
                type="button"
                className="pagination-step"
                aria-label="Next page"
                disabled={isLastPage || isBusy}
                onClick={() => {
                  goToPage(pageNumber + 1);
                }}
              >
                <ChevronRightIcon />
              </button>
              <button
                type="button"
                className="pagination-step"
                aria-label="Last page"
                disabled={isLastPage || isBusy}
                onClick={() => {
                  goToPage(pageCount);
                }}
              >
                <LastPageIcon />
              </button>
            </nav>
          ) : null}
          {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
        </div>
      ) : null}
    </div>
  );
};
