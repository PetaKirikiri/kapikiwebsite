import axios from "axios";

// This would come from your environment variables
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const SERP_API_KEY = process.env.REACT_APP_SERP_API_KEY; // For Google search results

// Function to get search results using SERP API
async function searchWebsites(query) {
  try {
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        api_key: SERP_API_KEY,
        q: query,
        engine: "google",
      },
    });

    // Extract organic results
    const searchResults = response.data.organic_results.map((result) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
    }));

    return searchResults;
  } catch (error) {
    console.error("Error searching websites:", error);
    throw error;
  }
}

// Function to analyze URLs with GPT
async function analyzeUrlsWithGPT(urls) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that analyzes website URLs and determines if they are likely to be relevant business/organization websites. Filter out social media, news articles, and other non-relevant pages.",
          },
          {
            role: "user",
            content: `Please analyze these URLs and return only the ones that are likely to be organization websites: ${JSON.stringify(
              urls
            )}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error analyzing URLs with GPT:", error);
    throw error;
  }
}

// Function to scrape website content
async function scrapeWebsite(url) {
  try {
    // We'll need a backend proxy to avoid CORS issues
    const response = await axios.get(
      `/api/scrape?url=${encodeURIComponent(url)}`
    );
    const html = response.data;

    // Use GPT to extract information from the HTML
    const extractedInfo = await extractInformationWithGPT(html, url);
    return extractedInfo;
  } catch (error) {
    console.error(`Error scraping website ${url}:`, error);
    return null;
  }
}

// Function to extract information using GPT
async function extractInformationWithGPT(html, url) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that extracts organization information from website HTML. Look for contact information, about pages, and organization details.",
          },
          {
            role: "user",
            content: `Please extract the following information from this website (${url}):
          - Organization Name
          - Contact Name (if available)
          - Email Address
          - Any other relevant contact information

          HTML Content:
          ${html.substring(0, 15000)} // Limit content length for GPT
          `,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error extracting information with GPT:", error);
    throw error;
  }
}

// Main function to orchestrate the scraping process
export async function findOrganizations(searchQuery) {
  try {
    // Step 1: Get search results
    const searchResults = await searchWebsites(searchQuery);

    // Step 2: Filter relevant URLs with GPT
    const relevantUrls = await analyzeUrlsWithGPT(
      searchResults.map((r) => r.url)
    );

    // Step 3: Scrape each relevant website
    const organizations = [];
    for (const url of relevantUrls) {
      const info = await scrapeWebsite(url);
      if (info) {
        organizations.push({
          ...info,
          sourceUrl: url,
        });
      }
    }

    return organizations;
  } catch (error) {
    console.error("Error in findOrganizations:", error);
    throw error;
  }
}
