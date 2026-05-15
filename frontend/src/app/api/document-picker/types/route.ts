import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/document-picker/types?for=<entityType>
 *
 * Returns document_type_taxonomy rows where applies_to contains the given
 * entity type. Used by DocumentPicker to show only relevant document types.
 *
 * entityType values: project | subcontract | purchase_order | commitment |
 *   prime_contract | change_order | invoice | submittal | rfi | drawing | company
 *
 * 'commitment' is resolved to both 'subcontract' and 'purchase_order' at the
 * taxonomy level — the taxonomy uses 'commitment' in applies_to so we pass it
 * through directly.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('for');

  if (!entityType) {
    return NextResponse.json(
      { error: 'Missing required query param: for' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_type_taxonomy')
    .select('type_key, display_name, category, sort_order')
    .eq('is_active', true)
    .contains('applies_to', [entityType])
    .order('category')
    .order('sort_order');

  if (error) {
    console.error('[document-picker/types] supabase error:', error);
    return NextResponse.json(
      { error: 'Failed to load document types' },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
