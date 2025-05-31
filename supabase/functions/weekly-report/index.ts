console.log("DEBUG: weekly-report function starting...");

import { createClient } from "supabase";
import { serve } from "std/http/server.ts";

console.log("DEBUG: Imports successful using import map.");

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const IPINFO_API_KEY = Deno.env.get('IPINFO_API_KEY');
const WEEKLY_REPORT_FROM_EMAIL = Deno.env.get('WEEKLY_REPORT_FROM_EMAIL');
const WEEKLY_REPORT_TO_EMAIL = Deno.env.get('WEEKLY_REPORT_TO_EMAIL');

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY || !RESEND_API_KEY || !WEEKLY_REPORT_FROM_EMAIL || !WEEKLY_REPORT_TO_EMAIL) {
    console.error("FATAL ERROR: Missing required ENV vars (Supabase URL/Key, OpenAI Key, Resend Key, Report Emails)!");
    throw new Error('Missing required environment variables, including report email addresses');
}
console.log("DEBUG: ENV vars loaded.");

// --- Init Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("DEBUG: Supabase client initialized.");

// --- Main Server Logic ---
serve(async (req: Request) => {
    console.log(`DEBUG: Received invocation: ${req.method}`);

    try {
        // 1. Calculate Date Range (Last 7 Days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        const startTime = startDate.toISOString();
        const endTime = endDate.toISOString();
        console.log(`DEBUG: Fetching data between ${startTime} and ${endTime}`);

        // 2. Fetch Events
        const { data: events, error: fetchError } = await supabase
            .from('events')
            .select(`
                created_at, event_type, payload, ip, session_id, referrer,
                utm_source, utm_medium, utm_campaign, user_agent,
                browser_language, browser_timezone, screen_width, screen_height, pathname
            `)
            .gte('created_at', startTime)
            .lt('created_at', endTime);

        if (fetchError) throw fetchError;

        if (!events || events.length === 0) {
            console.log("DEBUG: No events found for the last week.");
            return new Response(JSON.stringify({ message: "No events to report" }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });
        }
        console.log(`DEBUG: Fetched ${events.length} events.`);

        // 3. GeoIP enrichment
        const geoDataCache = new Map<string, { country: string, region: string, city: string } | null>();
        let topCountries: [string, number][] = [];

        if (IPINFO_API_KEY) {
            const uniqueOriginalIpStrings = [...new Set(events.map((e) => e.ip).filter((ip) => typeof ip === 'string' && ip !== "unknown"))]; // Filter for strings explicitly

            console.log(`DEBUG: Found ${uniqueOriginalIpStrings.length} unique IP strings for GeoIP lookup.`);

            for (const originalIpString of uniqueOriginalIpStrings) {
                let firstIp = '';
                if (typeof originalIpString === 'string') {
                    firstIp = originalIpString.includes(',')
                        ? originalIpString.split(',')[0].trim()
                        : originalIpString.trim();
                }

                // Skip if the extracted first IP is empty or invalid
                if (!firstIp || firstIp === 'unknown') {
                    console.log(`DEBUG: Skipping invalid first IP derived from: ${originalIpString}`);
                    continue;
                }

                // Check cache using the FIRST IP
                if (!geoDataCache.has(firstIp)) {
                    console.log(`DEBUG: Looking up GeoIP for first IP: ${firstIp} (from string: ${originalIpString})`);
                    try {
                        // Use the FIRST IP in the fetch URL
                        const res = await fetch(`https://ipinfo.io/${firstIp}?token=${IPINFO_API_KEY}`);
                        if (res.ok) {
                            const info = await res.json();
                            // Store result in cache using the FIRST IP as key
                            geoDataCache.set(firstIp, {
                                country: info.country,
                                region: info.region,
                                city: info.city
                            });
                        } else {
                            console.warn(`WARN: GeoIP lookup failed for ${firstIp} (from ${originalIpString}): ${res.status} ${res.statusText}`);
                            geoDataCache.set(firstIp, null); // Cache failure
                        }
                    } catch (err) {
                        console.error(`ERROR: GeoIP lookup exception for ${firstIp} (from ${originalIpString}):`, err);
                        geoDataCache.set(firstIp, null); // Cache exception
                    }
                    // Rate-limit delay
                    await new Promise((r) => setTimeout(r, 100));
                }
            }
            console.log("DEBUG: GeoIP lookups complete.");

             // --- Aggregate Top Countries from Cache (INSIDE the 'if' block) ---
             const countryCounts = events.reduce((acc, e) => {
                 const currentOriginalIp = typeof e.ip === 'string' ? e.ip : '';
                 const currentFirstIp = currentOriginalIp.includes(',')
                     ? currentOriginalIp.split(',')[0].trim()
                     : currentOriginalIp.trim();
                 const geo = (currentFirstIp && currentFirstIp !== 'unknown') ? (geoDataCache.get(currentFirstIp) || null) : null;

                 if (geo?.country && typeof geo.country === 'string') { // Check if country is a string
                    acc[geo.country] = (acc[geo.country] || 0) + 1;
                 }
                 return acc;
             }, {} as { [key: string]: number }); // Add type hint to accumulator

             topCountries = Object.entries(countryCounts)
                 .sort(([, a], [, b]) => Number(b) - Number(a))
                 .slice(0, 5);
             // --- End Aggregation ---

        } else {
            console.log("DEBUG: Skipping GeoIP lookup (no IPINFO_API_KEY set).");
        }

        // 4. Aggregate Data & Create Summary for AI
        const totalEvents = events.length;
        const uniqueSessions = new Set(events.map(e => e.session_id)).size;
        const uniqueVisitors = new Set(events.map(e => e.ip)).size; // Approx
        const pageViews = events.filter(e => e.event_type === 'page_view').length;

        // Sort events by time for first-page-view logic
        events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const seenSessions = new Set();
        const firstPageViews = events.filter((e) => {
            if (e.event_type !== 'page_view' || seenSessions.has(e.session_id)) return false;
            seenSessions.add(e.session_id);
            return true;
        });

        // Top Referrers
        const referrerCounts = firstPageViews.reduce((acc, e) => {
            if (e.referrer && !e.referrer.includes("injoque.dev")) { // Exclude self-referrals
                 // Basic domain extraction (can be improved)
                 try {
                     const url = new URL(e.referrer);
                     const domain = url.hostname.replace(/^www\./, '');
                     acc[domain] = (acc[domain] || 0) + 1;
                 } catch (_) {
                     // Ignore invalid URLs or direct traffic listed as referrer
                     acc[e.referrer] = (acc[e.referrer] || 0) + 1; // Fallback to full referrer if URL parsing fails
                 }
            } else if (!e.referrer) {
                 acc['Direct/Unknown'] = (acc['Direct/Unknown'] || 0) + 1;
            }
            return acc;
        }, {});
        const topReferrers = Object.entries(referrerCounts).sort(([, a], [, b]) => Number(b) - Number(a)).slice(0, 5);

        // Top Pages (Pathnames)
        const pathCounts = events.filter(e => e.event_type === 'page_view' && e.pathname).reduce((acc, e) => {
            acc[e.pathname] = (acc[e.pathname] || 0) + 1;
            return acc;
        }, {});
        const topPaths = Object.entries(pathCounts).sort(([, a], [, b]) => Number(b) - Number(a)).slice(0, 5);

        // Top UTM Sources (from first page view)
         const utmSourceCounts = firstPageViews.filter(e => e.utm_source).reduce((acc, e) => {
             acc[e.utm_source] = (acc[e.utm_source] || 0) + 1;
             return acc;
         }, {});
         const topUtmSources = Object.entries(utmSourceCounts).sort(([, a], [, b]) => Number(b) - Number(a)).slice(0, 3);

        // Screen Width Groups
        const screenWidthGroups = events.filter(e => e.screen_width).reduce((acc, e) => {
             let group = "Unknown";
             if (e.screen_width < 768) group = "Mobile";
             else if (e.screen_width < 1200) group = "Tablet";
             else group = "Desktop";
             acc[group] = (acc[group] || 0) + 1;
             return acc;
         }, {});
         const screenDistribution = Object.entries(screenWidthGroups).sort(([, a], [, b]) => Number(b) - Number(a));


        // --- Format summary text for OpenAI ---
        let dataSummary = `Website Analytics Summary (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}):\n`;
        dataSummary += `- Total Events: ${totalEvents}\n`;
        dataSummary += `- Sessions (Approx): ${uniqueSessions}\n`;
        dataSummary += `- Visitors (IP Approx): ${uniqueVisitors}\n`;
        dataSummary += `- Page Views: ${pageViews}\n`;
        dataSummary += `- Top Pathnames: ${topPaths.map(([p, c]) => `${p} (${c})`).join(", ") || 'N/A'}\n`;
        dataSummary += `- Top Referrers: ${topReferrers.map(([r, c]) => `${r} (${c})`).join(", ") || 'None'}\n`;
        dataSummary += `- Top UTM Sources: ${topUtmSources.map(([s, c]) => `${s} (${c})`).join(", ") || 'None'}\n`;
        if (topCountries.length) {
            dataSummary += `- Top Countries: ${topCountries.map(([c, n]) => `${c} (${n})`).join(", ")}\n`;
        }
        dataSummary += `- Device Types (Screen Width): ${screenDistribution.map(([g, c]) => `${g} (${c})`).join(", ") || 'N/A'}\n`;
        console.log("DEBUG: Generated Data Summary:\n", dataSummary);


        // 5. OpenAI Analysis
        console.log("DEBUG: Calling OpenAI API...");
        let aiInsights = "AI analysis could not be generated.";
        try {
            const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: "You are a concise web analytics assistant summarizing weekly data for a personal portfolio website (injoque.dev)." },
                        { role: "user", content: `Analyze the following website analytics summary for the week ending ${endDate.toLocaleDateString()}. Identify the top 1-2 traffic sources (referrers/UTMs), the most engaging content (pages), and 1-2 other key observations (e.g., user demographics, notable changes if identifiable, potential issues). Be brief and use bullet points:\n\n${dataSummary}` }
                    ],
                    max_tokens: 200,
                    temperature: 0.6,
                }),
            });
             if (!openAIResponse.ok) {
                 const errText = await openAIResponse.text();
                 throw new Error(`OpenAI API Error: ${openAIResponse.status} ${errText}`);
             }
             const result = await openAIResponse.json();
             aiInsights = result.choices?.[0]?.message?.content?.trim() ?? aiInsights;
             console.log("DEBUG: OpenAI Insights received:", aiInsights);
        } catch (err) {
             console.error("ERROR: OpenAI API call failed:", err);
        }

        // 6. Send Email via Resend
        console.log("DEBUG: Sending email report via Resend...");
        const emailSubject = `Weekly Website Analytics Report - ${endDate.toLocaleDateString()}`;
        const emailHtmlBody = `
            <h1>Website Analytics Summary</h1>
            <p><strong>Period:</strong> ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
            <h2>AI Insights:</h2>
            <p>${aiInsights.replace(/\n/g, "<br>")}</p>
            <hr />
            <h2>Key Metrics:</h2>
            <ul>
                <li>Total Events: ${totalEvents}</li>
                <li>Unique Sessions: ${uniqueSessions}</li>
                <li>Unique Visitors (IPs): ${uniqueVisitors}</li>
                <li>Page Views: ${pageViews}</li>
                <li>Top Pathnames: ${topPaths.map(([p, c]) => `${p} (${c})`).join(", ") || 'N/A'}</li>
                <li>Top Referrers: ${topReferrers.map(([r, c]) => `${r} (${c})`).join(", ") || 'None'}</li>
                <li>Top UTM Sources: ${topUtmSources.map(([s, c]) => `${s} (${c})`).join(", ") || 'None'}</li>
                ${topCountries.length ? `<li>Top Countries: ${topCountries.map(([c, n]) => `${c} (${n})`).join(", ")}</li>` : ''}
                <li>Device Types (Screen Width): ${screenDistribution.map(([g, c]) => `${g} (${c})`).join(", ") || 'N/A'}</li>
            </ul>
            <hr />
            <p><em>This is an automated report.</em></p>
        `;

        const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: WEEKLY_REPORT_FROM_EMAIL,
                to: [WEEKLY_REPORT_TO_EMAIL],
                subject: emailSubject,
                html: emailHtmlBody,
            }),
        });

        if (!resendResponse.ok) {
            const errText = await resendResponse.text();
            throw new Error(`Resend API Error: ${resendResponse.status} ${errText}`);
        }
        console.log("DEBUG: Email sent successfully via Resend.");

        // 7. Return success
        return new Response(JSON.stringify({ success: true, message: "Weekly report generated and sent." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("ERROR: An error occurred in the weekly report function:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});

console.log("DEBUG: Weekly report function setup complete.");
