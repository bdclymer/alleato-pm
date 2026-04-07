import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiErrorResponse } from "@/lib/api-error";

/**
 * Lists all people from the global people table.
 * This endpoint returns people regardless of project membership,
 * useful for assigning people to project teams.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') as 'user' | 'contact' | 'all' | undefined;
    const status = searchParams.get('status') as 'active' | 'inactive' | 'all' | undefined;
    const perPage = parseInt(searchParams.get('per_page') || '200', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Base query with company join
    let query = supabase
      .from('people')
      .select(`
        id,
        first_name,
        last_name,
        email,
        job_title,
        phone_mobile,
        phone_business,
        person_type,
        status,
        company:companies(id, name)
      `, { count: 'exact' });

    // Apply type filter
    if (type && type !== 'all') {
      query = query.eq('person_type', type);
    }

    // Apply status filter (default to active)
    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else if (!status) {
      // Default to active
      query = query.eq('status', 'active');
    }

    // Apply search across name and email
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order('last_name').order('first_name');

    // Apply pagination
    const offset = (page - 1) * perPage;
    query = query.range(offset, offset + perPage - 1);

    const { data, error, count } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({
      data: data || [],
      meta: {
        total: count || 0,
        page,
        perPage,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * Creates a new person in the people table.
 * Required fields: first_name, last_name, person_type
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    // Validate required fields
    if (!body.first_name || !body.last_name || !body.person_type) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, person_type' },
        { status: 400 }
      );
    }

    // Validate person_type
    const validTypes = ['user', 'contact'];
    if (!validTypes.includes(body.person_type)) {
      return NextResponse.json(
        { error: `Invalid person_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('people')
      .insert({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email || undefined,
        job_title: body.job_title || undefined,
        phone_mobile: body.phone_mobile || undefined,
        phone_business: body.phone_business || undefined,
        person_type: body.person_type,
        company_id: body.company_id || undefined,
        address_line1: body.address_line1 || undefined,
        address_line2: body.address_line2 || undefined,
        city: body.city || undefined,
        state: body.state || undefined,
        zip: body.zip || undefined,
        country: body.country || undefined,
        status: body.status || 'active',
      })
      .select(`
        id,
        first_name,
        last_name,
        email,
        job_title,
        phone_mobile,
        phone_business,
        person_type,
        status,
        company:companies(id, name)
      `)
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
