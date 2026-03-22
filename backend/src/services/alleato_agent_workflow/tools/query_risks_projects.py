#!/usr/bin/env python3
"""
Query risks, opportunities, and tasks for specific projects from Supabase.
Uses the unified 'insights' table (type column: decision, risk, opportunity).
"""
import os
from supabase import create_client, Client

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

def query_project_intelligence(project_id: int):
    """Query all risks, opportunities, and tasks for a specific project"""

    print(f"\n{'='*80}")
    print(f"PROJECT INTELLIGENCE FOR PROJECT ID: {project_id}")
    print(f"{'='*80}\n")

    # Get project info
    project = supabase.table('projects').select('*').eq('id', project_id).execute()
    if project.data:
        print(f"Project: {project.data[0]['name']}")
        print(f"{'='*80}\n")

    # Query risks from the unified insights table
    print("RISKS:")
    print("-" * 80)
    risks = supabase.table('insights').select('''
        id,
        description,
        details,
        status,
        owner_name,
        metadata_id,
        project_id,
        project_ids,
        document_metadata(title)
    ''').eq('type', 'risk').eq('project_id', project_id).execute()

    if risks.data:
        for risk in risks.data:
            details = risk.get('details', {}) or {}
            print(f"  {risk['description']}")
            print(f"  Category: {details.get('category', 'N/A')} | Likelihood: {details.get('likelihood', 'N/A')} | Impact: {details.get('impact', 'N/A')}")
            print(f"  Status: {risk['status']}")
            if risk.get('document_metadata'):
                print(f"  Meeting: {risk['document_metadata']['title']}")
            print(f"  Metadata ID: {risk['metadata_id']}")
            print()
    else:
        print("No risks found for this project.\n")

    # Query opportunities from the unified insights table
    print("\nOPPORTUNITIES:")
    print("-" * 80)
    opportunities = supabase.table('insights').select('''
        id,
        description,
        details,
        status,
        owner_name,
        metadata_id,
        project_id,
        project_ids,
        document_metadata(title)
    ''').eq('type', 'opportunity').eq('project_id', project_id).execute()

    if opportunities.data:
        for opp in opportunities.data:
            details = opp.get('details', {}) or {}
            print(f"  {opp['description']}")
            print(f"  Type: {details.get('opportunity_type', 'N/A')} | Status: {opp['status']}")
            if opp.get('document_metadata'):
                print(f"  Meeting: {opp['document_metadata']['title']}")
            print(f"  Metadata ID: {opp['metadata_id']}")
            print()
    else:
        print("No opportunities found for this project.\n")

    # Query tasks (tasks table is unchanged)
    print("\nTASKS:")
    print("-" * 80)
    tasks = supabase.table('tasks').select('''
        id,
        description,
        assignee_name,
        due_date,
        priority,
        status,
        metadata_id,
        segment_id,
        project_ids,
        document_metadata(title)
    ''').filter('project_ids', 'cs', f'{{{project_id}}}').execute()

    if tasks.data:
        for task in tasks.data:
            print(f"  {task['description']}")
            print(f"  Assignee: {task.get('assignee_name', 'Unassigned')} | Due: {task.get('due_date', 'N/A')} | Priority: {task.get('priority', 'N/A')}")
            print(f"  Status: {task['status']}")
            if task.get('document_metadata'):
                print(f"  Meeting: {task['document_metadata']['title']}")
            print(f"  Segment ID: {task.get('segment_id', 'None')} | Metadata ID: {task['metadata_id']}")
            print()
    else:
        print("No tasks found for this project.\n")


def show_data_relationships():
    """Show how data is connected via foreign keys"""
    print(f"\n{'='*80}")
    print("DATA RELATIONSHIP EXPLANATION")
    print(f"{'='*80}\n")

    print("The data hierarchy is:")
    print("  document_metadata (meetings)")
    print("    -> has foreign key")
    print("  meeting_segments (semantic sections within meetings)")
    print("    -> has foreign keys")
    print("  document_chunks (chunks with embeddings)")
    print("  insights (decisions, risks, opportunities - unified table)")
    print("  tasks (extracted action items)")
    print("\n")

    print("QUERY PATTERN:")
    print("  Insights have 'metadata_id' (link to meeting) and 'project_id'")
    print("  The 'type' column distinguishes: decision, risk, opportunity")
    print("  The 'details' jsonb column holds type-specific fields:")
    print("    decision: { rationale, impact, effective_date }")
    print("    risk:     { category, likelihood, impact, mitigation_plan }")
    print("    opportunity: { opportunity_type, next_step }")
    print("\n")


def list_all_projects_with_counts():
    """List all projects and count their associated risks/opportunities/tasks"""
    print(f"\n{'='*80}")
    print("ALL PROJECTS WITH INTELLIGENCE COUNTS")
    print(f"{'='*80}\n")

    projects = supabase.table('projects').select('id, name').order('name').execute()

    for project in projects.data:
        project_id = project['id']
        name = project['name']

        # Count risks from insights table
        risks_count = supabase.table('insights').select('id', count='exact').eq('type', 'risk').eq('project_id', project_id).execute()

        # Count opportunities from insights table
        opps_count = supabase.table('insights').select('id', count='exact').eq('type', 'opportunity').eq('project_id', project_id).execute()

        # Count tasks
        tasks_count = supabase.table('tasks').select('id', count='exact').filter('project_ids', 'cs', f'{{{project_id}}}').execute()

        total = (risks_count.count or 0) + (opps_count.count or 0) + (tasks_count.count or 0)

        if total > 0:
            print(f"Project {project_id}: {name}")
            print(f"  -> Risks: {risks_count.count or 0} | Opportunities: {opps_count.count or 0} | Tasks: {tasks_count.count or 0}")
            print()


if __name__ == "__main__":
    # Show data relationships first
    show_data_relationships()

    # List all projects with counts
    list_all_projects_with_counts()

    # Query specific projects (you can change these IDs)
    # Example: Query project 12 (The Roebling Homes)
    query_project_intelligence(12)

    # You can add more projects here
    # query_project_intelligence(70)
    # query_project_intelligence(43)
