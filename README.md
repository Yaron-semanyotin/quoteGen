Quote Generator - Fullstack Web Application

1. Project Description

Quote Generator is a fullstack web application that allows business owners to create and export professional PDF quotes.

The system allows users to:

Register and log in securely

Manage business settings (logo, theme color, slogan, phone)

Create quotes with multiple dynamic items

Preview quotes before exporting

Export quotes as professional PDF documents

The project was built using MVC architecture and production-ready backend practices.

2. System Architecture

The project follows the MVC architecture:

Models - MongoDB schemas (User, Quote, Product)

Views - Handlebars templates

Controllers - Business logic layer

Config - External services configuration (Cloudinary)

Routes - Express routing

3. Technologies Used
Backend:

Node.js

Express

MongoDB + Mongoose

Puppeteer (PDF generation)

Cloudinary (Image storage)

Multer

Express-session

Bcrypt

Frontend:

Express Handlebars

HTML / CSS

JavaScript

Deployment

Render

MongoDB Atlas

4. Application Flow

User registers or logs in.

A session is created using express-session.

User configures business settings.

User creates quotes with dynamic items.

Quote can be previewed.

Quote is rendered to PDF using Puppeteer.

Logo images are stored securely in Cloudinary.

5. API Endpoints
5.1 Authentication Routes
GET /auth/login

Returns login page.
Response: HTML login form.

POST /auth/login

Authenticates user using email and password.

Request Body:

email

password

Action:

Validates credentials

Creates session

Redirects to /quotes

GET /auth/register

Returns registration page.

POST /auth/register

Registers a new user.

Request Body:

email

password

confirmPassword

Action:

Hashes password using bcrypt

Saves user in MongoDB

POST /auth/logout

Destroys user session.

5.2 Settings Routes
GET /auth/settings

Returns business settings page.

POST /auth/settings

Updates business information.

Request Body (FormData):

businessName

themeColor

slogan

phone

logo (image file)

Action:

Uploads image to Cloudinary

Saves business data in MongoDB

5.3 Quotes Routes
GET /quotes

Returns list of user quotes.

GET /quotes/new

Returns form to create new quote.

POST /quotes

Creates a new quote.

Request Body:

customerName

items (array of products)

notes

Action:

Saves quote in MongoDB

GET /quotes/:id

Returns specific quote details.

GET /quotes/:id/pdf

Generates and downloads PDF file.

Action:

Renders Handlebars template

Converts to PDF using Puppeteer

Sends file to client

5.4 Products Routes
GET /products

Returns list of products belonging to the loggedin user.

Action:

Reads user ID from session

Fetches products by ownerId from MongoDB

Sorts products by newest first

Renders products index page

GET /products/new

Returns form to create a new product.

Action:

Renders product creation form

POST /products

Creates a new product for the loggedin user.

Request Body:

name

price

unit

Action:

Validates name and price

Converts price to number

Ensures price is positive

Saves product in MongoDB with ownerId

Redirects to /products

GET /products/:id/edit

Returns edit form for a specific product.

Action:

Finds product by _id and ownerId

Verifies product belongs to loggedin user

Renders edit page

POST /products/:id

Updates an existing product.

Request Body:

name

price

unit

Action:

Validates input fields

Ensures price is positive

Updates product in MongoDB (filtered by _id and ownerId)

Redirects to /products

POST /products/:id/delete

Deletes a product.

Action:

Deletes product from MongoDB using _id and ownerId

Redirects to /products

GET /products/search?q=...

Search endpoint used for autocomplete inside the Quote Editor.

Query Parameter:

q (search text)

Action:

Searches products by name (case-insensitive)

Filters by ownerId

Returns up to 10 matching results

Responds with JSON array (name, price, unit)

6. Environment Variables

The project requires:

MONGO_URI

SESSION_SECRET

CLOUDINARY_CLOUD_NAME

CLOUDINARY_API_KEY

CLOUDINARY_API_SECRET

7. How to Run Locally

Clone the repository

Install dependencies:

npm install

Create a .env file in the root folder

Add required environment variables

Run the project:

npm start

Open in browser:

http://localhost:5000

8. Live Deployment

https://quotegen-et3v.onrender.com
