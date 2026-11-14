# Price Tracker

Track product prices on Daraz and get an email when the price drops to your target.

![dashboard](./docs/dashboard.png)
![price history](./docs/detail.png)

**Live demo:** [EDIT: link once deployed]

> Note: emails are only delivered to the owner's address, because the free Resend plan requires a verified domain to email other people.

## Features
- Sign up and log in (JWT stored in an httpOnly cookie)
- Add a product link and a target price
- Product name, image and description are scraped automatically
- Prices are checked once a day, with history stored per product
- Email notification when the price reaches your target
- Dashboard with the current price, target and a "Target reached" badge for each product
- Detail page with a price history chart and a target line
- Remove products you no longer want to track
- Stays logged in across page refreshes

## Tech stack
- **Node.js + Express**: JavaScript on the server, minimal framework
- **PostgreSQL (Neon) + Prisma**: the data is relational (user -> products -> prices)
- **Puppeteer**: Daraz renders prices with JavaScript, so a plain HTTP fetch can't see them
- **node-cron**: schedules the daily price check
- **Resend**: sends the notification emails
- **React + Vite**: frontend
- **React Router**: client-side routing and protected pages
- **Recharts**: price history chart

## How it works
React talks to an Express REST API, and a node-cron job runs Puppeteer once a day.

1. A user adds a product link and a target price.
2. The backend opens the page with Puppeteer and scrapes the name, image, description and current price. A failed price scrape doesn't block adding the product, because the daily job retries it.
3. Once a day the cron job loops over the tracked products and scrapes each price, reusing one browser instance.
4. Each price is saved in `PriceHistory` with a date and a link to its product.
5. The server compares the new price with each user's target and sends an email through Resend when it is at or below the target.
6. The dashboard shows the latest price, and the detail page draws the full history.

**Database:** `User`, `Product`, `TrackedProduct`, `PriceHistory`.
`Product` holds the shared product data (link, name, image, description). `TrackedProduct` links a user to a product with their own target. `PriceHistory` stores one price per product per check.

## Run locally

Requires Node and a PostgreSQL database (Neon works).

**Backend**
1. `git clone [EDIT: repo url]`
2. `cd backend && npm install`
3. Copy `.env.example` to `.env` and fill in the values:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `RESEND_API_KEY`
   - `NODE_ENV ="development"`
   - `FRONTEND_URL` (must exactly match the frontend's address, e.g. `http://localhost:5173`, or cookies and CORS will fail)
   - [EDIT: any other variables]
4. `npx prisma migrate dev`
5. `npm start`

**Frontend**
1. `cd frontend && npm install`
2. Copy `.env.example` to `.env` and set `VITE_API_URL` (e.g. `http://localhost:3000`)
3. `npm run dev`

Create an account on the signup page to get started.

## API
All `:id` values are TrackedProduct ids and are scoped to the logged-in user.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /users | no | Sign up |
| POST | /users/login | no | Log in (sets the auth cookie) |
| POST | /users/logout | yes | Log out (clears the cookie) |
| GET | /users/me | yes | Get the current user |
| POST | /products | yes | Track a product (scrapes it on first add) |
| GET | /products/tracked-products | yes | List your tracked products with latest price |
| GET | /products/tracked-products/:id | yes | One tracked product with full price history |
| DELETE | /products/tracked-products/:id | yes | Stop tracking a product |

## Design decisions
- **Shared `Product` table:** two users tracking the same product share one set of price history, and each product is scraped once per day no matter how many people track it.
- **httpOnly cookie instead of localStorage:** JavaScript can't read the token, so an injected script can't steal it. CORS is configured with credentials for this.
- **Ownership checked in the database query:** reads and deletes filter by both id and user, so users can't access each other's data by guessing ids. A missing row and someone else's row both return 404.
- **Puppeteer instead of Axios and Cheerio:** Daraz renders prices with JavaScript.
- **One browser reused in the daily job:** launching Chrome is the slow part.
- **Refetch after adding a product:** the dashboard always shows real server data, including the scraped price.
- **List and history are separate:** the list returns only the latest price, and the full history loads on the detail page.

## Known limitations
- Products with variants (size/color) only track the default price
- JWTs last 7 days and can't be revoked (no refresh tokens)
- Scraping breaks if Daraz changes its HTML
- Emails only go to the owner (see note above)
- Targets can't be edited after adding a product

## Future work
- Variant tracking, refresh tokens, verified email domain
- Edit target price