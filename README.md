
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

---

## Next To-Do List (Frontend Only)

1. **Make the Website Look Good on All Devices** 
	- Check if the website looks nice on phones and tablets.
	- Adjust the layout and buttons so they are easy to use on any screen.

2. **Improve Forms**
	- Make sure forms (like sign up and sign in) check for correct email format and strong passwords before submitting.
	- Show clear messages if the user makes a mistake (like wrong email or weak password).

3. **Add Error and 404 Pages (priority)**
	- Create a simple page that shows “Page Not Found” if the user goes to a wrong link.
	- Show a friendly error message if something goes wrong.

4. **Use Sample Data for Features Not Connected Yet (priority)**
	- For things like travel history or payment, show example (fake) data until the backend is ready.
	- Make a simple user profile page with sample info.

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
