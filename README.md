
# Commuter Project

## Project Summary
This project is a commuter web application with a React frontend and a Django REST backend. It allows users to sign up, sign in, and access features like route planning, travel history, and premium upgrades. PostgreSQL is used as the main database.

---

## What Has Been Done

### Backend (Django REST)
- Set up Django REST Framework with PostgreSQL database.
- Implemented user authentication (sign up, sign in, logout).
- Used environment variables for all secrets and database credentials.
- Added security best practices (secure cookies, CORS, HSTS, etc).

### Frontend (React)
- Built sign up, sign in, and logout pages with modern UI.
- Connected authentication pages to backend API.
- **Added Profile Screen** with dashboard layout displaying user account details and travel history.

---
WHATS NEW(!!!)
## Recent Updates: Profile Screen

### What Was Added
- **Profile Dashboard Screen** (`src/Screens/ProfileScreen.js`)
  - Modern dashboard UI with avatar, metrics cards, and responsive layout
  - Displays user name, traveler type, subscription status
  - Shows total trips counter and last travel destination
  - Travel history section displaying the 3 most recent trips

- **Local Travel Logger** (`src/services/travelLogger.js`)
  - Logs trip selections to `localStorage` for demo purposes
  - Stores user_id, town_id, town_name, and timestamp
  - Merges with existing JSON mock data for complete history

- **PSGC Town Mapping** (`src/data/psgc_towns.json`)
  - Maps PSGC codes (e.g., `0305402000`) to actual town names
  - Ensures town names display correctly instead of IDs

- **"Plan Route & Log" Button** in Homescreen
  - User must click button to trigger route calculation
  - Records destination trip to profile history when clicked with town_name and timestamp
  - Stores to `localStorage` (`travel_logs_v1`) — persists across sessions
  - Future-proof: easily replaceable with backend API POST call

### How It Works (Data Flow)
- **Profile History Display**: Merges two sources:
  1. Bundled mock data from `src/data/town_selection.json` (JSON)
  2. User-logged trips from `localStorage` (travelLogger.js)
  - Sorted newest-first, displays last 3 items in UI
  - **Total trip count** = all entries from both sources combined

- **Town Name Resolution** (PSGC Code → Name):
  1. `getTownById(id)` checks `src/data/towns.json` first (numeric IDs)
  2. Falls back to `src/data/psgc_towns.json` (PSGC codes like `0305402000`)
  3. Returns placeholder if no match found
  - Ensures Profile always shows town names, never IDs

### Mock Data Being Used (To Be Replaced by Backend)
1. **User Information** - `src/data/users.json`
2. **Subscription Status** - `src/data/subscriptions.json`
3. **Travel History (base)** - `src/data/town_selection.json`
4. **Local Trip Logs** - `localStorage` key: `travel_logs_v1`
5. **Town Mappings** - `src/data/psgc_towns.json`

### Backend Integration Next Steps

#### 1. Profile Endpoint
   - `GET /api/users/{user_id}/profile` - Returns user details, subscription, trip count
   - Response: `{ name, email, traveler_type, subscription_status, total_trips }`
   - Frontend call: Update `getSubscriptionForUser()` in `src/Screens/db.js`

#### 2. Travel History Endpoints
   - `GET /api/users/{user_id}/travel-history?limit=3` - Returns 3 most recent trips
   - Response format: `[{ town_id, town_name, selected_at }, ...]`
   - **Important**: Include `town_name` in response (PSGC name mapping)
   - `POST /api/users/{user_id}/travel-history` - Log new trip
     - Body: `{ town_id, town_name, selected_at }`
     - Called when user clicks "Plan Route & Log" in Homescreen
   - Frontend call: Update `getRecentSelectionsForUser()`, `getTotalTripsForUser()` in `src/Screens/db.js`

#### 3. Implementation Path
   - Replace `getLogsForUser()` call in `src/Screens/db.js` with API fetch
   - Remove dependency on `src/services/travelLogger.js` (can deprecate after)
   - Update `src/Screens/Homescreen.js` "Plan Route & Log" button to POST to backend endpoint instead of localStorage
   - Add authorization headers (JWT/session token) to all requests

#### 4. Testing Notes
   - Current mock uses `localStorage` key: `travel_logs_v1`
   - Total trip count = all entries (JSON + local logs) combined
   - Profile shows only last 3 trips but counts all trips taken

---

## Next To-Do List (Frontend Only)

1. **Make the Website Look Good on All Devices** 
	- Check if the website looks nice on phones and tablets.
	- Adjust the layout and buttons so they are easy to use on any screen. (DONE ✅)

2. **Improve Forms**
	- Make sure forms (like sign up and sign in) check for correct email format and strong passwords before submitting.
	- Show clear messages if the user makes a mistake (like wrong email or weak password). (IN PROGRESS)

3. **Add Error and 404 Pages (priority)**
	- Create a simple page that shows “Page Not Found” if the user goes to a wrong link.
	- Show a friendly error message if something goes wrong. (IN PROGRESS)

4. **Use Sample Data for Features Not Connected Yet (priority)**
	- For things like travel history or payment, show example (fake) data until the backend is ready.
	- Make a simple user profile page with sample info. ✅ **DONE - Profile dashboard with mock data**

5. **Create Placeholders for Future Features (priority)**
	- Add simple pages or sections for features you plan to add later (like payment or premium dashboard), even if they don’t work yet.

6. **Show Notifications and Confirmations (priority)**
	- Show a small popup (toast) when something important happens (like login success or error).
	- Ask the user to confirm before logging out or making a payment.

7. **Test the Website**
	- Try the website on different browsers (like Chrome, Firefox) and devices.
	- Make sure you can use the website with just the keyboard (for accessibility).

8. **Get Ready for Deployment (important)**
	- Make sure images and files are not too big.
	- Write down any settings or steps needed to connect to the backend later.

---

**Note:**
Focus only on these new tasks. You don’t need to redo things you already finished, like basic login or navigation.
