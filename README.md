# Fernando Injoque - Portfolio & Analytics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Ferinjoque/ferinjoque-website)
This repository contains the source code for the personal portfolio website of Fernando Injoque ([injoque.dev](https://injoque.dev)), a Software Engineering student specializing in AI, Automation, and Sustainable Finance consulting & development.

Beyond showcasing projects and experience, this site features a custom-built analytics backend leveraging Supabase Edge Functions (Deno runtime) and PostgreSQL for tracking user interactions and generating automated, AI-enhanced insights.

## Key Features

**Frontend:**

* Modern, minimalist design with subtle animations and sustainability-themed visuals.
* Responsive layout optimized for desktop, tablet, and mobile devices.
* Dark theme preference for reduced energy consumption on compatible screens.
* Sections for About, Projects, Experience, and Contact.
* Interactive elements built with Vanilla JavaScript.

**Backend & Analytics:**

* **Custom Event Tracking:** Captures page views, section views, clicks, and hovers using client-side JavaScript.
* **Detailed Data Collection:** Gathers referrer information, UTM parameters, device context (screen/viewport size, language, timezone), user agent, session IDs, and anonymized IP addresses.
* **GeoIP Enrichment:** Uses IP addresses to determine visitor country/region/city via ipinfo.io API.
* **Serverless Processing:** Events are sent to a Supabase Edge Function built with Deno for processing.
* **Data Storage:** Processed events are stored in a Supabase PostgreSQL database.
* **Automated Weekly Reporting:** A scheduled Supabase Function (`pg_cron`) runs weekly to:
    * Aggregate key metrics (visitors, sessions, page views, top referrers, top pages, top countries, device types).
    * Generate insights using the OpenAI API.
    * Send a summary report via email (using Resend).
* **Data Visualization:** Data is visualized using Google Looker Studio connected to the Supabase database.

## Tech Stack

**Frontend:**

* HTML5
* CSS3 (Custom Properties / Variables)
* Vanilla JavaScript (ES Modules)
* Google Material Icons

**Backend & Analytics:**

* **Supabase:**
    * PostgreSQL Database
    * Edge Functions (Deno Runtime)
    * `pg_cron` for scheduling
    * Supabase Secrets Management
* **Deno:** Server-side TypeScript runtime.
* **APIs:**
    * OpenAI API (for insights)
    * Resend API (for email reports)
    * ipinfo.io API (for GeoIP)
* **Deployment:** GitHub Actions for CI/CD of Edge Functions.
* **Visualization:** Google Looker Studio

## Setup & Configuration

### Prerequisites

* Git
* Supabase Account
* Node.js (only if using npm packages for local tooling/linting, not required by core site/functions)
* API Keys:
    * OpenAI API Key
    * Resend API Key (and a verified sending domain configured in Resend)
    * ipinfo.io API Key (Optional, needed for GeoIP enrichment)
* (Optional) Supabase CLI for advanced local management or troubleshooting.

### Steps

1.  **Clone Repository:**
    ```
    git clone https://github.com/Ferinjoque/ferinjoque-website.git
    cd ferinjoque-website
    ```
2.  **Supabase Project:** Ensure you have a Supabase project set up.
3.  **Database Schema:** Apply the necessary SQL to create the `events` table and the `events_view`. Enable the `pg_cron` extension via the Supabase Dashboard (Database -> Extensions). The required SQL can be found within the project.
4.  **Supabase Secrets:** In your Supabase project dashboard (Project Settings -> Secrets), add the following secrets with your actual API keys:
    * `OPENAI_API_KEY`
    * `RESEND_API_KEY`
    * `IPINFO_API_KEY` (Only if you intend to use GeoIP)
5.  **GitHub Secrets:** In your GitHub repository settings (Settings -> Secrets and variables -> Actions), add the following secrets:
    * `SUPABASE_ACCESS_TOKEN`: Generate this from your Supabase account settings (Access Tokens).
    * `SUPABASE_PROJECT_REF`: Find this in your Supabase project's General Settings.
    * *(Optional)* You might need `OPENAI_API_KEY`, `RESEND_API_KEY`, `IPINFO_API_KEY` here too if your functions need them during the build/deploy phase, though typically they are only needed at runtime via `Deno.env.get()`). Usually, only the token and project ref are needed for deployment itself.
6.  **Configure Email:** In `supabase/functions/weekly-report/index.ts`, update the `from:` and `to:` email addresses in the Resend API call section. The `from:` address must use a domain you have verified with Resend.
7.  **Schedule Weekly Report:** In the Supabase SQL Editor, run the `cron.schedule` command to set up the weekly trigger for the `weekly-report` function.

## Deployment

* **Edge Functions:** Deployments are handled automatically via the GitHub Actions workflow defined in `.github/workflows/deploy_functions.yml`. Pushing changes to the `main` branch will trigger the workflow, which uses the Supabase CLI to deploy the functions defined in `supabase/functions/`.
* **Static Website:** Deploy the frontend files (HTML, CSS, JS, assets) to your preferred static hosting provider (e.g., GitHub Pages, Vercel, Netlify) and configure your custom domain there.

## Looker Studio Connection

1.  Create a read-only user in your Supabase database.
2.  Connect Google Looker Studio using the **PostgreSQL** connector.
3.  Use the database connection details found in Supabase Project Settings -> Database. Use the read-only user credentials.
4.  Connect to the `public.events_view` for easier reporting.

## Customization

* Update personal information, projects, and experience in `index.html`.
* Adjust colors and fonts via CSS variables in `css/styles.css`.
* Modify tracking behavior or add new events in `js/main.js` and `js/tracker.js`.
* Enhance analytics or reporting logic in the Edge Functions (`supabase/functions/*/index.ts`).

## License

This project is licensed under the MIT License.

## Acknowledgements

* Bolt.new Team
* Supabase Team
* Deno Team
