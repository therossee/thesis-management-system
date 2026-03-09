import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import API from '../API';
import useDebounce from './useDebounce';

const STORAGE_KEY = 'thesisProposalsState';
const LOADING_MIN_MS = 500;
const DEFAULT_FILTERS = { isAbroad: 0, isInternal: 0, keyword: [], teacher: [], type: [] };
const DEFAULT_STATE = {
  currentPage: 1,
  filters: DEFAULT_FILTERS,
  proposalsPerPage: 10,
  searchQuery: '',
  sorting: { sortBy: 'id', orderBy: 'ASC' },
  tab: 'course',
};

const getNormalizedFilterLabel = item =>
  item?.content ||
  item?.label ||
  item?.type ||
  item?.keyword ||
  [item?.lastName, item?.firstName].filter(Boolean).join(' ').trim();

const normalizeFilterItems = items => {
  if (!Array.isArray(items)) return [];

  return items
    .map(item => {
      const id = Number(item?.id ?? item?.value);
      const content = getNormalizedFilterLabel(item);

      if (!Number.isFinite(id) || id <= 0 || !content) return null;

      return { id, content };
    })
    .filter(Boolean);
};

const normalizePersistedState = savedState => {
  if (!savedState || typeof savedState !== 'object') return DEFAULT_STATE;

  const currentPage =
    Number.isInteger(savedState.currentPage) && savedState.currentPage > 0 ? savedState.currentPage : 1;
  const proposalsPerPage =
    Number.isInteger(savedState.proposalsPerPage) && savedState.proposalsPerPage > 0 ? savedState.proposalsPerPage : 10;
  const searchQuery = typeof savedState.searchQuery === 'string' ? savedState.searchQuery : '';
  const tab = savedState.tab === 'all' ? 'all' : 'course';
  const filters = savedState.filters && typeof savedState.filters === 'object' ? savedState.filters : DEFAULT_FILTERS;
  const sorting =
    savedState.sorting === null
      ? null
      : savedState.sorting && typeof savedState.sorting === 'object'
        ? savedState.sorting
        : DEFAULT_STATE.sorting;

  return {
    currentPage,
    proposalsPerPage,
    searchQuery,
    tab,
    filters: {
      isAbroad: filters.isAbroad === 1 || filters.isAbroad === 2 ? filters.isAbroad : 0,
      isInternal: filters.isInternal === 1 || filters.isInternal === 2 ? filters.isInternal : 0,
      keyword: normalizeFilterItems(filters.keyword),
      teacher: normalizeFilterItems(filters.teacher),
      type: normalizeFilterItems(filters.type),
    },
    sorting:
      sorting === null
        ? null
        : {
            sortBy: typeof sorting.sortBy === 'string' ? sorting.sortBy : 'id',
            orderBy: sorting.orderBy === 'DESC' ? 'DESC' : 'ASC',
          },
  };
};

const getProposalApiMethod = tab => {
  return tab === 'course' ? API.getTargetedThesisProposals : API.getThesisProposals;
};

const fetchProposalData = ({ apiMethod, language, currentPage, proposalsPerPage, filters, searchQuery, sorting }) => {
  return apiMethod(language, currentPage, proposalsPerPage, filters, searchQuery, sorting);
};

const resolveAdjustedCurrentPage = (currentPage, totalPages) => {
  if (totalPages > 0 && currentPage > totalPages) {
    return totalPages;
  }

  if (totalPages === 0 && currentPage !== 1) {
    return 1;
  }

  return null;
};

const updateCurrentPage = (setState, currentPage) => {
  setState(prevState => ({
    ...prevState,
    currentPage,
  }));
};

const applyFetchedProposalData = (data, setPageProposals, setCount, setTotalPages) => {
  setPageProposals(data.thesisProposals);
  setCount(data.count);
  setTotalPages(data.totalPages);
};

export default function useThesisProposalsState() {
  const { i18n } = useTranslation();

  const [count, setCount] = useState(0);
  const [pageProposals, setPageProposals] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  const [state, setState] = useState(DEFAULT_STATE);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const debouncedSearchQuery = useDebounce(state.searchQuery, 500);

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        setState(normalizePersistedState(JSON.parse(savedState)));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  useEffect(() => {
    if (!isLoaded || isResetting) return;

    setLoading(true);
    const startTime = Date.now();

    const handleFetchCompletion = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(LOADING_MIN_MS - elapsedTime, 0);
      setTimeout(() => setLoading(false), remainingTime);
    };

    const apiMethod = getProposalApiMethod(state.tab);
    fetchProposalData({
      apiMethod,
      language: i18n.language,
      currentPage: state.currentPage,
      proposalsPerPage: state.proposalsPerPage,
      filters: state.filters,
      searchQuery: debouncedSearchQuery,
      sorting: state.sorting,
    })
      .then(data => {
        const adjustedPage = resolveAdjustedCurrentPage(state.currentPage, data.totalPages);
        if (adjustedPage !== null) {
          updateCurrentPage(setState, adjustedPage);
          return;
        }

        applyFetchedProposalData(data, setPageProposals, setCount, setTotalPages);
      })
      .catch(error => console.error('Error fetching thesis proposals:', error))
      .finally(handleFetchCompletion);
  }, [
    i18n.language,
    isLoaded,
    state.currentPage,
    state.filters,
    state.proposalsPerPage,
    state.sorting,
    state.tab,
    debouncedSearchQuery,
    isResetting,
  ]);

  const applyFilters = useCallback((itemType, selectedItems) => {
    setState(prevState => ({
      ...prevState,
      filters: {
        ...prevState.filters,
        [itemType]: selectedItems,
      },
      currentPage: 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setIsResetting(true);
    setState(prevState => ({
      ...prevState,
      currentPage: 1,
      filters: DEFAULT_FILTERS,
      searchQuery: '',
    }));
    setTimeout(() => {
      setIsResetting(false);
    }, 10);
  }, []);

  const applySorting = useCallback((newSorting, sorting) => {
    if (newSorting !== sorting) {
      setState(prevState => ({
        ...prevState,
        sorting: newSorting,
      }));
    }
  }, []);

  const handlePageChange = useCallback(
    pageNumber => {
      if (pageNumber !== state.currentPage) {
        setState(prevState => ({
          ...prevState,
          currentPage: pageNumber,
        }));
        globalThis.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [state.currentPage],
  );

  const handleProposalsPerPageChange = useCallback(event => {
    const value = Number.parseInt(event.target.value, 10);
    setState(prevState => ({
      ...prevState,
      currentPage: 1,
      proposalsPerPage: value,
    }));
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearchbarChange = useCallback(event => {
    setState(prevState => ({
      ...prevState,
      searchQuery: event.target.value,
      currentPage: 1,
    }));
  }, []);

  const handleTabChange = useCallback(newTab => {
    setState(prevState => ({
      ...prevState,
      currentPage: 1,
      tab: newTab,
    }));
  }, []);

  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 6) {
      // Case 1: Less than 6 pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (state.currentPage < 4) {
      // Case 2: You are in the first pages
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (state.currentPage >= totalPages - 2) {
      // Case 3: You are in the last pages
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Case 4: You are in the middle
      pages.push(1, '...', state.currentPage - 1, state.currentPage, state.currentPage + 1, '...', totalPages);
    }
    return pages;
  }, [state.currentPage, totalPages]);

  return {
    count,
    pageProposals,
    pageNumbers,
    totalPages,
    state,
    loading,
    setLoading,
    applyFilters,
    applySorting,
    resetFilters,
    handlePageChange,
    handleProposalsPerPageChange,
    handleSearchbarChange,
    handleTabChange,
  };
}
