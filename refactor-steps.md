# LinguaQL Query.tsx Refactoring Plan - Updated

## Current Status (566 lines)

The Query.tsx component has been significantly improved from the original 1000+ lines through several successful refactoring steps:

### ✅ Already Completed Refactoring:

1. **Component Extraction (Phase 2 - Partially Complete)**
   - ✅ `QuerySidebar.tsx` - Left sidebar with sessions and tables
   - ✅ `QueryResults.tsx` - Results display with filtering
   - ✅ `SQLConfirmationModal.tsx` - SQL confirmation dialog
   - ✅ `SessionsList.tsx` - Query sessions management
   - ✅ `DatabaseTablesList.tsx` - Database tables listing
   - ✅ `FilterControls.tsx` - Filtering controls
   - ✅ `ResultsTable.tsx` - Table results display

2. **Utility Extraction (Phase 3 - Partially Complete)**
   - ✅ `queryUtils.ts` - SQL validation and processing utilities

3. **Service Integration**
   - ✅ `DBService` - Database operations
   - ✅ `AIService` - AI-powered query assistance
   - ✅ Zustand stores for state management

### 🔄 Next Phase: Custom Hooks Extraction (Phase 1)

**Priority: HIGH** - This will provide the most significant improvement in maintainability

#### Hook 1: `useQuerySessions.ts`

**Purpose:** Manage query session state and operations
**Extract from Query.tsx lines ~52-120:**

```typescript
// State to extract:
(-querySessions,
  setQuerySessions - activeSessionId,
  setActiveSessionId - queryHistory,
  setQueryHistory - showHistory,
  setShowHistory -
    // Functions to extract:
    createNewSession() -
    deleteSession() -
    switchSession() -
    saveSessionToStorage() -
    loadSessionsFromStorage());
```

#### Hook 2: `useDatabaseOperations.ts`

**Purpose:** Handle database table operations and data loading
**Extract from Query.tsx lines ~56-66, ~200-300:**

```typescript
// State to extract:
(-databaseTables,
  setDatabaseTables - selectedTable,
  setSelectedTable - tableData,
  setTableData - isLoadingTableData,
  setIsLoadingTableData -
    // Functions to extract:
    fetchDatabaseTables() -
    loadTableData() -
    handleTableSelect() -
    refreshTableData());
```

#### Hook 3: `useQueryExecution.ts`

**Purpose:** Handle query execution and AI integration
**Extract from Query.tsx lines ~68-83, ~300-450:**

```typescript
// State to extract:
(-queryInput,
  setQueryInput - queryResult,
  setQueryResult - isExecuting,
  setIsExecuting - showSQLConfirmModal,
  setShowSQLConfirmModal - generatedSQL,
  setGeneratedSQL -
    // Functions to extract:
    executeQuery() -
    executeCurrentStatement() -
    handleNaturalLanguageQuery() -
    confirmAndExecuteSQL() -
    handleAIQueryGeneration());
```

#### Hook 4: `useTableFiltering.ts`

**Purpose:** Manage filtering, sorting, and data processing
**Extract from Query.tsx lines ~75-78, ~450-550:**

```typescript
// State to extract:
(-sortConfig,
  setSortConfig - filterConfigs,
  setFilterConfigs - filteredAndSortedData,
  setFilteredAndSortedData - pagination,
  setPagination -
    // Functions to extract:
    addFilter() -
    updateFilter() -
    removeFilter() -
    clearAllFilters() -
    handleSort() -
    applyFilterAndSort() -
    handlePaginationChange());
```

### 🔄 Remaining Phases

#### Phase 4: Enhanced Type Definitions

**Priority: MEDIUM**

Create `src/types/query.ts`:

```typescript
// Centralize all query-related interfaces:
- QuerySession (enhanced with more metadata)
- Pagination (with better generic support)
- SortConfig (with column type information)
- FilterConfig (with operator support)
- QueryExecutionContext
- QueryResultMetadata
```

#### Phase 5: Performance Optimizations

**Priority: LOW**

1. **Memoization Opportunities:**
   - Memoize filtered and sorted data calculations
   - Memoize table column definitions
   - Optimize re-renders with React.memo for components

2. **Code Splitting:**
   - Lazy load AI service components
   - Dynamic imports for heavy utilities

3. **State Management Optimization:**
   - Consider moving more state to Zustand stores
   - Implement proper state normalization

### 📊 Expected Impact After Hook Extraction

**Current:** 566 lines
**After Hook Extraction:** ~200-250 lines
**Maintainability:** Significantly improved
**Testability:** Each hook can be tested independently
**Reusability:** Hooks can be reused across components

### 🚀 Implementation Order

1. **Week 1:** Extract `useQuerySessions` and `useDatabaseOperations`
2. **Week 2:** Extract `useQueryExecution` and `useTableFiltering`
3. **Week 3:** Enhance type definitions and add comprehensive tests
4. **Week 4:** Performance optimizations and documentation

### 🧪 Testing Strategy

- Unit tests for each custom hook
- Integration tests for hook interactions
- Component tests for the refactored Query.tsx
- Performance benchmarks before/after refactoring

### 📝 Success Metrics

- [ ] Query.tsx reduced to under 250 lines
- [ ] 4 reusable custom hooks created
- [ ] 90%+ test coverage for hooks
- [ ] No regression in functionality
- [ ] Improved development experience (faster builds, better IntelliSense)

---

**Note:** This refactoring plan builds upon the excellent work already completed. The component extraction phase has been largely successful, and the focus now shifts to extracting business logic into custom hooks for maximum maintainability and reusability.
