# Local Backend Setup Guide (XAMPP & MySQL)

This guide walks you through setting up a completely offline local backend for **JEE-Nexus** using **XAMPP** (Apache & MySQL). 

By using this setup, the application will automatically fetch and evaluate questions locally from your computer, without requiring an active internet connection or any Supabase account.

---

## 🛠️ Step 1: Install & Start XAMPP

1. Download and install **[XAMPP](https://www.apachefriends.org/)** for Windows.
2. Open the **XAMPP Control Panel**.
3. Click the **Start** button next to **Apache** and **MySQL**. Both modules should turn green.

---

## 🗄️ Step 2: Import the MySQL Database

We have generated a pre-packaged SQL dump file containing all **14,973 questions** with math equations in LaTeX, options, answers, and solutions.

1. Open your web browser and navigate to **[http://localhost/phpmyadmin](http://localhost/phpmyadmin)**.
2. In phpMyAdmin, click on the **Import** tab at the top.
3. Click **Choose File** and select:
   `D:\JEE\DB\jee_nexus_mysql.sql`
4. Leave all settings at their defaults and click the **Import** button at the bottom.
5. Once complete, you will see a new database named `jee_nexus` populated with tables (`profiles`, `exams`, `subjects`, `chapters`, `questions`, `options`, `solutions`).

---

## 🌐 Step 3: Add Backend API Files to Apache

Your React app communicates with MySQL using lightweight PHP script endpoints. We have generated these endpoints for you.

1. Create a new folder named `api` inside your XAMPP installation directory under `htdocs`:
   `C:\xampp\htdocs\api`
2. Copy all the `.php` files from your local project's `api` folder into this new folder:
   - Copy `D:\JEE\api\db.php` ➔ `C:\xampp\htdocs\api\db.php`
   - Copy `D:\JEE\api\questions.php` ➔ `C:\xampp\htdocs\api\questions.php`
   - Copy `D:\JEE\api\auth.php` ➔ `C:\xampp\htdocs\api\auth.php`
   - Copy `D:\JEE\api\exam_attempts.php` ➔ `C:\xampp\htdocs\api\exam_attempts.php`

*Now, you can test that your API is running by visiting [http://localhost/api/questions.php](http://localhost/api/questions.php) in your browser. It should return a JSON list of questions.*

---

## 🚀 Step 4: Run the Web App Locally

When your Vite project runs without Supabase environment variables configured in `.env`, it will automatically detect the absence of the Supabase client and route all API calls to your local XAMPP backend on `http://localhost/api/`!

1. Open a terminal (PowerShell) in `D:\JEE`.
2. Install Node.js dependencies:
   ```powershell
   npm install
   ```
3. Start the local server:
   ```powershell
   npm run dev
   ```
4. Open the link (usually **`http://localhost:5173`**) in your web browser.
5. Sign in using the Admin account created in your MySQL database:
   - **User Name / Email**: `satyu000@gmail.com`
   - **Security Key / Password**: `admin123`

You are now running fully offline with 15,000 previous year questions!
