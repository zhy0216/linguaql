# Query.tsx Refactoring Steps

## Overview

Refactoring the large Query.tsx component (1000+ lines) into smaller, maintainable pieces.

**Current Status**: Planning Phase ✅  
**Started**: 2025-07-22  
**Target**: Modular, maintainable architecture

---

## Phase 1: Extract Custom Hooks 🎯 **HIGH PRIORITY**

### Step 1.1: Extract Session Management Hook

- [ ] Create `src/hooks/useQuerySessions.ts`
- [ ] Move state:
  - `querySessions: QuerySession[]`
  - `activeSessionId: string | null`
- [ ] Move functions:
  - `createNewSession()`
  - Session localStorage logic
  - Session-related useEffects
- [ ] Update Query.tsx to use the hook
- [ ] Test session functionality

### Step 1.2: Extract Database Operations Hook

- [ ] Create `src/hooks/useDatabaseOperations.ts`
- [ ] Move state:
  - `databaseTables: DatabaseTable[]`
  - `selectedTable: DatabaseTable | null`
  - `tableData: QueryResult | null`
  - `isLoadingTableData: boolean`
- [ ] Move functions:
  - `fetchDatabaseTables()`
  - `loadTableData(table)`
  - Table pagination logic
- [ ] Update Query.tsx to use the hook
- [ ] Test database operations

### Step 1.3: Extract Query Execution Hook

- [ ] Create `src/hooks/useQueryExecution.ts`
- [ ] Move state:
  - `queryInput: string`
  - `queryResult: QueryResult | null`
  - `isExecuting: boolean`
  - `queryHistory: string[]`
  - `showSQLConfirmModal: boolean`
  - `generatedSQL: string`
- [ ] Move functions:
  - `executeQuery()`
  - `executeValidatedSQL()`
  - `executeConfirmedSQL()`
  - `cancelSQLExecution()`
  - AI service integration logic
- [ ] Update Query.tsx to use the hook
- [ ] Test query execution

### Step 1.4: Extract Filtering and Sorting Hook

- [ ] Create `src/hooks/useTableFiltering.ts`
- [ ] Move state:
  - `sortConfig: SortConfig | null`
  - `filterConfigs: FilterConfig[]`
  - `filteredAndSortedData: QueryResult | null`
- [ ] Move functions:
  - `handleSort(column)`
  - `addFilter()`, `updateFilter()`, `removeFilter()`
  - `clearAllFilters()`
  - `applyFilterAndSort()` logic
- [ ] Update Query.tsx to use the hook
- [ ] Test filtering and sorting

---

## Phase 2: Extract UI Components 🎯 **HIGH PRIORITY**

### Step 2.1: Extract Sidebar Components ✅ **COMPLETED**

- [x] Create `src/components/query/QuerySidebar.tsx`
- [x] Extract entire left sidebar structure
- [x] Create `src/components/query/SessionsList.tsx`
  - Move sessions list rendering
  - Include session selection logic
- [x] Create `src/components/query/DatabaseTablesList.tsx`
  - Move database tables list rendering
  - Include table selection logic
- [x] Update Query.tsx to use QuerySidebar
- [x] Test sidebar functionality

### Step 2.2: Extract Query Input Component

- [ ] Create `src/components/query/QueryInput.tsx`
- [ ] Move CodeMirror setup and configuration
- [ ] Move SQL highlighting logic (`sqlStatementHighlight`)
- [ ] Include toolbar functionality
- [ ] Move query history dropdown
- [ ] Update Query.tsx to use QueryInput
- [ ] Test query input functionality

### Step 2.3: Extract Results Display Component ✅ **COMPLETED**

- [x] Create `src/components/query/QueryResults.tsx`
- [x] Move results table rendering logic
- [x] Create `src/components/query/ResultsTable.tsx`
  - Move table structure and row rendering
  - Include sorting indicators
- [x] Create `src/components/query/FilterControls.tsx`
  - Move filter input controls
  - Include add/remove filter buttons
- [x] Update Query.tsx to use QueryResults
- [x] Test results display

### Step 2.4: Extract Modal Components

- [ ] Create `src/components/query/SQLConfirmationModal.tsx`
- [ ] Move SQL confirmation modal structure
- [ ] Include modal state management
- [ ] Update Query.tsx to use modal component
- [ ] Test modal functionality

---

## Phase 3: Extract Utility Functions 🎯 **MEDIUM PRIORITY**

### Step 3.1: Create Query Utilities

- [ ] Create `src/utils/queryUtils.ts`
- [ ] Move utility functions:
  - SQL statement extraction from CodeMirror
  - Query validation helpers
  - History management utilities
  - SQL safety checking logic
- [ ] Update components to use utilities
- [ ] Test utility functions

### Step 3.2: Create Table Data Utilities

- [ ] Create `src/utils/tableUtils.ts`
- [ ] Move table-related utilities:
  - Sorting logic (numeric vs string)
  - Filtering logic (case-insensitive matching)
  - Data processing functions
  - Pagination helpers
- [ ] Update components to use utilities
- [ ] Test utility functions

---

## Phase 4: Improve Type Safety 🎯 **MEDIUM PRIORITY**

### Step 4.1: Extract Types

- [ ] Create `src/types/query.ts`
- [ ] Move interfaces:
  - `QuerySession`
  - `Pagination`
  - `SortConfig`
  - `FilterConfig`
  - `QueryProps`
- [ ] Add more specific types:
  - Query execution states
  - Filter operations
  - Sort directions
- [ ] Update all files to import from types
- [ ] Verify type safety

### Step 4.2: Add Generic Types

- [ ] Add generic types for better reusability
- [ ] Improve error handling types
- [ ] Add union types for better type safety
- [ ] Update components with better typing

---

## Phase 5: Performance Optimizations 🎯 **LOW PRIORITY**

### Step 5.1: Memoization

- [ ] Add `useMemo` for expensive calculations:
  - `applyFilterAndSort` result
  - Processed table data
- [ ] Add `useCallback` for event handlers:
  - Sort handlers
  - Filter handlers
  - Query execution handlers
- [ ] Add `React.memo` for components:
  - ResultsTable
  - FilterControls
  - SessionsList

### Step 5.2: Lazy Loading

- [ ] Implement lazy loading for large result sets
- [ ] Add virtualization for large tables
- [ ] Optimize CodeMirror rendering
- [ ] Add pagination for query results

---

## Phase 6: Code Organization 🎯 **LOW PRIORITY**

### Step 6.1: Constants Extraction

- [ ] Create `src/constants/queryConstants.ts`
- [ ] Move magic numbers:
  - Default page sizes
  - History limits
  - UI dimensions
- [ ] Move default values:
  - Default configurations
  - Initial states

### Step 6.2: Configuration

- [ ] Extract CodeMirror configuration
- [ ] Create reusable theme configurations
- [ ] Centralize component configurations

---

## Testing Checklist

After each phase, verify:

- [ ] All existing functionality works
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Performance is maintained
- [ ] Code is more readable
- [ ] Components are properly isolated

---

## Progress Tracking

### Completed Steps

- [x] Planning and documentation
- [x] **Step 2.1**: Extract Sidebar Components (QuerySidebar, SessionsList, DatabaseTablesList)
- [x] **Step 2.3**: Extract Results Display Component (QueryResults, ResultsTable, FilterControls)

### Current Step

- [ ] **Next**: Continue with remaining Phase 2 steps (Step 2.2, 2.4) or move to Phase 1 hooks

### Notes

- Keep original Query.tsx as backup until refactoring is complete
- Test each step thoroughly before moving to the next
- Update imports across the codebase as components are extracted
- Consider creating a `src/components/query/index.ts` barrel export file

---

## Benefits Expected

✅ **Maintainability**: Smaller, focused components  
✅ **Reusability**: Extracted components can be reused  
✅ **Testability**: Easier to unit test individual pieces  
✅ **Performance**: Better optimization opportunities  
✅ **Readability**: Clearer separation of concerns  
✅ **Type Safety**: Better TypeScript integration  
✅ **Developer Experience**: Easier to navigate and modify code
