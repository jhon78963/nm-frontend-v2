import { FormControl } from '@angular/forms';
import { TableFilterStorageService } from './table-filter-storage.service';

export interface SearchPageFilterState {
  search: string;
  page: number;
  limit: number;
}

export function isSearchPageFilterState(value: unknown): value is SearchPageFilterState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Record<string, unknown>;
  return (
    typeof state['search'] === 'string' &&
    typeof state['page'] === 'number' &&
    typeof state['limit'] === 'number'
  );
}

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

export interface RestoreSearchPageOptions {
  page: { set: (value: number) => void };
  limit: { set: (value: number) => void };
  currentSearch: { set: (value: string) => void };
  searchControl?: FormControl<string>;
}

export function restoreSearchPageFilters(
  storage: TableFilterStorageService,
  tableKey: string,
  options: RestoreSearchPageOptions,
): SearchPageFilterState | null {
  const saved = storage.load(tableKey, isSearchPageFilterState);
  if (!saved) {
    return null;
  }

  options.limit.set(saved.limit);
  options.page.set(saved.page);
  options.currentSearch.set(saved.search);

  if (saved.search && options.searchControl) {
    options.searchControl.setValue(saved.search, { emitEvent: false });
  }

  return saved;
}

export function persistSearchPageFilters(
  storage: TableFilterStorageService,
  tableKey: string,
  state: SearchPageFilterState,
): void {
  storage.save(tableKey, state);
}

export function buildSearchPageFilterState(
  page: number,
  limit: number,
  search: string,
): SearchPageFilterState {
  return {
    page,
    limit,
    search,
  };
}

export function patchFormControl<T extends string | number>(
  control: FormControl<T>,
  value: T,
): void {
  control.setValue(value, { emitEvent: false });
}
