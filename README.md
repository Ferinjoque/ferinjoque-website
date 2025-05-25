# Fernando Injoque - Portfolio, Analytics & RPG Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Ferinjoque/ferinjoque-website)

This repository contains the source code for the personal portfolio website of Fernando Injoque ([injoque.dev](https://injoque.dev)), a Software Engineering student specializing in AI, Automation, and Sustainable Finance consulting & development.

The site features:
1.  A professional portfolio showcasing projects and experience.
2.  A custom-built analytics backend leveraging Supabase Edge Functions (Deno runtime) and PostgreSQL for tracking user interactions and generating automated, AI-enhanced insights.
3.  **"Eco-Echoes: An AI Chronicle"**: An interactive text-based RPG powered by generative AI, exploring themes of AI ethics and environmental sustainability.

## ✨ Key Features

### Portfolio Frontend (`index.html`)
* Modern, minimalist design with subtle animations and sustainability-themed visuals.
* Responsive layout optimized for desktop, tablet, and mobile devices.
* Dark theme preference for reduced energy consumption on compatible screens.
* Sections for About, Projects, Experience, and Contact.
* Interactive elements built with Vanilla JavaScript.

### Interactive RPG: Eco-Echoes (`rpg.html`)
* **Immersive Gameplay:** A text-based RPG experience accessible via `rpg.html`.
* **AI Game Master:** Narrative and game progression driven by Google's AI (Gemini models) through a dedicated Supabase Edge Function (`rpg-ai-engine`).
* **Thematic Storytelling:** Explores AI ethics, environmental sustainability, and decision-making in a sci-fi context.
* **Dynamic Choices:** Player commands and AI-generated choices shape the story.

### Backend & Analytics
* **Custom Event Tracking:** Captures page views, section views, clicks, and hovers from the main portfolio site.
* **Detailed Data Collection:** Gathers referrer information, UTM parameters, device context (screen/viewport size, language, timezone), user agent, session IDs, and anonymized IP addresses.
* **GeoIP Enrichment:** Uses IP addresses to determine visitor country/region/city via ipinfo.io API for analytics.
* **Serverless Processing:** Events are sent to Supabase Edge Functions (Deno) for processing.
* **Data Storage:** Analytics events are stored in a Supabase PostgreSQL database.
* **Automated Weekly Reporting (Analytics):** A scheduled Supabase Function (`pg_cron`) runs weekly to:
    * Aggregate key metrics (visitors, sessions, page views, top referrers, top pages, top countries, device types).
    * Generate insights using the OpenAI API.
    * Send a summary report via email (using Resend).
* **Data Visualization (Analytics):** Data is visualized using Google Looker Studio connected to the Supabase database.

## 🛠️ Tech Stack

**Frontend (Portfolio & RPG):**
* HTML5
* CSS3 (Custom Properties / Variables)
* Vanilla JavaScript (ES Modules)
* Google Material Icons

**Backend & APIs:**
* **Supabase:**
    * PostgreSQL Database
    * Edge Functions (Deno Runtime) for:
        * Analytics event tracking (`track` function)
        * RPG AI engine (`rpg-ai-engine` function)
        * Weekly analytics reporting (`weekly-report` function)
    * `pg_cron` for scheduling
    * Supabase Secrets Management
* **Deno:** Server-side TypeScript runtime
* **Generative AI APIs:**
    * Google AI (Gemini models for RPG)
    * OpenAI API (for analytics insights)
* **Other APIs:**
    * Resend API (for email reports)
    * ipinfo.io API (for GeoIP)
* **Deployment:** GitHub Actions for CI/CD of Edge Functions
* **Visualization (Analytics):** Google Looker Studio

## 🚀 Setup & Configuration

### Prerequisites
* Git
* A Supabase Account & Project
* Node.js (optional, for local tooling/linting if you choose to use npm packages)
* (Optional) Supabase CLI for local development and management.

### Configuration Steps

1.  **Clone Repository:**
    ```bash
    git clone [https://github.com/Ferinjoque/ferinjoque-website.git](https://github.com/Ferinjoque/ferinjoque-website.git)
    cd ferinjoque-website
    ```

2.  **Supabase Project Setup:**
    * Ensure you have an active Supabase project.
    * **Database Schema (Analytics):** Apply the necessary SQL to create the `events` table and `events_view` for the analytics system. You can find these SQL scripts within the project or define them based on the `track` function's data insertion logic.
    * **Enable `pg_cron`:** In your Supabase Dashboard, navigate to `Database` -> `Extensions` and enable `pg_cron` for the weekly analytics report.

3.  **Configure Secrets:**
    Sensitive information like API keys and specific email addresses are managed as secrets.

    * **Supabase Secrets:** In your Supabase project dashboard (Project Settings -> Secrets), add the following:
        * `GOOGLE_AI_API_KEY`: Your Google AI API key (e.g., for Gemini) used by the RPG.
        * `OPENAI_API_KEY`: Your OpenAI API key used for analytics insights.
        * `RESEND_API_KEY`: Your Resend API key for sending email reports.
        * `IPINFO_API_KEY`: Your ipinfo.io API key (optional, for GeoIP enrichment in analytics).
        * `WEEKLY_REPORT_FROM_EMAIL`: The "From" email address for the weekly analytics report (e.g., `Analyst <analyst@yourverifieddomain.com>`). **Note:** This domain must be verified with Resend.
        * `WEEKLY_REPORT_TO_EMAIL`: The recipient email address for the weekly analytics report (e.g., `your-main-email@example.com`).

    * **GitHub Secrets:** In your GitHub repository settings (Settings -> Secrets and variables -> Actions), add the following for deploying Supabase functions:
        * `SUPABASE_ACCESS_TOKEN`: Generate this from your Supabase account settings (Access Tokens).
        * `SUPABASE_PROJECT_REF`: Find this in your Supabase project's General Settings (e.g., `your-project-ref`).

4.  **Schedule Weekly Report Function (Analytics):**
    In the Supabase SQL Editor for your project, run the `cron.schedule` command to set up the weekly trigger for the `weekly-report` function. Example:
    ```sql
    -- Example: Run every Monday at 9 AM UTC
    SELECT cron.schedule(
        'weekly-site-report',
        '0 9 * * 1',
        $$
        SELECT net.http_post(
            url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/weekly-report',
            headers:='{"Authorization": "Bearer <YOUR_SUPABASE_SERVICE_ROLE_KEY>"}'::jsonb
        );
        $$
    );
    -- IMPORTANT: Replace <YOUR_PROJECT_REF> with your actual project reference.
    -- IMPORTANT: Replace <YOUR_SUPABASE_SERVICE_ROLE_KEY> with your actual Supabase service_role key (anon key is not sufficient for this).
    -- This key is sensitive; ensure your cron job setup is secure.
    -- Consider alternative secure invocation methods if direct key exposure in cron definition is a concern.
    ```

5.  **Edge Function Configuration Notes:**
    * **CORS:**
        * For `supabase/functions/rpg-ai-engine/index.ts`: The `Access-Control-Allow-Origin` is set to `"https://injoque.dev"` for production. If you deploy the RPG to a different domain or path, update this accordingly.
        * The `supabase/functions/track/index.ts` function uses an `ALLOWED_ORIGINS` set, which should include your production domain(s) for the main portfolio site.

## 🚀 Deployment

* **Edge Functions:** Deployments are handled automatically via the GitHub Actions workflow defined in `.github/workflows/deploy_functions.yml`. Pushing changes to the `main` branch will trigger the workflow, which uses the Supabase CLI to deploy all functions defined in the `supabase/functions/` directory.
* **Static Website (Portfolio & RPG):**
    * The main portfolio is `index.html`.
    * The RPG is `rpg.html`.
    * Deploy these HTML files along with their CSS, JS (from `public/js/`), and assets (from `public/assets/` or other asset paths) to your preferred static hosting provider (e.g., GitHub Pages, Vercel, Netlify).
    * Your current GitHub Actions workflow in `.github/workflows/pages.yml` seems configured to build a Vite app (if `npm run build` produces output in `./docs`) and deploy it to GitHub Pages. Ensure your Vite build process correctly includes `index.html`, `rpg.html`, and all associated static assets in the `docs` output directory.

## 📊 Looker Studio Connection (Data Visualization for Analytics)

1.  **Create a Read-Only User (Recommended):** In your Supabase database, create a dedicated read-only user for Looker Studio to limit permissions.
    ```sql
    -- Example:
    -- CREATE USER looker_readonly_user WITH PASSWORD 'your_strong_password';
    -- GRANT CONNECT ON DATABASE postgres TO looker_readonly_user;
    -- GRANT USAGE ON SCHEMA public TO looker_readonly_user;
    -- GRANT SELECT ON public.events_view TO looker_readonly_user;
    -- GRANT SELECT ON public.events TO looker_readonly_user; -- If also querying the base table
    ```
2.  **Connect Looker Studio:**
    * In Google Looker Studio, add a new data source.
    * Select the **PostgreSQL** connector.
    * Use your Supabase database connection details (host, port, database name, read-only username, and password). These can be found in Supabase Project Settings -> Database.
3.  **Select Data:** Connect to the `public.events_view` for aggregated reporting, or `public.events` for raw data from your analytics system.

## 🔧 Customization

* **Portfolio Content:** Update personal information, projects, and experience in `index.html`.
* **RPG Content & Logic:**
    * Modify the frontend game interface and client-side logic in `rpg.html` and `public/js/rpg.js`.
    * Adjust the AI game master's behavior, prompts, and story generation logic in `supabase/functions/rpg-ai-engine/index.ts`.
* **Styling:** Adjust colors, fonts, and styles via CSS variables in `css/styles.css` (main site) and `css/rpg-styles.css` (RPG).
* **Analytics Tracking:** Modify tracking behavior or add new events in `public/js/main.js` and `public/js/tracker.js`.
* **Reporting Logic:** Enhance analytics aggregation or reporting logic in `supabase/functions/weekly-report/index.ts`.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details (if one exists, otherwise assume MIT as per badge).

## 🙏 Acknowledgements

* Bolt.new Team
* Supabase Team
* Deno Team
