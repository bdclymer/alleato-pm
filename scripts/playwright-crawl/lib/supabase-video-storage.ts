/**
 * Supabase Storage Integration for Video Transcript Data
 *
 * Handles storing video transcripts and metadata in Supabase database.
 * Supports deduplication using transcript hashes.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials. Check .env file for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Database row type for procore_video_transcripts table
 */
export interface ProcoreVideoTranscript {
  id?: string;
  url: string;
  title: string | null;
  wmediaid: string | null;
  wchannelid: string | null;
  transcript_text: string | null;
  transcript_hash: string | null;
  transcript_download_url: string | null;
  transcript_filename: string | null;
  video_asset_urls: string[];
  video_player_urls: string[];
  video_host_domains: string[];
  screenshots: string[];
  metadata: any; // JSON field for additional data
  created_at?: string;
  updated_at?: string;
}

/**
 * Create the procore_video_transcripts table if it doesn't exist
 */
export async function createVideoTranscriptsTable() {
  const { error } = await supabase.rpc('create_video_transcripts_table_if_not_exists');

  if (error) {
    console.error('Error creating table:', error);
    throw error;
  }

  console.log('✓ Video transcripts table ready');
}

/**
 * Insert or update video transcript data
 * Uses transcript_hash for deduplication
 */
export async function upsertVideoTranscript(data: ProcoreVideoTranscript): Promise<string> {
  try {
    // Check if a record with this hash already exists
    if (data.transcript_hash) {
      const { data: existing, error: checkError } = await supabase
        .from('procore_video_transcripts')
        .select('id')
        .eq('transcript_hash', data.transcript_hash)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing transcript:', checkError);
      }

      if (existing) {
        console.log(`  ⏭️  Transcript already exists (hash: ${data.transcript_hash.substring(0, 8)}...)`);

        // Update the existing record
        const { error: updateError } = await supabase
          .from('procore_video_transcripts')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating transcript:', updateError);
          throw updateError;
        }

        console.log(`  ✓ Updated existing record: ${existing.id}`);
        return existing.id;
      }
    }

    // Insert new record
    const { data: inserted, error: insertError } = await supabase
      .from('procore_video_transcripts')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting transcript:', insertError);
      throw insertError;
    }

    console.log(`  ✓ Inserted new record: ${inserted.id}`);
    return inserted.id;

  } catch (error) {
    console.error('Error in upsertVideoTranscript:', error);
    throw error;
  }
}

/**
 * Get video transcript by wmediaid
 */
export async function getVideoTranscriptByMediaId(wmediaid: string): Promise<ProcoreVideoTranscript | null> {
  const { data, error } = await supabase
    .from('procore_video_transcripts')
    .select('*')
    .eq('wmediaid', wmediaid)
    .maybeSingle();

  if (error) {
    console.error('Error fetching video transcript:', error);
    return null;
  }

  return data;
}

/**
 * Get all video transcripts
 */
export async function getAllVideoTranscripts(): Promise<ProcoreVideoTranscript[]> {
  const { data, error } = await supabase
    .from('procore_video_transcripts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching video transcripts:', error);
    return [];
  }

  return data || [];
}

/**
 * Search video transcripts by text content
 */
export async function searchTranscripts(query: string): Promise<ProcoreVideoTranscript[]> {
  const { data, error } = await supabase
    .from('procore_video_transcripts')
    .select('*')
    .textSearch('transcript_text', query)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching transcripts:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete video transcript by ID
 */
export async function deleteVideoTranscript(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('procore_video_transcripts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transcript:', error);
    return false;
  }

  console.log(`  ✓ Deleted transcript: ${id}`);
  return true;
}

/**
 * Get statistics about stored video transcripts
 */
export async function getTranscriptStats(): Promise<{
  total_videos: number;
  videos_with_transcripts: number;
  videos_with_downloads: number;
  unique_hosts: string[];
  total_transcript_chars: number;
}> {
  const { data, error } = await supabase
    .from('procore_video_transcripts')
    .select('transcript_text, transcript_download_url, video_host_domains');

  if (error || !data) {
    return {
      total_videos: 0,
      videos_with_transcripts: 0,
      videos_with_downloads: 0,
      unique_hosts: [],
      total_transcript_chars: 0,
    };
  }

  const hostsSet = new Set<string>();
  data.forEach(row => {
    (row.video_host_domains || []).forEach((host: string) => hostsSet.add(host));
  });

  return {
    total_videos: data.length,
    videos_with_transcripts: data.filter(row => row.transcript_text).length,
    videos_with_downloads: data.filter(row => row.transcript_download_url).length,
    unique_hosts: Array.from(hostsSet),
    total_transcript_chars: data.reduce(
      (sum, row) => sum + (row.transcript_text?.length || 0),
      0
    ),
  };
}
