// supabase/functions/weekly-report/index.ts

import { createClient } from "supabase";
import { serve } from "std/http/server.ts";

console.log("DEBUG: Imports successful using import map."); 

// Get secrets
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")
const SUPABASE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const OPENAI_API_KEY     = Deno.env.get("OPENAI_API_KEY")
const RESEND_API_KEY     = Deno.env.get("RESEND_API_KEY")
const IPINFO_API_KEY     = Deno.env.get("IPINFO_API_KEY")      // Optional, for ipinfo.io

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY || !RESEND_API_KEY) {
  console.error("FATAL ERROR: Missing required ENV vars!")
  throw new Error("Missing required environment variables")
}

// Init Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
console.log("DEBUG: Supabase client initialized.")

// --- Main function logic ---
serve(async (req: Request) => {
  console.log(`DEBUG: Received invocation: ${req.method}`)

  try {
    // 1. Calculate date range for the last week
    const endDate   = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 7)

    const startTime = startDate.toISOString()
    const endTime   = endDate.toISOString()
    console.log(`DEBUG: Fetching data between ${startTime} and ${endTime}`)

    // 2. Fetch events from the last week
    const { data: events, error: fetchError } = await supabase
      .from("events")
      .select(`
        created_at, event_type, payload, ip, session_id, referrer,
        utm_source, utm_medium, utm_campaign, user_agent,
        browser_language, browser_timezone, screen_width, screen_height
      `)
      .gte("created_at", startTime)
      .lt("created_at", endTime)

    if (fetchError) throw fetchError
    if (!events || events.length === 0) {
      console.log("DEBUG: No events found for the last week.")
      return new Response(
        JSON.stringify({ message: "No events to report" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    console.log(`DEBUG: Fetched ${events.length} events.`)

    // 3. (Optional) GeoIP enrichment
    const geoDataCache = new Map<string, null | { country: string; region: string; city: string }>()
    const uniqueIPs = [
      ...new Set(
        events
          .map((e) => e.ip)
          .filter((ip): ip is string => !!ip && ip !== "unknown")
      ),
    ]
    console.log(`DEBUG: Found ${uniqueIPs.length} unique IPs for GeoIP lookup.`)

    for (const ip of uniqueIPs) {
      if (!geoDataCache.has(ip)) {
        try {
          const res = await fetch(`https://ipinfo.io/${ip}?token=${IPINFO_API_KEY}`)
          if (res.ok) {
            const info = await res.json()
            geoDataCache.set(ip, {
              country: info.country,
              region: info.region,
              city: info.city,
            })
          } else {
            console.warn(`WARN: GeoIP lookup failed for ${ip}: ${res.statusText}`)
            geoDataCache.set(ip, null)
          }
        } catch (err) {
          console.error(`ERROR: GeoIP lookup exception for ${ip}:`, err)
          geoDataCache.set(ip, null)
        }
        // Rate-limit delay
        await new Promise((r) => setTimeout(r, 100))
      }
    }
    console.log("DEBUG: GeoIP lookups complete.")

    const eventsWithGeo = events.map((evt) => ({
      ...evt,
      geo: geoDataCache.get(evt.ip) || null,
    }))

    // 4. Aggregate & summarize data
    const totalEvents    = events.length
    const uniqueSessions = new Set(events.map((e) => e.session_id)).size
    const uniqueVisitors = new Set(events.map((e) => e.ip)).size
    const pageViews      = events.filter((e) => e.event_type === "page_view").length

    // Top 5 referrers (first page view per session)
    const seenSessions = new Set<string>()
    const firstPageViews = events
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .filter((e) => {
        if (e.event_type !== "page_view" || seenSessions.has(e.session_id)) return false
        seenSessions.add(e.session_id)
        return true
      })
    const referrerCounts = firstPageViews.reduce<Record<string, number>>((acc, e) => {
      if (e.referrer && !e.referrer.includes("injoque.dev")) {
        acc[e.referrer] = (acc[e.referrer] || 0) + 1
      }
      return acc
    }, {})
    const topReferrers = Object.entries(referrerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Top 5 countries
    const countryCounts = eventsWithGeo.reduce<Record<string, number>>((acc, e) => {
      if (e.geo?.country) acc[e.geo.country] = (acc[e.geo.country] || 0) + 1
      return acc
    }, {})
    const topCountries = Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Build summary text
    let dataSummary = `Website Analytics Summary (Last 7 Days)\n`
    dataSummary += `- Total Events: ${totalEvents}\n`
    dataSummary += `- Unique Sessions: ${uniqueSessions}\n`
    dataSummary += `- Unique Visitors: ${uniqueVisitors}\n`
    dataSummary += `- Page Views: ${pageViews}\n`
    dataSummary += `- Top Referrers: ${
      topReferrers.map(([r, c]) => `${r} (${c})`).join(", ") || "None"
    }\n`
    if (topCountries.length) {
      dataSummary += `- Top Countries: ${
        topCountries.map(([c, n]) => `${c} (${n})`).join(", ")
      }\n`
    }
    console.log("DEBUG: Generated Data Summary:\n", dataSummary)

    // 5. OpenAI analysis
    console.log("DEBUG: Calling OpenAI API...")
    let aiInsights = "AI analysis could not be generated."
    try {
      const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are an analyst summarizing website traffic data." },
            {
              role: "user",
              content: `Analyze the following website analytics data for the past week (from ${startDate.toDateString()} to ${endDate.toDateString()}):\n\n${dataSummary}\nProvide 2–3 key insights, trends, or anomalies.`,
            },
          ],
          max_tokens: 150,
          temperature: 0.5,
        }),
      })

      if (!openAIResponse.ok) {
        const errText = await openAIResponse.text()
        throw new Error(`OpenAI API Error: ${openAIResponse.status} ${errText}`)
      }

      const result = await openAIResponse.json()
      aiInsights = result.choices?.[0]?.message?.content.trim() ?? aiInsights
      console.log("DEBUG: OpenAI Insights received:", aiInsights)
    } catch (err) {
      console.error("ERROR: OpenAI API call failed:", err)
    }

    // 6. Send email via Resend
    console.log("DEBUG: Sending email report via Resend...")
    const emailSubject = `Weekly Website Analytics Report – ${endDate.toDateString()}`
    const emailHtmlBody = `
      <h1>Website Analytics Summary</h1>
      <p><strong>Period:</strong> ${startDate.toDateString()} – ${endDate.toDateString()}</p>
      <h2>AI Insights</h2>
      <p>${aiInsights.replace(/\n/g, "<br>")}</p>
      <hr />
      <h2>Key Metrics</h2>
      <ul>
        <li>Total Events: ${totalEvents}</li>
        <li>Unique Sessions: ${uniqueSessions}</li>
        <li>Unique Visitors: ${uniqueVisitors}</li>
        <li>Page Views: ${pageViews}</li>
        <li>Top Referrers: ${topReferrers.map(([r, c]) => `${r} (${c})`).join(", ") || "None"}</li>
        ${
          topCountries.length
            ? `<li>Top Countries: ${topCountries.map(([c, n]) => `${c} (${n})`).join(", ")}</li>`
            : ""
        }
      </ul>
      <hr />
      <p><em>This is an automated report.</em></p>
    `

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Analytics Reporter <reporter@injoque.dev>",  // TODO: verify domain
        to: ["github@injoque.dev"],                      // TODO: update recipient(s)
        subject: emailSubject,
        html: emailHtmlBody,
      }),
    })

    if (!resendResponse.ok) {
      const errText = await resendResponse.text()
      throw new Error(`Resend API Error: ${resendResponse.status} ${errText}`)
    }
    console.log("DEBUG: Email sent successfully via Resend.")

    // 7. Return success
    return new Response(
      JSON.stringify({ success: true, message: "Weekly report generated and sent." }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("ERROR: An error occurred in the weekly report function:", error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})

console.log("DEBUG: Weekly report function setup complete.")
