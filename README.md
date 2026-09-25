# COP4331C LAMP Stack Contact Manager -- Group 36
# Members and Roles
Ellie Carron	Frontend

Nirmal Halan	Frontend

Marco Medrano	Backend/API

Christian Pumarada	Project Manager + Database

Adrian Vincent	Database


# Project Overview
This project is a browser-based contact management application built using the LAMP (Linux, Apache, MySQL, PHP) stack. The application provides a web-based workflow for user registration and authentication, followed by access to a personal contacts management interface. Authenticated users can create, view, search, update, and delete their contacts, while administrative functionality provides additional user and account management capabilities.

The application is organized into three primary components:

1. **Database**
   - MySQL database for persistent storage of users and contacts.
   - Stores user credentials, account information, roles, account status, and contact records.

2. **API / Backend**
   - PHP-based API endpoints responsible for authentication, user management, and contact operations.
   - Processes client requests and communicates with the MySQL database through service and persistence layers.
   - Uses JSON for communication between the frontend and backend.
   - Enforces authentication, authorization, and data-access rules.

3. **Frontend**
   - Browser-based user interface built with HTML, CSS, and JavaScript.
   - Provides registration, login, contact management, search, and administrative interfaces.
   - Communicates with the backend through asynchronous API requests.
