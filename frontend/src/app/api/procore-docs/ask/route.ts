/**
 * PROCORE DOCS RAG API - ENHANCED VERSION
 *
 * Implements OpenAI's RAG best practices:
 * - Query expansion for better recall
 * - Intelligent reasoning when no exact match
 * - Clarifying questions instead of "not found"
 * - Context-aware responses with citations
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

const openai = getOpenAIClient();

interface SearchResult {
  id: number;
  url: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  source_id?: string;
}

interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  query: string;
  expandedQueries?: string[];
  reasoning?: string;
}

/**
 * Expand query to find more relevant results
 * Generates paraphrases and related terms
 */
async function expandQuery(originalQuery: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a query expansion assistant for Procore construction software documentation.
Generate 2-3 alternative phrasings of the user's question that might match different wordings in the docs.
Include:
- Paraphrases using different terminology
- Technical terms that might appear in documentation
- Related concepts

Return a JSON array of strings: ["query1", "query2", "query3"]`,
        },
        {
          role: "user",
          content: originalQuery,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{"queries":[]}';
    const parsed = JSON.parse(content);
    const expanded = parsed.queries || parsed.items || [];

    // Always include original query first
    return [originalQuery, ...expanded].slice(0, 4);
  } catch (error) {
    // Fallback to original query if expansion fails
    return [originalQuery];
  }
}

/**
 * Search with multiple query variants and aggregate results
 */
async function searchWithExpansion(
  queries: string[],
  topK: number,
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search
    const { data: searchResults, error } = await supabase.rpc(
      "match_crawled_pages",
      {
        query_embedding: queryEmbedding,
        match_count: topK,
      },
    );

    if (!error && searchResults) {
      for (const result of searchResults) {
        // Deduplicate by URL
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
        }
      }
    }
  }

  // Sort by similarity score and take top results
  return allResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK * 2); // Get more results for better context
}

/**
 * Enhanced system prompt that encourages helpful behavior
 */
const SYSTEM_PROMPT = `You are an expert Procore construction software assistant with deep knowledge of project management, budgeting, scheduling, and construction workflows.

Your goal is to be GENUINELY HELPFUL, not just a search engine. Follow these principles:

## When you have relevant documentation:
- Provide clear, actionable answers
- Cite specific sources with [Source N] notation
- Include step-by-step instructions when relevant
- Explain WHY things work the way they do, not just HOW

## When documentation is incomplete or unclear:
- DO NOT just say "I don't have information on that"
- Instead, use reasoning to:
  1. Suggest related features or concepts you DO have docs for
  2. Ask clarifying questions to understand what they're really trying to accomplish
  3. Explain what Procore CAN do that might solve their underlying need
  4. Provide best practices based on similar scenarios

## Examples of GOOD responses when docs are limited:
- "I don't have specific documentation on X, but based on similar workflows, you might want to look into Y feature. Can you tell me more about what you're trying to accomplish?"
- "While I don't see direct documentation on that specific workflow, Procore's Z feature handles similar scenarios. Here's how it works..."
- "That's not directly covered in the docs I have, but typically in construction project management, you'd approach this by..."

## Examples of BAD responses:
- "I couldn't find any relevant information" (too dismissive)
- "The documentation doesn't cover that" (unhelpful)
- Just listing unrelated docs (not thoughtful)

Remember: You're an intelligent assistant with construction expertise, not just a document retriever.`;

/**
 * POST /api/procore-docs/ask
 *
 * Query the Procore documentation using enhanced RAG
 */
export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createAuthClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { query, topK = 5, conversationHistory = [] } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 },
      );
    }

    // Step 1: Expand the query to find more relevant results
    const expandedQueries = await expandQuery(query);
    // Step 2: Search with all query variants
    const searchResults = await searchWithExpansion(expandedQueries, topK);
    // Step 3: Build context - even if results are limited
    const hasStrongMatch =
      searchResults.length > 0 && searchResults[0].similarity > 0.7;
    const hasWeakMatch =
      searchResults.length > 0 && searchResults[0].similarity > 0.5;

    let context = "";
    let availableTopics: string[] = [];

    if (searchResults.length > 0) {
      context = searchResults
        .slice(0, 10) // Use more context for better reasoning
        .map((result: SearchResult, idx: number) => {
          return `[Source ${idx + 1}] (Relevance: ${(result.similarity * 100).toFixed(1)}%)\nURL: ${result.url}\nContent: ${result.content}`;
        })
        .join("\n\n---\n\n");

      // Extract topics from results
      availableTopics = [
        ...new Set(
          searchResults
            .map((r) => {
              const url = r.url || "";
              // Extract topic from URL like /budget/ or /commitments/
              const match = url.match(
                /\/(budget|commitments|change-orders|invoicing|estimating|drawings|materials|meetings|photos|contracts|equipment|directory|documents)/i,
              );
              return match ? match[1].replace(/-/g, " ") : null;
            })
            .filter(Boolean) as string[],
        ),
      ];
    }

    // Step 4: Build conversation messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-6)) {
        // Keep last 6 messages for context
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add current query with context
    let userMessage = `Question: ${query}`;

    if (searchResults.length > 0) {
      userMessage += `\n\n### Retrieved Documentation\n${context}`;

      if (!hasStrongMatch) {
        userMessage += `\n\n### Note
The search didn't find perfect matches. The results above are the most similar content available.
Available topics in the knowledge base include: ${availableTopics.join(", ")}.
Please use your reasoning to provide a helpful response even if the docs don't directly answer the question.`;
      }
    } else {
      userMessage += `\n\n### Note
No documentation was found matching this query. However, the knowledge base contains information about:
- Procore budget management and cost tracking
- Client contracts and commitments
- Change orders and change events
- Invoicing and billing
- Project management tools (drawings, emails, materials, meetings, photos, documents)
- Project directory and equipment
- Procore API documentation

Please use your expertise to:
1. Ask clarifying questions to understand what they're trying to accomplish
2. Suggest related Procore features that might help
3. Provide general best practices if applicable`;
    }

    messages.push({
      role: "user",
      content: userMessage,
    });

    // Step 5: Generate intelligent response
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.5, // Higher temp for more creative problem-solving
      max_tokens: 1500, // More tokens for detailed explanations
    });

    const answer =
      completionResponse.choices[0].message.content ||
      "I apologize, but I encountered an error generating a response.";

    // Step 6: Return enhanced response
    const response: RAGResponse = {
      answer,
      sources: searchResults.slice(0, 5).map((result: SearchResult) => ({
        id: result.id,
        url: result.url,
        content: result.content.substring(0, 300) + "...", // Show more context
        similarity: result.similarity,
        source_id: result.source_id,
      })),
      query,
      expandedQueries: expandedQueries.slice(1), // Don't include original query
      reasoning: hasStrongMatch
        ? "Found strong matches in documentation"
        : hasWeakMatch
          ? `Partial matches found. Available topics: ${availableTopics.join(", ")}`
          : `No direct matches. Providing guidance based on available knowledge about: ${availableTopics.slice(0, 5).join(", ")}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred while processing your request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
