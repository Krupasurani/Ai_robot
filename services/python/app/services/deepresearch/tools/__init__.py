"""
DeepResearch Tools - Adapted for Thero AI local stack.

Uses:
- SearXNG for web search (instead of Serper)
- Firecrawl for web content extraction (instead of Jina)
- Local Docling service for file parsing
- Local SandboxService for Python execution
"""

from app.services.deepresearch.tools.file_parser import FileParserTool
from app.services.deepresearch.tools.python_interpreter import PythonInterpreterTool
from app.services.deepresearch.tools.scholar import ScholarTool
from app.services.deepresearch.tools.search import SearchTool
from app.services.deepresearch.tools.visit import VisitTool

# Tool instances
_search_tool = SearchTool()
_visit_tool = VisitTool()
_scholar_tool = ScholarTool()
_python_tool = PythonInterpreterTool()
_file_tool = FileParserTool()

# Tool map for agent
TOOL_MAP = {
    "search": _search_tool,
    "visit": _visit_tool,
    "google_scholar": _scholar_tool,
    "PythonInterpreter": _python_tool,
    "parse_file": _file_tool,
}

__all__ = [
    "TOOL_MAP",
    "SearchTool",
    "VisitTool",
    "ScholarTool",
    "PythonInterpreterTool",
    "FileParserTool",
]

