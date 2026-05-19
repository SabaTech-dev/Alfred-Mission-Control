# Spec: Component Extraction Pattern

## Requirements
- Every component >500 lines must be split to <=300 lines
- Data fetching extracted to custom hooks under `src/hooks/`
- Visual sections extracted to sub-components
- Helper functions extracted to `src/lib/*-utils.ts`
- Interfaces/types extracted to `src/lib/*-types.ts`
- All existing props, state, and behavior preserved
- All i18n keys preserved without changes

## Scenarios

### Scenario 1: Hook extraction
- **Given** a component has inline useState + useEffect + fetch patterns
- **When** extracting to a custom hook
- **Then** the hook returns a typed object with data, loading, error, and refetch
- **And** the component uses the hook with destructuring

### Scenario 2: Sub-component extraction
- **Given** a component renders distinct visual sections (tabs, panels, lists)
- **When** extracting a section to a sub-component
- **Then** the sub-component receives props for all needed data and callbacks
- **And** the parent composes sub-components in its JSX

### Scenario 3: Type extraction
- **Given** a component defines interfaces at the top of the file
- **When** extracting types to a shared types file
- **Then** both the component and hook import from the types file
- **And** no `any` types are introduced

### Scenario 4: No functionality loss
- **Given** all extractions are complete
- **When** running `npm run build`
- **Then** the build succeeds with no new errors
- **And** all routes and features work identically

### Scenario 5: Line count validation
- **Given** all extractions are complete
- **When** checking line counts
- **Then** no .tsx or .ts file in src/ exceeds 300 lines
