"""Tests for the construction PM agent scaffold (server.py)."""
import pytest
from unittest.mock import MagicMock, AsyncMock


class TestProjectContext:
    """Test ProjectContext and related models."""

    def test_create_initial_context(self):
        from src.api.server import create_initial_context, ProjectContext
        ctx = create_initial_context()
        assert isinstance(ctx, ProjectContext)
        assert ctx.project_id is None
        assert ctx.user_role is None

    def test_project_context_with_values(self):
        from src.api.server import ProjectContext
        ctx = ProjectContext(
            project_id="proj-123",
            project_name="Highway Bridge",
            user_id="user-1",
            user_role="gc",
            company_id="comp-1",
        )
        assert ctx.project_id == "proj-123"
        assert ctx.user_role == "gc"


class TestToolFunctions:
    """Test each tool function returns expected placeholder strings."""

    @pytest.fixture
    def mock_context(self):
        ctx = MagicMock()
        ctx.context = MagicMock()
        ctx.context.state = MagicMock()
        return ctx

    @pytest.mark.asyncio
    async def test_get_budget_summary(self, mock_context):
        from src.api.server import get_budget_summary
        # function_tool decorator wraps the fn; call the underlying coroutine
        fn = get_budget_summary
        if hasattr(fn, "on_invoke_tool"):
            # It's wrapped by agents SDK — test the raw function instead
            pass
        result = await get_budget_summary(mock_context, project_id="P1")
        assert "P1" in result
        assert "Not yet implemented" in result or "budget" in result.lower()

    @pytest.mark.asyncio
    async def test_get_cost_codes(self, mock_context):
        from src.api.server import get_cost_codes
        result = await get_cost_codes(mock_context, project_id="P1")
        assert "P1" in result

    @pytest.mark.asyncio
    async def test_get_direct_costs(self, mock_context):
        from src.api.server import get_direct_costs
        result = await get_direct_costs(mock_context, project_id="P1")
        assert "P1" in result

    @pytest.mark.asyncio
    async def test_list_change_orders(self, mock_context):
        from src.api.server import list_change_orders
        result = await list_change_orders(mock_context, project_id="P1")
        assert "P1" in result

    @pytest.mark.asyncio
    async def test_get_change_order_detail(self, mock_context):
        from src.api.server import get_change_order_detail
        result = await get_change_order_detail(mock_context, change_order_id="CO-42")
        assert "CO-42" in result

    @pytest.mark.asyncio
    async def test_list_rfis(self, mock_context):
        from src.api.server import list_rfis
        result = await list_rfis(mock_context, project_id="P1")
        assert "P1" in result

    @pytest.mark.asyncio
    async def test_create_rfi(self, mock_context):
        from src.api.server import create_rfi
        result = await create_rfi(
            mock_context,
            project_id="P1",
            subject="Concrete spec",
            question="What PSI?",
        )
        assert "Concrete spec" in result

    @pytest.mark.asyncio
    async def test_list_submittals(self, mock_context):
        from src.api.server import list_submittals
        result = await list_submittals(mock_context, project_id="P1")
        assert "P1" in result

    @pytest.mark.asyncio
    async def test_get_daily_log_default_date(self, mock_context):
        from src.api.server import get_daily_log
        result = await get_daily_log(mock_context, project_id="P1")
        assert "today" in result.lower() or "P1" in result

    @pytest.mark.asyncio
    async def test_get_daily_log_specific_date(self, mock_context):
        from src.api.server import get_daily_log
        result = await get_daily_log(mock_context, project_id="P1", date="2026-01-15")
        assert "2026-01-15" in result

    @pytest.mark.asyncio
    async def test_list_contracts(self, mock_context):
        from src.api.server import list_contracts
        result = await list_contracts(mock_context, project_id="P1")
        assert "P1" in result

    @pytest.mark.asyncio
    async def test_search_directory(self, mock_context):
        from src.api.server import search_directory
        result = await search_directory(mock_context, project_id="P1", query="Smith")
        assert "Smith" in result


class TestAgentDefinitions:
    """Test that agents are properly defined."""

    def test_triage_agent_exists(self):
        from src.api.server import triage_agent
        assert triage_agent.name == "Triage Agent"

    def test_budget_agent_exists(self):
        from src.api.server import budget_agent
        assert budget_agent.name == "Budget Agent"

    def test_agents_have_handoffs(self):
        from src.api.server import triage_agent, budget_agent
        # triage should hand off to specialists
        assert len(triage_agent.handoffs) >= 4
        # specialists should hand back to triage
        assert any(
            getattr(h, "name", "") == "Triage Agent"
            for h in budget_agent.handoffs
        )
