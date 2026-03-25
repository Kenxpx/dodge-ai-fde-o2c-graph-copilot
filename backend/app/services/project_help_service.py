from __future__ import annotations

import re
from dataclasses import dataclass

from app.llm.providers import get_llm_provider
from app.models import HelpChatRequest, HelpChatResponse


HELP_SYSTEM_PROMPT = """
You are the in-product project guide for an ERP analytics assignment submission.

Answer only with facts from the provided project notes.
Do not invent implementation details, credentials, people, or metrics.
Keep answers concise, grounded, and useful for a reviewer or evaluator.
Prefer explaining:
- what the project does
- why specific architecture choices were made
- how the graph, SQL, and Gemini layers fit together
- how the app is deployed and verified
- who built the project and what the submission includes
""".strip()


@dataclass(frozen=True)
class HelpSnippet:
    id: str
    title: str
    summary: str
    bullets: tuple[str, ...]
    keywords: tuple[str, ...]
    citations: tuple[str, ...]


HELP_SNIPPETS: tuple[HelpSnippet, ...] = (
    HelpSnippet(
        id="overview",
        title="Project overview",
        summary=(
            "This project is an O2C workspace built for the Dodge AI Forward Deployed Engineer "
            "assignment. It combines grounded SQL, a materialized graph, and a reviewer-friendly UI for tracing invoices, "
            "investigating broken flows, and answering ERP questions."
        ),
        bullets=(
            "The app is intentionally shaped like an operator tool rather than a generic graph demo.",
            "Core workflows include invoice tracing, incomplete-flow detection, cancellation review, and open A/R investigation.",
            "The graph and chat layers read from the same semantic business model so they stay aligned.",
        ),
        keywords=("overview", "project", "what", "built", "does", "assignment", "demo", "goal"),
        citations=("README.md", "FINAL_SUBMISSION.md"),
    ),
    HelpSnippet(
        id="ownership",
        title="Author and submission context",
        summary=(
            "The project was built by Sachin Bindu C as part of the Dodge AI FDE take-home. The submission package "
            "includes the public GitHub repo, live demo, documentation, and AI session logs."
        ),
        bullets=(
            "The public repository is github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot.",
            "The deployed demo runs on Render.",
            "Submission materials include README, architecture notes, deployment notes, and ai-coding-sessions.zip.",
        ),
        keywords=("who", "made", "built", "author", "owner", "candidate", "submission", "repo"),
        citations=("FINAL_SUBMISSION.md", "SUBMISSION_GUIDE.md"),
    ),
    HelpSnippet(
        id="backend",
        title="Backend architecture",
        summary=(
            "The backend uses FastAPI with a service-oriented structure. Ingestion, querying, graph operations, inbox "
            "logic, and project-help logic are kept separate so each path stays readable and easy to verify."
        ),
        bullets=(
            "ingestion.py turns raw SAP exports into raw tables, semantic views, and graph tables.",
            "query_service.py handles deterministic ERP questions first and uses Gemini only when a dynamic SQL plan is needed.",
            "graph_service.py owns graph search, graph expansion, and answer-linked graph focus.",
        ),
        keywords=("backend", "fastapi", "services", "structure", "api", "python", "architecture"),
        citations=("docs/ARCHITECTURE.md", "backend/app/main.py"),
    ),
    HelpSnippet(
        id="semantic_model",
        title="Semantic model",
        summary=(
            "The core business table is o2c_flow. It flattens the sales-order-item lineage across delivery, billing, "
            "accounting, and payment clearance so most business questions can be answered from one reliable place."
        ),
        bullets=(
            "Item ids are normalized because SAP exports mix values like 10 and 000010.",
            "Billing lineage runs through delivery items rather than jumping directly from sales order to invoice.",
            "Cancellation handling is explicit through billing document type S1 and cancelled_billing_document links.",
        ),
        keywords=("data", "model", "semantic", "o2c_flow", "joins", "lineage", "cancellation"),
        citations=("docs/ARCHITECTURE.md", "backend/app/services/ingestion.py"),
    ),
    HelpSnippet(
        id="graph",
        title="Graph model",
        summary=(
            "The graph is materialized into graph_nodes and graph_edges instead of being improvised in the UI. "
            "That makes graph search, entity inspection, and answer-linked graph focus fast and predictable."
        ),
        bullets=(
            "Each node has a stable node_id, a node_type, display labels, searchable text, and metadata for the inspector.",
            "Each edge records the relationship type and allows the UI to follow the business chain visually.",
            "The backend decides which subgraph best explains an answer, and the frontend just renders it.",
        ),
        keywords=("graph", "nodes", "edges", "cytoscape", "visual", "explorer"),
        citations=("docs/ARCHITECTURE.md", "backend/app/services/graph_service.py"),
    ),
    HelpSnippet(
        id="query_quality",
        title="Query quality and guardrails",
        summary=(
            "The ERP answer path is deterministic first and LLM second. Known evaluator questions map to SQL templates, "
            "while Gemini is reserved for broader in-domain questions that need dynamic SQL planning."
        ),
        bullets=(
            "Generated SQL is validated as read-only and restricted to approved tables.",
            "A row limit is enforced before execution.",
            "Gemini gets one schema-repair pass if the initial SQL draft is close but wrong.",
        ),
        keywords=("gemini", "sql", "guardrails", "llm", "grounded", "safe", "query"),
        citations=("README.md", "backend/app/services/query_service.py"),
    ),
    HelpSnippet(
        id="operator_experience",
        title="Operator-facing product features",
        summary=(
            "The UI is shaped around real investigation flows instead of only showing a graph. It includes an operations "
            "inbox, grounded chat answers, recommended actions, guided follow-up questions, exportable investigation briefs, "
            "and a right-rail project guide."
        ),
        bullets=(
            "The operations inbox surfaces delivered-not-billed orders, open A/R items, cancellations, and orders missing delivery.",
            "Each grounded answer shows supporting evidence, SQL, recommended actions, and guided next steps.",
            "Investigation briefs can be exported directly from the answer thread.",
        ),
        keywords=("ui", "features", "inbox", "follow-up", "brief", "operator", "experience"),
        citations=("README.md", "frontend/src/App.tsx"),
    ),
    HelpSnippet(
        id="frontend",
        title="Frontend structure",
        summary=(
            "The frontend is a React and TypeScript app built with Vite. The main page coordinates the ERP chat, graph, "
            "entity explorer, and the right-rail project guide."
        ),
        bullets=(
            "Graph rendering uses Cytoscape.js.",
            "The main page keeps the graph, selected entity, and chat responses in sync.",
            "The right rail now includes both entity exploration and a project-help chatbot.",
        ),
        keywords=("frontend", "react", "vite", "typescript", "right", "panel", "guide"),
        citations=("docs/ARCHITECTURE.md", "frontend/src/App.tsx"),
    ),
    HelpSnippet(
        id="deployment",
        title="Deployment",
        summary=(
            "The app is deployed as a single Render web service. The frontend is built into static assets, FastAPI serves "
            "both the API and the SPA, and the dataset is bundled with the container."
        ),
        bullets=(
            "Dockerfile and render.yaml are both included in the repo.",
            "Gemini is enabled in the deployed environment through Render environment variables.",
            "Keeping it as one service makes reviewer setup and live demo validation much simpler.",
        ),
        keywords=("deploy", "deployment", "render", "docker", "live", "hosting"),
        citations=("docs/SETUP_AND_DEPLOYMENT.md", "render.yaml"),
    ),
    HelpSnippet(
        id="local_setup",
        title="Running locally",
        summary=(
            "The project is designed to run locally without extra infrastructure. The reviewer only needs Python, Node, "
            "the bundled dataset, and the provided setup commands."
        ),
        bullets=(
            "Use native CPython 3.11 on Windows for DuckDB wheel compatibility.",
            "Build the database from backend/scripts/build_database.py.",
            "Run FastAPI for the backend and Vite for the frontend in development mode.",
        ),
        keywords=("local", "run", "install", "setup", "commands", "windows"),
        citations=("README.md", "docs/SETUP_AND_DEPLOYMENT.md"),
    ),
    HelpSnippet(
        id="verification",
        title="Verification",
        summary=(
            "The project is verified both locally and on the live deployment. Local checks cover backend tests, API smoke "
            "tests, and the frontend production build."
        ),
        bullets=(
            "Backend smoke tests run through pytest.",
            "API smoke checks cover /api/health, /api/meta, and representative query paths.",
            "The live app is rechecked after deployment to confirm both deterministic and Gemini-backed flows still work.",
        ),
        keywords=("test", "verification", "pytest", "smoke", "quality", "working"),
        citations=("README.md", "backend/tests/test_smoke.py"),
    ),
    HelpSnippet(
        id="tradeoffs",
        title="Design tradeoffs",
        summary=(
            "The project prioritizes groundedness, semantic modeling, and evaluator reliability over flashy but shallow "
            "feature count. The goal was to make the demo feel trustworthy first."
        ),
        bullets=(
            "A strong semantic layer was prioritized over adding many disconnected UI widgets.",
            "Deterministic SQL handles the highest-signal evaluator workflows even without an LLM.",
            "The graph stays focused on the answer instead of trying to show the whole ERP world at once.",
        ),
        keywords=("tradeoff", "why", "choose", "decision", "reliability", "trustworthy"),
        citations=("README.md", "docs/ARCHITECTURE.md"),
    ),
)


class ProjectHelpService:
    def __init__(self) -> None:
        self.provider = get_llm_provider()

    def _tokenize(self, text: str) -> set[str]:
        return {token for token in re.findall(r"[a-z0-9_]+", text.lower()) if len(token) >= 3}

    def _retrieve(self, question: str, conversation: list[str]) -> list[HelpSnippet]:
        haystack = " ".join([question, *conversation]).lower()
        tokens = self._tokenize(haystack)
        ranked: list[tuple[int, HelpSnippet]] = []

        for snippet in HELP_SNIPPETS:
            score = 0
            for keyword in snippet.keywords:
                if keyword in haystack:
                    score += 4
                if keyword in tokens:
                    score += 2
            title_tokens = self._tokenize(snippet.title)
            score += len(tokens & title_tokens)
            if snippet.id == "overview":
                score += 1
            if score > 0:
                ranked.append((score, snippet))

        ranked.sort(key=lambda item: item[0], reverse=True)
        selected = [snippet for _, snippet in ranked[:3]]
        if not selected:
            selected = [HELP_SNIPPETS[0], HELP_SNIPPETS[2], HELP_SNIPPETS[8]]
        return selected

    def _is_project_question(self, question: str, conversation: list[str]) -> bool:
        combined = " ".join([question, *conversation]).lower()
        hints = (
            "project",
            "app",
            "built",
            "made",
            "author",
            "architecture",
            "stack",
            "duckdb",
            "gemini",
            "graph",
            "frontend",
            "backend",
            "render",
            "deploy",
            "local",
            "run",
            "help",
            "submission",
        )
        return any(hint in combined for hint in hints)

    def _suggest_questions(self, snippets: list[HelpSnippet]) -> list[str]:
        suggestion_map = {
            "overview": "How do the graph and SQL layers stay in sync?",
            "ownership": "What exactly is included in the submission package?",
            "backend": "How is the backend split across services?",
            "semantic_model": "What are the hardest ERP joins handled in the semantic layer?",
            "graph": "Why materialize graph_nodes and graph_edges instead of building the graph in the UI?",
            "query_quality": "How does Gemini stay grounded and safe in this project?",
            "operator_experience": "Which product features were added to make the app feel production-ready?",
            "frontend": "How is the right-side project guide integrated into the frontend?",
            "deployment": "How is the live demo deployed and configured?",
            "local_setup": "How would I run this project locally from scratch?",
            "verification": "How did you verify the project before submission?",
            "tradeoffs": "What tradeoffs did you make to keep the project reviewer-friendly?",
        }
        suggestions: list[str] = []
        for snippet in snippets:
            suggestion = suggestion_map.get(snippet.id)
            if suggestion and suggestion not in suggestions:
                suggestions.append(suggestion)
        fallback = [
            "Who built this project and what was the goal?",
            "Why did you choose DuckDB and FastAPI?",
            "How does Gemini stay grounded and safe?",
        ]
        for suggestion in fallback:
            if suggestion not in suggestions:
                suggestions.append(suggestion)
        return suggestions[:3]

    def _fallback_answer(self, question: str, snippets: list[HelpSnippet]) -> HelpChatResponse:
        top = snippets[0]
        answer_parts = [top.summary]
        if len(snippets) > 1:
            answer_parts.append(snippets[1].summary)

        highlights: list[str] = []
        for snippet in snippets:
            for bullet in snippet.bullets:
                if bullet not in highlights:
                    highlights.append(bullet)
                if len(highlights) >= 4:
                    break
            if len(highlights) >= 4:
                break

        citations: list[str] = []
        for snippet in snippets:
            for citation in snippet.citations:
                if citation not in citations:
                    citations.append(citation)

        title = top.title
        if any(word in question.lower() for word in ("who", "author", "made", "built")):
            title = "Project ownership"

        return HelpChatResponse(
            answer_title=title,
            answer=" ".join(answer_parts),
            highlights=highlights,
            suggested_questions=self._suggest_questions(snippets),
            citations=citations[:4],
        )

    async def _llm_answer(self, request: HelpChatRequest, snippets: list[HelpSnippet]) -> HelpChatResponse:
        assert self.provider is not None
        conversation = "\n".join(f"{turn.role}: {turn.content}" for turn in request.conversation[-6:])
        context = "\n\n".join(
            (
                f"[{snippet.title}]\n"
                f"Summary: {snippet.summary}\n"
                f"Notes:\n- " + "\n- ".join(snippet.bullets) + "\n"
                f"Sources: {', '.join(snippet.citations)}"
            )
            for snippet in snippets
        )
        prompt = f"""
Question: {request.question}

Conversation:
{conversation or 'No prior conversation.'}

Project notes:
{context}

Return a JSON object with:
- title: short answer title
- answer: concise answer in at most two short paragraphs
- highlights: array of 2 to 4 short evidence-backed bullet points
- suggested_questions: array of 3 follow-up questions about this project
""".strip()
        result = await self.provider.complete_json(HELP_SYSTEM_PROMPT, prompt)

        citations: list[str] = []
        for snippet in snippets:
            for citation in snippet.citations:
                if citation not in citations:
                    citations.append(citation)

        return HelpChatResponse(
            answer_title=result.get("title") or snippets[0].title,
            answer=result.get("answer") or snippets[0].summary,
            highlights=[str(item) for item in result.get("highlights", [])][:4],
            suggested_questions=[
                str(item) for item in result.get("suggested_questions", []) if str(item).strip()
            ][:3]
            or self._suggest_questions(snippets),
            citations=citations[:4],
        )

    async def answer(self, request: HelpChatRequest) -> HelpChatResponse:
        conversation = [turn.content for turn in request.conversation[-6:]]
        if not self._is_project_question(request.question, conversation):
            return HelpChatResponse(
                answer_title="Project guide scope",
                answer=(
                    "This assistant only answers questions about the project itself: the architecture, stack, "
                    "data model, guardrails, deployment, testing, and submission details."
                ),
                highlights=[
                    "Ask how the ERP query flow works.",
                    "Ask why DuckDB, FastAPI, React, and Gemini were chosen.",
                    "Ask how the live deployment is packaged and verified.",
                ],
                suggested_questions=[
                    "How is the project structured end to end?",
                    "Who built this project and what was the goal?",
                    "How does Gemini stay grounded and safe?",
                ],
                citations=["README.md", "docs/ARCHITECTURE.md"],
            )

        snippets = self._retrieve(request.question, conversation)
        if self.provider is None:
            return self._fallback_answer(request.question, snippets)

        try:
            return await self._llm_answer(request, snippets)
        except Exception:
            return self._fallback_answer(request.question, snippets)
