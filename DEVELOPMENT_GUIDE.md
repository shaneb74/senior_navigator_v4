# GCP Development Guide

## 🚀 Quick Start

### Start Development Servers
```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend
cd frontend
npm start
```

### Access URLs
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🔍 Debugging Tips

### NgRx DevTools
1. Install Redux DevTools extension in Chrome/Firefox
2. Open browser DevTools → Redux tab
3. See all actions, state changes, and time-travel debug

### Console Logging
The app includes extensive console logging:
- `[GCP]` - Component lifecycle
- `[GCP Effects]` - Effect execution
- `[GCP Service]` - API calls
- `[GCP API]` - Backend processing

### Common Issues & Solutions

#### Port Already in Use
```bash
# Kill process on port 4200
lsof -ti:4200 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

#### Module Not Found
```bash
cd frontend
npm install
```

#### CORS Errors
Check `backend/server.js` CORS configuration:
```javascript
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

## 🧪 Testing Strategies

### Manual Testing Flow

1. **Hub Navigation**
   - Load http://localhost:4200/hub
   - Verify GCP card shows "Start"
   - Verify Cost Planner and PFMA show "Locked"
   - Check overall progress shows 0%

2. **GCP Assessment**
   - Click "Start" on GCP card
   - Verify form loads
   - Fill out first section
   - Click "Next" - verify section changes
   - Click "Previous" - verify navigation works
   - Try clicking "Next" with required fields empty - verify validation message
   - Complete all sections
   - Click "Get Recommendation"
   - Verify loading state

3. **Results Display**
   - Verify results page shows recommendation
   - Check scores display correctly
   - Verify flags appear if present
   - Click "Back to Hub"

4. **Hub After Completion**
   - Verify GCP shows "✓ Completed"
   - Verify Cost Planner now shows "Start" (unlocked)
   - Verify PFMA still shows "Locked"
   - Check overall progress shows 33%

### API Testing with curl

```bash
# Health check
curl http://localhost:3000/health

# Get care tiers
curl http://localhost:3000/api/gcp/tiers

# Submit assessment (example)
curl -X POST http://localhost:3000/api/gcp/submit \
  -H "Content-Type: application/json" \
  -d '{
    "age_range": "75_84",
    "living_situation": "alone",
    "isolation": "moderate",
    "adl_bathing": "needs_help",
    "adl_dressing": "independent",
    "fall_history": "yes_recent",
    "wandering": "no",
    "memory_issues": "moderate"
  }'
```

## 📝 Making Changes

### Adding a New Question to GCP

1. **Update JSON Config**
   ```json
   // frontend/src/assets/configs/gcp_module.json
   {
     "id": "new_question",
     "type": "string",
     "select": "single",
     "label": "Your new question?",
     "required": true,
     "options": [
       { "label": "Option 1", "value": "opt1" },
       { "label": "Option 2", "value": "opt2" }
     ]
   }
   ```

2. **Update Backend Scoring** (if needed)
   ```javascript
   // backend/services/gcpScoring.js
   // Add logic to incorporate new question into scoring
   ```

3. **Test**
   - Reload frontend
   - New question appears in form
   - Submit and verify backend handles it

### Adding a New Section

1. **Add Section to JSON**
   ```json
   {
     "id": "new_section",
     "title": "New Section Title",
     "description": "Description here",
     "questions": [...]
   }
   ```

2. **No Code Changes Needed!**
   - Formly automatically renders new section
   - Navigation updates automatically
   - Progress bar adjusts

### Modifying Validation

1. **In JSON Config**
   ```json
   {
     "id": "question_id",
     "required": true,
     "validation": {
       "min": 0,
       "max": 100
     }
   }
   ```

2. **In ModuleConfigService** (for custom validation)
   ```typescript
   // frontend/src/app/core/services/module-config.service.ts
   convertQuestionToFormlyField(question: Question): FormlyFieldConfig {
     // Add custom validators
     field.validators = {
       validation: ['custom-validator']
     };
   }
   ```

## 🔧 Extending to Cost Planner

### Step-by-Step Guide

1. **Create Directory Structure**
   ```bash
   mkdir -p frontend/src/app/features/cost-planner/{components,services,store}
   mkdir -p frontend/src/app/features/cost-planner/components/{cost-form,cost-results}
   ```

2. **Copy GCP Pattern**
   ```bash
   # Use GCP as template
   cp -r frontend/src/app/features/gcp/components/gcp-form \
         frontend/src/app/features/cost-planner/components/cost-form
   
   # Rename and update imports
   ```

3. **Create Cost Planner Service**
   ```typescript
   @Injectable({ providedIn: 'root' })
   export class CostPlannerService {
     private readonly apiUrl = `${environment.apiBaseUrl}/cost-planner`;
     
     submitPlan(formData: any): Observable<FinancialProfile> {
       return this.http.post<FinancialProfile>(`${this.apiUrl}/submit`, formData);
     }
   }
   ```

4. **Create NgRx Store**
   - Actions (copy GCP pattern)
   - Reducers (adjust state shape)
   - Effects (use CostPlannerService)
   - Selectors

5. **Create Backend Route**
   ```javascript
   // backend/routes/costPlanner.js
   router.post('/submit', async (req, res) => {
     // Calculate financial profile
     // Return FinancialProfile contract
   });
   ```

6. **Update Hub**
   - Already configured! Just needs Cost Planner to be complete

## 🎨 Styling Guide

### Material Theme Colors
```scss
// Primary: #1976d2 (blue)
// Accent: #4caf50 (green)
// Warn: #f44336 (red)
```

### Component Styling Pattern
```scss
.component-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  
  .header {
    text-align: center;
    margin-bottom: 32px;
  }
  
  .content {
    // Component-specific styles
  }
}

// Responsive
@media (max-width: 768px) {
  .component-container {
    padding: 16px;
  }
}
```

### Material Design Best Practices
- Use `mat-raised-button` for primary actions
- Use `mat-button` for secondary actions
- Use `mat-icon` with text for clarity
- Maintain 8px spacing grid
- Use elevation (cards) for grouping

## 📊 Performance Tips

### Bundle Size Optimization
```bash
# Analyze bundle
cd frontend
npm run build -- --configuration production --stats-json
npx webpack-bundle-analyzer dist/frontend/stats.json
```

### Lazy Loading
All feature modules already use lazy loading:
```typescript
{
  path: 'gcp',
  loadChildren: () => import('./features/gcp/gcp.routes')
}
```

### Change Detection
Consider using `OnPush` for results components:
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

## 🔐 Security Considerations

### Environment Variables
```bash
# backend/.env
PORT=3000
FEATURE_GCP_LLM_TIER=off
NODE_ENV=development
```

### API Security (Production)
- Add authentication middleware
- Implement rate limiting
- Validate all inputs
- Sanitize user data
- Use HTTPS only

### CORS (Production)
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST'],
  credentials: true
}));
```

## 📚 Resources

### Angular Documentation
- [Angular.dev](https://angular.dev)
- [NgRx](https://ngrx.io)
- [Formly](https://formly.dev)
- [Material](https://material.angular.io)

### Project Documentation
- `SETUP_GUIDE.md` - Comprehensive architecture guide
- `GCP_BUILD_SUMMARY.md` - Implementation summary
- `GCP_FLOW_DIAGRAM.md` - Visual flow diagrams
- `PROGRESS.md` - Project progress tracker

### Code Examples
All components include inline comments and follow Angular style guide.

## 🐛 Common Errors

### Error: "Cannot find module '@angular/core'"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 4200 already in use"
```bash
lsof -ti:4200 | xargs kill -9
```

### Error: "Module has no exported member 'X'"
Check imports and make sure TypeScript compilation is clean:
```bash
cd frontend
npm run build
```

### Error: "Cannot match any routes"
Check `app.routes.ts` and ensure lazy-loaded modules export routes correctly.

### Error: "Backend not responding"
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check backend logs for errors
cd backend
node server.js
```

## 💡 Pro Tips

1. **Use Redux DevTools** - See every state change in real-time
2. **Hot Reload** - Both frontend and backend support file watching
3. **Console Logs** - Extensive logging already in place
4. **TypeScript Strict** - Catch errors at compile time
5. **Component Reuse** - Hub pattern can be used for other navigation needs
6. **MCIP Service** - Central source of truth for product state
7. **JSON Configs** - Easy to update forms without code changes

---

**Guide Version**: 1.0  
**Last Updated**: November 7, 2025  
**For Questions**: See SETUP_GUIDE.md or project documentation
