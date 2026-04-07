import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function forwardToSupabaseAPI(
  request: Request,
  method: string,
  params: { path: string[] },
) {
  if (!process.env.SUPABASE_MANAGEMENT_API_TOKEN) {
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 },
    );
  }

  // Authenticate the request and verify admin role.
  // OWASP A01:2021 - Broken Access Control: Supabase Management API
  // access is restricted to verified admin users only.
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the user has admin privileges before proxying to the Management API
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { message: "Admin access required to use the Supabase Management API proxy." },
      { status: 403 },
    );
  }

  const { path } = params;
  const apiPath = path.join("/");

  const url = new URL(request.url);
  url.protocol = "https";
  url.hostname = "api.supabase.com";
  url.port = "443";
  url.pathname = apiPath;

  try {
    const forwardHeaders: HeadersInit = {
      Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
    };

    // Copy relevant headers from the original request
    const contentType = request.headers.get("content-type");
    if (contentType) {
      forwardHeaders["Content-Type"] = contentType;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: forwardHeaders,
    };

    // Include body for methods that support it
    if (method !== "GET" && method !== "HEAD") {
      try {
        const body = await request.text();
        if (body) {
          fetchOptions.body = body;
        }
      } catch (error) {
        console.error("Failed to read request body:", error);
        // Intentionally swallowed: body reading is optional
      }
    }

    const response = await fetch(url, fetchOptions);

    // Get response body
    const responseText = await response.text();
    let responseData;

    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = responseText;
    }

    // Return the response with the same status
    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return forwardToSupabaseAPI(request, "GET", resolvedParams);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return forwardToSupabaseAPI(request, "HEAD", resolvedParams);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return forwardToSupabaseAPI(request, "POST", resolvedParams);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return forwardToSupabaseAPI(request, "PUT", resolvedParams);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return forwardToSupabaseAPI(request, "DELETE", resolvedParams);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return forwardToSupabaseAPI(request, "PATCH", resolvedParams);
}
