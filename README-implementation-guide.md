# CraccTracc NextJS Implementation Guide for AI Agents

## Overview
This guide provides step-by-step instructions for AI agents to port the CraccTracc Python sailing analysis tool to NextJS/TypeScript. The implementation is divided into structured phases with clear acceptance criteria.

## Project Structure
```
cracctracc-web/
├── src/
│   ├── app/                     # Next.js 13+ app directory
│   │   ├── api/                 # API routes
│   │   │   ├── upload/route.ts  # File upload handling
│   │   │   └── export/route.ts  # Data export
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/              # React components
│   │   ├── charts/              # Visualization components
│   │   ├── upload/              # File upload components
│   │   ├── tables/              # Data table components
│   │   └── Dashboard.tsx        # Main dashboard
│   ├── lib/                     # Core business logic
│   │   ├── parsers/             # GPX/VKX file parsers
│   │   ├── calculations/        # Wind & manoeuvre calculations
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Utility functions
│   └── styles/                 # CSS styles
├── __tests__/                  # Test files
├── public/                     # Static assets
├── package.json
├── Dockerfile
└── README.md
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Files**: See `cracctracc-nextjs-implementation-plan.md` Tasks 1.1-1.3
- Initialize NextJS project with TypeScript
- Set up project structure and dependencies
- Configure ESLint and Prettier

### Phase 2: Data Types (Week 2)
**Files**: See `cracctracc-nextjs-implementation-plan.md` Tasks 2.1-2.2
- Define TypeScript interfaces for sailing data
- Create type guards for runtime validation
- Establish data contracts between components

### Phase 3: File Parsing (Week 3-4)
**Files**: See `cracctracc-nextjs-implementation-plan.md` Tasks 3.1-3.3
- Implement GPX parser with XML parsing
- Create VKX parser structure (needs binary format analysis)
- Build unified file parser interface

### Phase 4: Calculations (Week 4-5)
**Files**: See `cracctracc-nextjs-implementation-plan.md` Tasks 4.1-4.2
- Port wind calculation algorithms from Python
- Implement manoeuvre detection logic
- Add sailing performance analysis

### Phase 5: Data Processing (Week 5-6)
**Files**: See `cracctracc-nextjs-implementation-plan.md` Task 5.1
- Create complete data processing pipeline
- Implement filtering and analysis functions
- Add summary statistics generation

### Phase 6: User Interface (Week 6-8)
**Files**: See `cracctracc-phase-6-8-plan.md` Tasks 6.1-6.3
- Build file upload component with drag-and-drop
- Create interactive charts (polar, course, wind)
- Develop main dashboard layout

### Phase 7: API Implementation (Week 8-9)
**Files**: See `cracctracc-phase-6-8-plan.md` Tasks 7.1-7.2
- Create file upload API endpoint
- Implement data export functionality
- Add proper error handling and validation

### Phase 8: Testing & Deployment (Week 9-12)
**Files**: See `cracctracc-phase-6-8-plan.md` Tasks 8.1-8.3
- Set up comprehensive testing framework
- Configure Docker and deployment
- Optimize performance for large datasets

## Key Dependencies

### Production Dependencies
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0", 
  "typescript": "^5.0.0",
  "recharts": "^2.8.0",
  "plotly.js-react": "^2.6.0",
  "geographiclib-geodesic": "^2.0.0",
  "fast-xml-parser": "^4.3.0",
  "date-fns": "^2.30.0",
  "tailwindcss": "^3.3.0",
  "lucide-react": "^0.290.0"
}
```

### Development Dependencies
```json
{
  "jest": "^29.0.0",
  "@testing-library/react": "^13.0.0",
  "@types/plotly.js": "^2.12.0",
  "prettier": "^3.0.0"
}
```

## Critical Implementation Notes

### 1. VKX Parser Implementation
The VKX parser requires reverse engineering the binary format from the Python implementation. Priority steps:
1. Analyze `cracctracc/modules/vkx_parser.py` 
2. Understand binary structure and data layout
3. Implement JavaScript equivalent using DataView/ArrayBuffer
4. Test with sample VKX files from `data/` directory

### 2. Wind Calculation Accuracy
Ensure mathematical precision matches Python:
- Use exact same algorithms for TWA calculation
- Implement angular interpolation correctly
- Test with identical datasets for verification

### 3. Performance Considerations
For large GPX files (>10k track points):
- Process data in chunks to avoid UI blocking
- Implement progressive loading
- Use Web Workers for intensive calculations if needed

### 4. Chart Integration
Plotly.js requires careful handling:
- Use dynamic imports to avoid SSR issues
- Implement proper loading states
- Handle responsive design for mobile devices

## Testing Strategy

### Unit Tests
- All parser functions with valid/invalid inputs
- Wind and manoeuvre calculation algorithms
- Data processing pipeline components

### Integration Tests
- End-to-end file upload and processing
- API endpoint functionality
- Chart rendering with real data

### Performance Tests
- Large file processing (2MB+ GPX files)
- Memory usage during data processing
- Chart rendering performance

## Deployment Options

### Option 1: Vercel (Recommended)
- Simple deployment with `vercel.json` configuration
- Automatic builds from Git repository
- Built-in CDN and performance optimization

### Option 2: Docker
- Use provided `Dockerfile` for containerization
- Deploy to any cloud provider (AWS, GCP, Azure)
- Use `docker-compose.yml` for local development

### Option 3: Static Export
- Export static build for CDN hosting
- Limited to client-side processing only
- Good for demo deployments

## Success Criteria

### Functional Requirements ✅
- [ ] Parse GPX files correctly (match Python output)
- [ ] Calculate wind angles and sailing metrics
- [ ] Detect manoeuvres (tacks, gybes, etc.)
- [ ] Generate interactive visualizations
- [ ] Export data in CSV/JSON formats

### Technical Requirements ✅
- [ ] TypeScript compilation without errors
- [ ] Responsive design (mobile-friendly)
- [ ] Handle files up to 50MB
- [ ] Process 10k+ track points smoothly
- [ ] Test coverage >80%

### User Experience Requirements ✅
- [ ] Intuitive file upload process
- [ ] Clear error messages and validation
- [ ] Interactive charts with tooltips
- [ ] Fast processing feedback
- [ ] Professional UI design

## Getting Started

### For AI Agents Following This Plan:

1. **Start with Phase 1**: Initialize the NextJS project exactly as specified
2. **Follow Sequential Order**: Complete each task before moving to the next
3. **Test Continuously**: Run tests after implementing each component
4. **Reference Python Code**: Use the original Python implementation for algorithm verification
5. **Document Issues**: Note any challenges or deviations from the plan

### Commands to Begin:
```bash
# Initialize project
npx create-next-app@latest cracctracc-web --typescript --tailwind --eslint --app

# Install dependencies  
cd cracctracc-web
npm install recharts plotly.js react-plotly.js geographiclib-geodesic fast-xml-parser date-fns lucide-react @tanstack/react-table

# Start development
npm run dev
```

### Verification Steps:
After each phase, verify:
1. TypeScript compilation succeeds
2. All tests pass
3. No console errors
4. Functionality matches specifications
5. Performance is acceptable

## Support Resources

- **Original Python Code**: Available in `cracctracc/` directory
- **Sample Data**: GPX/VKX files in `data/` directory  
- **Implementation Plans**: Detailed in `cracctracc-nextjs-implementation-plan.md` and `cracctracc-phase-6-8-plan.md`
- **TypeScript Documentation**: https://www.typescriptlang.org/docs/
- **NextJS Documentation**: https://nextjs.org/docs

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1-2   | 2-3 weeks | Project setup, data types, file parsing |
| 3-4   | 2-3 weeks | Calculations, data processing |
| 5-6   | 2-3 weeks | UI components, charts |
| 7-8   | 2-3 weeks | API, testing, deployment |

**Total Estimated Time**: 10-12 weeks for complete implementation

This guide provides the complete roadmap for successfully porting CraccTracc to a modern web application. Follow the detailed task specifications in the referenced implementation plan documents for step-by-step instructions.