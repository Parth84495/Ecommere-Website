# E-SHOP Backend

This workspace includes an Express backend server for the E-SHOP frontend. The backend now uses MySQL.

## Files

- `server.js` - Express backend with API endpoints for login, registration, orders, payments, products, and support requests
- `package.json` - Node project manifest
- `.env` - local server and MySQL settings
- `.env.example` - sample environment settings
- `mysql-schema.sql` - MySQL database and table setup script
- `data/products.json` - sample product catalog seeded into MySQL on first run
- `data/users.json` - demo user seeded into MySQL on first run

## MySQL Setup

1. Install MySQL Server locally.
2. Start the MySQL service.
3. Make sure `.env` matches your local MySQL login:

```env
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=eshop
```

Replace `your_mysql_password` with the password you created during MySQL installation. If your MySQL user really has no password, leave it blank as `MYSQL_PASSWORD=`.

The server automatically creates the `eshop` database and required tables when it starts. You can also run the SQL manually:

```powershell
mysql -u root -p < mysql-schema.sql
```

## Run Locally

Open PowerShell in this folder:

```powershell
cd "c:\Users\parth\OneDrive\Desktop\project software en"
npm install
npm start
```

If PowerShell says scripts are disabled on this system, use the batch launcher instead:

```powershell
.\start-server.bat
```

If Node.js is not installed, install the portable Node runtime first:

```powershell
.\install-node.bat
.\start-server.bat
```

Then open:

```text
http://localhost:3000
```

Demo login after first startup:

```text
Email: user@example.com
Password: password123
```

## API Endpoints

- `GET /api/products`
- `POST /api/login`
- `POST /api/register`
- `GET /api/user?email=...`
- `PUT /api/user`
- `GET /api/orders?email=...`
- `POST /api/orders`
- `POST /api/orders/:orderId/payment`
- `POST /api/support`

## Notes

- Frontend files are served from the `public/` folder.
- The backend seeds products and the demo user only when the matching MySQL tables are empty.
- If the backend is unavailable, login and registration still fall back to local storage in the frontend.
