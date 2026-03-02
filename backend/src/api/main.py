"""
═══════════════════════════════════════════════════════════════════════════
RAG API SERVER - Main FastAPI Application
═══════════════════════════════════════════════════════════════════════════

ROLE: Primary HTTP server that exposes RAG functionality via REST endpoints

CONTROLS:
- /chatkit endpoint → Routes to RagChatKitServerStreaming for chat interface
- CORS configuration for frontend access
- Server initialization and middleware setup
- Imports and initializes the RAG workflow system

DEPENDENCIES:
- scripts/rag_chatkit_server_streaming.py (streaming server)
- alleato_agent_workflow/ (agent system)

USED BY: Frontend at http://localhost:8051

═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import importlib.util
import sys
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional
from uuid import uuid4

# Load environment variables from root .env file
from src.services.env_loader import load_env
load_env()

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from agents import (
    Handoff,
    HandoffOutputItem,
    InputGuardrailTripwireTriggered,
    ItemHelpers,
    MessageOutputItem,
    Runner,
    ToolCallItem,
    ToolCallOutputItem,
)
from chatkit.agents import stream_agent_response
from chatkit.server import ChatKitServer, StreamingResult
from chatkit.types import (
    Action,
    AssistantMessageContent,
    AssistantMessageItem,
    ThreadItemDoneEvent,
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
    WidgetItem,
)
from chatkit.store import NotFoundError

from src.api.server import (
    ProjectChatContext,
    ProjectContext,
    budget_agent,
    change_order_agent,
    create_initial_context,
    rfi_agent,
    submittal_agent,
    triage_agent,
)

# Backwards-compatible aliases for any other references in this file
AirlineAgentChatContext = ProjectChatContext
AirlineAgentContext = ProjectContext
from src.services.memory_store import MemoryStore
from src.services.supabase_helpers import SupabaseRagStore
from src.services.ingestion.fireflies_pipeline import FirefliesIngestionPipeline
from src.services.pipeline import run_full_pipeline

# Import RAG workflow components
try:
    from alleato_agent_workflow.workflow import (
        run_workflow,
        WorkflowInput,
    )
    from alleato_agent_workflow.agents import (
        classification_agent as rag_classification_agent,
        project_agent as rag_project_agent,
        internal_knowledge_base_agent as rag_knowledge_agent,
        strategist_agent as rag_strategist_agent,
    )

    # Check environment variable for agent mode
    use_unified_agent = os.getenv("USE_UNIFIED_AGENT", "false").lower() == "true"

    try:
        if use_unified_agent:
            # Use unified agent (no classification)
            from src.scripts.rag_chatkit_server_unified import RagChatKitServerUnified as RagChatKitServer
            print("✓ Using UNIFIED AGENT (no classification) - faster, simpler")
        else:
            # Use classified routing (default)
            from src.scripts.rag_chatkit_server_streaming import RagChatKitServerStreaming as RagChatKitServer
            print("✓ Using CLASSIFIED ROUTING (classification + specialists) - legacy approach")
    except ImportError:
        try:
            from src.scripts.rag_chatkit_server import RagChatKitServer
            print("⚠ Using standard RAG server (no streaming)")
        except ImportError:
            # Fallback to loading directly from the scripts directory path.
            rag_server_path = Path(__file__).parent.parent / "scripts" / "rag_chatkit_server.py"
            try:
                spec = importlib.util.spec_from_file_location("rag_chatkit_server", rag_server_path)
                if not spec or not spec.loader:
                    raise ImportError("Unable to load rag_chatkit_server module")
                rag_chatkit_module = importlib.util.module_from_spec(spec)
                sys.modules[spec.name] = rag_chatkit_module
                spec.loader.exec_module(rag_chatkit_module)
                RagChatKitServer = getattr(rag_chatkit_module, "RagChatKitServer")
                print("⚠ Using fallback RAG server")
            except (FileNotFoundError, AttributeError) as inner_exc:
                raise ImportError(f"Unable to load RagChatKitServer: {inner_exc}") from inner_exc

    RAG_AVAILABLE = True
    print("Success: RAG workflow loaded successfully!")
except ImportError as e:
    RAG_AVAILABLE = False
    print(f"Warning: RAG workflow not available. Error: {e}")
    print("Continuing with base chatkit only.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_openai_client = OpenAI() if (OpenAI and os.getenv("OPENAI_API_KEY")) else None

app = FastAPI(
    title="Alleato Procore Backend API",
    description="Backend API for RAG-based chat functionality and agent workflows",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS configuration (adjust as needed for deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AgentEvent(BaseModel):
    id: str
    type: str
    agent: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[float] = None


class GuardrailCheck(BaseModel):
    id: str
    name: str
    input: str
    reasoning: str
    passed: bool
    timestamp: float


class ChatRequest(BaseModel):
    message: str
    project_id: Optional[int] = None
    limit: int = 5


class IngestRequest(BaseModel):
    path: str
    project_id: Optional[int] = None
    dry_run: bool = True


def _get_agent_by_name(name: str):
    """Return the agent object by name."""
    agents = {
        triage_agent.name: triage_agent,
        budget_agent.name: budget_agent,
        change_order_agent.name: change_order_agent,
        rfi_agent.name: rfi_agent,
        submittal_agent.name: submittal_agent,
    }
    return agents.get(name, triage_agent)


def _get_guardrail_name(g) -> str:
    """Extract a friendly guardrail name."""
    name_attr = getattr(g, "name", None)
    if isinstance(name_attr, str) and name_attr:
        return name_attr
    guard_fn = getattr(g, "guardrail_function", None)
    if guard_fn is not None and hasattr(guard_fn, "__name__"):
        return guard_fn.__name__.replace("_", " ").title()
    fn_name = getattr(g, "__name__", None)
    if isinstance(fn_name, str) and fn_name:
        return fn_name.replace("_", " ").title()
    return str(g)


def _build_agents_list() -> List[Dict[str, Any]]:
    """Build a list of all available agents and their metadata."""

    def make_agent_dict(agent):
        return {
            "name": agent.name,
            "description": getattr(agent, "handoff_description", ""),
            "handoffs": [getattr(h, "agent_name", getattr(h, "name", "")) for h in getattr(agent, "handoffs", [])],
            "tools": [getattr(t, "name", getattr(t, "__name__", "")) for t in getattr(agent, "tools", [])],
            "input_guardrails": [_get_guardrail_name(g) for g in getattr(agent, "input_guardrails", [])],
        }

    return [
        make_agent_dict(triage_agent),
        make_agent_dict(budget_agent),
        make_agent_dict(change_order_agent),
        make_agent_dict(rfi_agent),
        make_agent_dict(submittal_agent),
    ]


def _user_message_to_text(message: UserMessageItem) -> str:
    parts: List[str] = []
    for part in message.content:
        text = getattr(part, "text", "")
        if isinstance(text, str):
            parts.append(text)
    return "".join(parts)


def _parse_tool_args(raw_args: Any) -> Any:
    if isinstance(raw_args, str):
        try:
            import json

            return json.loads(raw_args)
        except Exception:
            return raw_args
    return raw_args


@dataclass
class ConversationState:
    input_items: List[Any] = field(default_factory=list)
    context: AirlineAgentContext = field(default_factory=create_initial_context)
    current_agent_name: str = triage_agent.name
    events: List[AgentEvent] = field(default_factory=list)
    guardrails: List[GuardrailCheck] = field(default_factory=list)


class ProjectServer(ChatKitServer[dict[str, Any]]):
    def __init__(self) -> None:
        self.store = MemoryStore()
        super().__init__(self.store)
        self._state: Dict[str, ConversationState] = {}

    def _state_for_thread(self, thread_id: str) -> ConversationState:
        if thread_id not in self._state:
            self._state[thread_id] = ConversationState()
        return self._state[thread_id]

    async def _ensure_thread(
        self, thread_id: Optional[str], context: dict[str, Any]
    ) -> ThreadMetadata:
        if thread_id:
            try:
                return await self.store.load_thread(thread_id, context)
            except NotFoundError:
                pass
        new_thread = ThreadMetadata(id=self.store.generate_thread_id(context), created_at=datetime.now())
        await self.store.save_thread(new_thread, context)
        self._state_for_thread(new_thread.id)
        return new_thread

    def _record_guardrails(
        self,
        agent_name: str,
        input_text: str,
        guardrail_results: List[Any],
    ) -> List[GuardrailCheck]:
        checks: List[GuardrailCheck] = []
        timestamp = time.time() * 1000
        agent = _get_agent_by_name(agent_name)
        for guardrail in getattr(agent, "input_guardrails", []):
            result = next((r for r in guardrail_results if r.guardrail == guardrail), None)
            reasoning = ""
            passed = True
            if result:
                info = getattr(result.output, "output_info", None)
                reasoning = getattr(info, "reasoning", "") or reasoning
                passed = not result.output.tripwire_triggered
            checks.append(
                GuardrailCheck(
                    id=uuid4().hex,
                    name=_get_guardrail_name(guardrail),
                    input=input_text,
                    reasoning=reasoning,
                    passed=passed,
                    timestamp=timestamp,
                )
            )
        return checks

    def _record_events(
        self,
        run_items: List[Any],
        current_agent_name: str,
    ) -> (List[AgentEvent], str):
        events: List[AgentEvent] = []
        active_agent = current_agent_name
        now_ms = time.time() * 1000

        for item in run_items:
            if isinstance(item, MessageOutputItem):
                text = ItemHelpers.text_message_output(item)
                events.append(
                    AgentEvent(
                        id=uuid4().hex,
                        type="message",
                        agent=item.agent.name,
                        content=text,
                        timestamp=now_ms,
                    )
                )
            elif isinstance(item, HandoffOutputItem):
                events.append(
                    AgentEvent(
                        id=uuid4().hex,
                        type="handoff",
                        agent=item.source_agent.name,
                        content=f"{item.source_agent.name} -> {item.target_agent.name}",
                        metadata={"source_agent": item.source_agent.name, "target_agent": item.target_agent.name},
                        timestamp=now_ms,
                    )
                )

                from_agent = item.source_agent
                to_agent = item.target_agent
                ho = next(
                    (
                        h
                        for h in getattr(from_agent, "handoffs", [])
                        if isinstance(h, Handoff) and getattr(h, "agent_name", None) == to_agent.name
                    ),
                    None,
                )
                if ho:
                    fn = ho.on_invoke_handoff
                    fv = fn.__code__.co_freevars
                    cl = fn.__closure__ or []
                    if "on_handoff" in fv:
                        idx = fv.index("on_handoff")
                        if idx < len(cl) and cl[idx].cell_contents:
                            cb = cl[idx].cell_contents
                            cb_name = getattr(cb, "__name__", repr(cb))
                            events.append(
                                AgentEvent(
                                    id=uuid4().hex,
                                    type="tool_call",
                                    agent=to_agent.name,
                                    content=cb_name,
                                    timestamp=now_ms,
                                )
                            )

                active_agent = to_agent.name
            elif isinstance(item, ToolCallItem):
                tool_name = getattr(item.raw_item, "name", None)
                raw_args = getattr(item.raw_item, "arguments", None)
                events.append(
                    AgentEvent(
                        id=uuid4().hex,
                        type="tool_call",
                        agent=item.agent.name,
                        content=tool_name or "",
                        metadata={"tool_args": _parse_tool_args(raw_args)},
                        timestamp=now_ms,
                    )
                )
            elif isinstance(item, ToolCallOutputItem):
                events.append(
                    AgentEvent(
                        id=uuid4().hex,
                        type="tool_output",
                        agent=item.agent.name,
                        content=str(item.output),
                        metadata={"tool_result": item.output},
                        timestamp=now_ms,
                    )
                )

        return events, active_agent

    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        state = self._state_for_thread(thread.id)
        user_text = ""
        if input_user_message is not None:
            user_text = _user_message_to_text(input_user_message)
            state.input_items.append({"content": user_text, "role": "user"})

        previous_context = state.context.model_dump()
        chat_context = AirlineAgentChatContext(
            thread=thread,
            store=self.store,
            request_context=context,
            state=state.context,
        )

        try:
            result = Runner.run_streamed(
                _get_agent_by_name(state.current_agent_name),
                state.input_items,
                context=chat_context,
            )
            async for event in stream_agent_response(chat_context, result):
                yield event
        except InputGuardrailTripwireTriggered as exc:
            failed_guardrail = exc.guardrail_result.guardrail
            gr_output = exc.guardrail_result.output.output_info
            reasoning = getattr(gr_output, "reasoning", "")
            timestamp = time.time() * 1000
            checks: List[GuardrailCheck] = []
            for guardrail in _get_agent_by_name(state.current_agent_name).input_guardrails:
                checks.append(
                    GuardrailCheck(
                        id=uuid4().hex,
                        name=_get_guardrail_name(guardrail),
                        input=user_text,
                        reasoning=reasoning if guardrail == failed_guardrail else "",
                        passed=guardrail != failed_guardrail,
                        timestamp=timestamp,
                    )
                )
            state.guardrails = checks
            refusal = "Sorry, I can only answer questions related to construction project management."
            state.input_items.append({"role": "assistant", "content": refusal})
            yield ThreadItemDoneEvent(
                item=AssistantMessageItem(
                    id=self.store.generate_item_id("message", thread, context),
                    thread_id=thread.id,
                    created_at=datetime.now(),
                    content=[AssistantMessageContent(text=refusal)],
                )
            )
            return

        state.input_items = result.to_input_list()
        new_events, active_agent = self._record_events(result.new_items, state.current_agent_name)
        state.events.extend(new_events)
        final_agent_name = active_agent
        try:
            final_agent_name = result.last_agent.name
        except Exception:
            pass
        state.current_agent_name = final_agent_name
        state.guardrails = self._record_guardrails(
            agent_name=state.current_agent_name,
            input_text=user_text,
            guardrail_results=result.input_guardrail_results,
        )

        new_context = state.context.model_dump()
        changes = {k: new_context[k] for k in new_context if previous_context.get(k) != new_context[k]}
        if changes:
            state.events.append(
                AgentEvent(
                    id=uuid4().hex,
                    type="context_update",
                    agent=state.current_agent_name,
                    content="",
                    metadata={"changes": changes},
                    timestamp=time.time() * 1000,
                )
            )

    async def action(
        self,
        thread: ThreadMetadata,
        action: Action[str, Any],
        sender: WidgetItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        # No client-handled actions in this demo.
        if False:
            yield

    async def snapshot(self, thread_id: Optional[str], context: dict[str, Any]) -> Dict[str, Any]:
        thread = await self._ensure_thread(thread_id, context)
        state = self._state_for_thread(thread.id)
        return {
            "thread_id": thread.id,
            "current_agent": state.current_agent_name,
            "context": state.context.model_dump(),
            "agents": _build_agents_list(),
            "events": [e.model_dump() for e in state.events],
            "guardrails": [g.model_dump() for g in state.guardrails],
        }


server = ProjectServer()


def get_server() -> ProjectServer:
    return server


def get_rag_store() -> SupabaseRagStore:
    return SupabaseRagStore()


def get_ingestion_pipeline(
    store: SupabaseRagStore = Depends(get_rag_store),
) -> FirefliesIngestionPipeline:
    return FirefliesIngestionPipeline(store)


@app.post("/chatkit", tags=["Construction PM"], summary="ChatKit endpoint for construction PM")
async def chatkit_endpoint(
    request: Request, server: ProjectServer = Depends(get_server)
) -> Response:
    """Process ChatKit protocol messages for the construction PM chatbot."""
    payload = await request.body()
    result = await server.process(payload, {"request": request})
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")
    return Response(content=result)


@app.get("/chatkit/state", tags=["Construction PM"], summary="Get construction PM chat state")
async def chatkit_state(
    thread_id: str = Query(..., description="ChatKit thread identifier"),
    server: ProjectServer = Depends(get_server),
) -> Dict[str, Any]:
    """Get the current state of an construction PM chat conversation."""
    return await server.snapshot(thread_id, {"request": None})


@app.get("/chatkit/bootstrap", tags=["Construction PM"], summary="Bootstrap construction PM chat")
async def chatkit_bootstrap(
    server: ProjectServer = Depends(get_server),
) -> Dict[str, Any]:
    """Initialize a new construction PM chat session with default state."""
    return await server.snapshot(None, {"request": None})


@app.get("/health", tags=["System"], summary="Health check")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint that verifies backend status and OpenAI configuration.
    
    Returns:
        Dict containing health status, OpenAI configuration status, and RAG availability.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    openai_configured = bool(openai_key and len(openai_key) > 0)
    
    return {
        "status": "healthy",
        "openai_configured": openai_configured,
        "rag_available": RAG_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    }


# ===== RAG ENDPOINTS =====
# These endpoints provide RAG-based chat functionality using Alleato agents

# RAG Context management
@dataclass
class RagAgentContext:
    """Context for RAG agent operations"""
    retrieved_chunks: List[str] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    query_type: Optional[str] = None
    current_agent: str = "classification"
    thread_id: str = field(default_factory=lambda: str(uuid4()))

    def to_dict(self) -> dict:
        return {
            "retrieved_chunks": self.retrieved_chunks,
            "sources": self.sources,
            "confidence_score": self.confidence_score,
            "query_type": self.query_type,
            "current_agent": self.current_agent,
            "thread_id": self.thread_id,
        }

@dataclass
class RagChatContext:
    """Complete chat context including agents and events"""
    context: RagAgentContext
    agents: List[str] = field(default_factory=list)
    events: List[dict] = field(default_factory=list)
    guardrails: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "context": self.context.to_dict(),
            "agents": self.agents,
            "events": self.events,
            "guardrails": self.guardrails,
        }

def create_initial_rag_context() -> RagAgentContext:
    """Create initial RAG context"""
    return RagAgentContext()

# Memory store for RAG threads - simple dictionary storage
rag_memory_store: Dict[str, RagChatContext] = {}

# Create singleton RAG server instance
_rag_server: Optional[RagChatKitServer] = None

def get_rag_server() -> RagChatKitServer:
    """Get the singleton RAG server instance"""
    global _rag_server
    if _rag_server is None:
        if RAG_AVAILABLE:
            _rag_server = RagChatKitServer()
        else:
            raise RuntimeError("RAG workflow not available")
    return _rag_server


def _camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case"""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


def _transform_keys_to_snake_case(obj: Any) -> Any:
    """Recursively transform all keys in a dict from camelCase to snake_case"""
    if isinstance(obj, dict):
        return {_camel_to_snake(k): _transform_keys_to_snake_case(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_transform_keys_to_snake_case(item) for item in obj]
    else:
        return obj


@app.post("/rag-chatkit", tags=["RAG Chat"], summary="Main RAG ChatKit endpoint (streaming)")
async def rag_chatkit_endpoint(
    request: Request,
):
    """Main RAG ChatKit endpoint that handles streaming chat interactions.
    
    This endpoint processes ChatKit protocol messages and returns Server-Sent Events (SSE)
    for real-time streaming of chat responses.
    """
    if not RAG_AVAILABLE:
        return Response(
            content='{"error": "RAG workflow not available"}',
            status_code=503,
            media_type="application/json"
        )

    try:
        # Get the RAG server and handle the request
        rag_server = get_rag_server()
        payload = await request.body()

        # Transform camelCase keys to snake_case for Python ChatKit compatibility
        try:
            payload_dict = json.loads(payload)
            # Transform the request type from camelCase to snake_case (e.g., threads.addUserMessage -> threads.add_user_message)
            if "type" in payload_dict:
                parts = payload_dict["type"].split(".")
                if len(parts) == 2:
                    payload_dict["type"] = f"{parts[0]}.{_camel_to_snake(parts[1])}"
            # Transform all keys in params
            if "params" in payload_dict:
                payload_dict["params"] = _transform_keys_to_snake_case(payload_dict["params"])
            payload = json.dumps(payload_dict).encode()
            logger.info(f"[RAG-ChatKit] Transformed payload: {payload[:500] if payload else 'empty'}")
        except json.JSONDecodeError:
            logger.warning("[RAG-ChatKit] Could not parse payload as JSON, using raw")

        result = await rag_server.process(payload, {"request": request})

        if isinstance(result, StreamingResult):
            return StreamingResponse(result, media_type="text/event-stream")
        if hasattr(result, "json"):
            return Response(content=result.json, media_type="application/json")
        return Response(content=result)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[RAG-ChatKit] Error: {e}\n{error_details}")
        return Response(
            content=json.dumps({"error": str(e), "details": error_details}),
            status_code=500,
            media_type="application/json"
        )


@app.get("/rag-chatkit/state", tags=["RAG Chat"], summary="Get RAG chat state")
async def get_rag_state(thread_id: str = Query(..., description="Thread ID for the conversation")):
    """Get the current state of a RAG chat conversation.
    
    Args:
        thread_id: Unique identifier for the chat thread
        
    Returns:
        Current conversation state including context, agents, and events.
    """
    if not RAG_AVAILABLE:
        return {"error": "RAG workflow not available"}

    rag_server = get_rag_server()
    return await rag_server.snapshot(thread_id, {"request": None})


@app.get("/rag-chatkit/bootstrap", tags=["RAG Chat"], summary="Bootstrap RAG chat session")
async def rag_bootstrap():
    """Bootstrap a new RAG conversation with initial state.
    
    Creates a new chat session with default context and available agents.
    """
    if not RAG_AVAILABLE:
        return {"error": "RAG workflow not available"}

    rag_server = get_rag_server()
    return await rag_server.snapshot(None, {"request": None})


def _select_keyword(message: str) -> Optional[str]:
    words = re.findall(r"[A-Za-z]+", message.lower())
    stop_words = {
        "tell",
        "about",
        "what",
        "when",
        "where",
        "which",
        "there",
        "their",
        "would",
        "could",
        "should",
        "project",
        "status",
        "concerns",
        "issues",
        "any",
        "with",
        "from",
        "that",
        "this",
        "have",
        "been",
        "were",
        "please",
    }
    candidates = [w for w in words if len(w) >= 4 and w not in stop_words]
    if candidates:
        # Favor the longest candidate (often project/client names).
        return sorted(candidates, key=len, reverse=True)[0]
    return None


def _get_query_embedding(message: str) -> Optional[List[float]]:
    if _openai_client is None:
        return None
    try:
        response = _openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=[message],
        )
        return response.data[0].embedding
    except Exception:
        return None


def _build_chat_reply(
    message: str,
    store: SupabaseRagStore,
    project_id: Optional[int],
    limit: int = 5,
) -> Dict[str, Any]:
    keyword = _select_keyword(message)
    retrieval_mode = "keyword"
    chunks: List[Dict[str, Any]] = []

    query_embedding = _get_query_embedding(message)
    if query_embedding:
        chunks = store.vector_search_documents(
            query_embedding=query_embedding,
            limit=limit,
            project_id=project_id,
        )
        if chunks:
            retrieval_mode = "semantic"

    if not chunks:
        chunks = store.search_chunks_by_keyword(keyword, project_id=project_id, limit=limit)
    if not chunks:
        chunks = store.fetch_recent_chunks(project_id=project_id, limit=limit)
        retrieval_mode = "recent"

    tasks = store.list_tasks(project_id=project_id, status="open", limit=limit)
    insights = store.list_insights(project_id=project_id, limit=limit)
    project = store.get_project(project_id) if project_id is not None else None

    sources = [
        {
            "document_id": chunk.get("document_id"),
            "chunk_index": chunk.get("chunk_index") or (chunk.get("metadata") or {}).get("chunk_index"),
            "snippet": (chunk.get("text") or "")[:280],
            "metadata": chunk.get("metadata") or {},
        }
        for chunk in chunks
    ]

    reply_lines: List[str] = []
    if project:
        reply_lines.append(
            f"Project {project.get('name', project_id)} has {project.get('meeting_count', 0)} documented meetings and {project.get('open_tasks', 0)} open AI tasks."
        )
    if tasks:
        reply_lines.append(
            "Top open tasks: " + "; ".join(task.get("title", "Task") for task in tasks[:3])
        )
    if insights:
        reply_lines.append(
            "Recent insights: " + "; ".join(insight.get("summary", "")[:80] for insight in insights[:3])
        )
    if sources:
        if retrieval_mode == "semantic":
            reply_lines.append(f"Retrieved {len(sources)} transcript snippets via semantic vector search.")
        elif retrieval_mode == "keyword":
            reply_lines.append(
                f"Retrieved {len(sources)} transcript snippets based on the keyword '{keyword or 'recent'}'."
            )
        else:
            reply_lines.append(f"Retrieved {len(sources)} recent transcript snippets.")
        reply_lines.append("Top relevant transcript evidence:")
        for source in sources[:3]:
            snippet = (source.get("snippet") or "").replace("\n", " ").strip()
            if snippet:
                reply_lines.append(f"- {snippet[:180]}")

        concern_terms = ("risk", "delay", "blocked", "issue", "concern", "over budget", "late")
        concern_hits = sum(
            1
            for source in sources
            if any(term in (source.get("snippet") or "").lower() for term in concern_terms)
        )
        if concern_hits > 0:
            reply_lines.append(
                f"Potential concerns detected in {concern_hits} of the retrieved snippets. Review those items for schedule/cost risk."
            )
        else:
            reply_lines.append(
                "No explicit risk language was detected in the retrieved snippets."
            )
    if not reply_lines:
        reply_lines.append(
            "No relevant transcripts or tasks were found yet. Try ingesting more Fireflies meetings or widening your query."
        )

    return {
        "reply": "\n".join(reply_lines),
        "sources": sources,
        "tasks": tasks,
        "insights": insights,
    }


# === Alleato REST API ===


@app.get("/api/projects", tags=["Projects"], summary="List all projects")
def list_projects_api(store: SupabaseRagStore = Depends(get_rag_store)) -> Dict[str, Any]:
    """Retrieve a list of all projects from the RAG store.
    
    Returns:
        Dict with 'projects' key containing list of project objects.
    """
    return {"projects": store.list_projects()}


@app.get("/api/projects/{project_id}", tags=["Projects"], summary="Get project details")
def project_detail_api(project_id: int, store: SupabaseRagStore = Depends(get_rag_store)) -> Dict[str, Any]:
    """Get detailed information about a specific project including tasks and insights."""
    project = store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    tasks = store.list_tasks(project_id=project_id, status="open", limit=50)
    insights = store.list_insights(project_id=project_id, limit=20)
    return {"project": project, "tasks": tasks, "insights": insights}


@app.post("/api/chat", tags=["RAG Chat"], summary="Simple chat endpoint")
def rag_chat_api(payload: ChatRequest, store: SupabaseRagStore = Depends(get_rag_store)) -> Dict[str, Any]:
    """Process a chat message and return relevant information from the knowledge base.
    
    Performs keyword-based search against ingested transcript chunks and returns
    matching sources along with related tasks and insights.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    return _build_chat_reply(payload.message, store=store, project_id=payload.project_id, limit=payload.limit)


class SimpleChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


@app.post("/api/rag-chat-simple", tags=["RAG Chat"], summary="Simple RAG chat (non-streaming)")
async def rag_chat_simple(payload: SimpleChatRequest) -> Dict[str, Any]:
    """
    Simple RAG chat endpoint that uses agents but returns JSON (not streaming).

    This endpoint is suitable for applications that don't support Server-Sent Events.
    It processes the chat message through the full agent workflow (classification + routing)
    and returns the complete response.

    Request body:
        - message: The user's chat message
        - history: Optional conversation history

    Returns:
        - response: The assistant's response
        - retrieved: List of retrieved documents (if any)
    """
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=503, detail="RAG workflow not available")

    if not payload.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    try:
        # Use the full workflow which handles classification + routing to specialist agents
        workflow_result = await run_workflow(WorkflowInput(input_as_text=payload.message))

        # Extract response text from workflow result
        response_text = workflow_result.get("output_text", "")

        # If guardrails triggered, we get a different structure
        if not response_text and "message" in workflow_result:
            response_text = workflow_result.get("message", "")

        return {
            "response": response_text.strip() or "I received your message but couldn't generate a response.",
            "retrieved": []
        }

    except Exception as e:
        logger.error(f"Error in rag_chat_simple: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@app.post("/api/ingest/fireflies", tags=["Ingestion"], summary="Ingest Fireflies transcript")
def ingest_fireflies_endpoint(
    payload: IngestRequest,
    pipeline: FirefliesIngestionPipeline = Depends(get_ingestion_pipeline),
) -> Dict[str, Any]:
    """Ingest a Fireflies meeting transcript into the knowledge base.

    This endpoint processes Fireflies meeting transcripts and extracts:
    - Meeting metadata
    - Transcript chunks for semantic search
    - Action items and tasks
    - Key insights and decisions

    Args:
        payload: IngestRequest with path to transcript file, optional project_id, and dry_run flag.

    Returns:
        Dict with ingestion result details.
    """
    result = pipeline.ingest_file(payload.path, project_id=payload.project_id, dry_run=payload.dry_run)
    return {"result": result.__dict__}


class PipelineProcessRequest(BaseModel):
    metadataId: str


@app.post("/api/pipeline/process", tags=["Ingestion"], summary="Run full RAG pipeline for a document")
async def pipeline_process_endpoint(
    payload: PipelineProcessRequest,
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    """Trigger the full RAG pipeline for a document_metadata row.

    Called by the Supabase DB trigger (via pg_net) on every INSERT into
    document_metadata. Can also be called manually.

    Stages run in background:
      1. Parser   — parse Fireflies markdown, LLM segmentation → meeting_segments
      2. Embedder — chunk + embed with OpenAI → documents
      3. Extractor — structured extraction → decisions/risks/tasks/opportunities

    Args:
        payload: PipelineProcessRequest with metadataId (UUID string).

    Returns:
        Dict with status "queued" and the metadataId.
    """
    background_tasks.add_task(run_full_pipeline, payload.metadataId)
    return {"status": "queued", "metadataId": payload.metadataId}


# === Scheduled Analysis Engine ===

@app.on_event("startup")
async def start_scheduler():
    """Initialize the scheduled analysis engine on server startup."""
    try:
        from src.services.scheduler import init_scheduler
        init_scheduler()
    except Exception as e:
        logger.warning("Scheduler init failed (non-critical): %s", e)


@app.on_event("shutdown")
async def stop_scheduler():
    """Gracefully shut down the scheduler."""
    try:
        from src.services.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass


# === Digest Endpoints ===

@app.get("/api/digests/meeting/{metadata_id}", tags=["Digests"])
async def get_meeting_digest(metadata_id: str) -> Dict[str, Any]:
    """Get the post-meeting digest for a specific meeting."""
    from src.services.supabase_helpers import get_supabase_client
    client = get_supabase_client()
    resp = (
        client.table("meeting_digests")
        .select("*")
        .eq("metadata_id", metadata_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Digest not found")
    return resp.data


@app.post("/api/digests/daily/generate", tags=["Digests"])
async def trigger_daily_digest(
    background_tasks: BackgroundTasks,
    date: Optional[str] = Query(None, description="YYYY-MM-DD, default today"),
    days: int = Query(1, description="Number of days to include"),
) -> Dict[str, Any]:
    """Manually trigger daily digest generation."""
    from src.services.daily_digest import run_daily_digest
    background_tasks.add_task(run_daily_digest, date, days)
    return {"status": "queued", "date": date, "days": days}


@app.get("/api/digests/daily/{date}", tags=["Digests"])
async def get_daily_digest(date: str) -> Dict[str, Any]:
    """Get the daily recap for a specific date (YYYY-MM-DD)."""
    from src.services.supabase_helpers import get_supabase_client
    client = get_supabase_client()
    resp = (
        client.table("daily_recaps")
        .select("*")
        .eq("recap_date", date)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Daily recap not found")
    return resp.data


# === Admin Endpoints ===
# Import and include admin routes
try:
    from src.api.admin_endpoints import router as admin_router
    app.include_router(admin_router)
    logger.info("Admin endpoints loaded successfully")
except ImportError as e:
    logger.warning(f"Admin endpoints not available: {e}")

# === YokeFlow Agent Platform ===
# Mount YokeFlow API as a sub-application at /yokeflow
try:
    from src.yokeflow.api.router import initialize_yokeflow
    yokeflow_app = initialize_yokeflow()
    app.mount("/yokeflow", yokeflow_app)
    logger.info("YokeFlow agent platform mounted at /yokeflow")
except ImportError as e:
    logger.warning(f"YokeFlow agent platform not available: {e}")
except Exception as e:
    logger.warning(f"Failed to initialize YokeFlow: {e}")
