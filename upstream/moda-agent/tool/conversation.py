from typing import Any, Callable, Tuple

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.messages import ModelClientStreamingChunkEvent, TextMessage
from autogen_core import CancellationToken


class AgentConversation:
    def __init__(self, agent: AssistantAgent):
        self.agent = agent

    async def chat(self, user_input: str) -> str:
        user_msg = TextMessage(content=user_input, source="user")
        response = await self.agent.on_messages([user_msg], CancellationToken())
        assert isinstance(response.chat_message, TextMessage)
        return response.chat_message.content

    async def chat_stream(self, user_input: str, on_chunk: Callable[[str], None]) -> None:
        """Simulate streaming by chunking the final reply."""
        reply = await self.chat(user_input)
        chunk_size = 50
        for idx in range(0, len(reply), chunk_size):
            on_chunk(reply[idx: idx + chunk_size])

    async def chat_stream_native(self, user_input: str, on_chunk: Callable[[str], None]) -> None:
        """Stream responses from the underlying model client, filtering out reasoning/thinking content."""
        user_msg = TextMessage(content=user_input, source="user")
        skipping_reasoning = False
        async for event in self.agent.on_messages_stream([user_msg], CancellationToken()):
            if not isinstance(event, ModelClientStreamingChunkEvent):
                continue

            delta_text = self._extract_text_from_event(event)
            if not delta_text:
                continue

            visible_text, skipping_reasoning = self._strip_reasoning_segments(delta_text, skipping_reasoning)
            if visible_text:
                on_chunk(visible_text)

    def _extract_text_from_event(self, event: ModelClientStreamingChunkEvent) -> str:
        """Extract textual delta from a streaming event with best-effort fallbacks."""
        for name in ("delta", "delta_text", "text", "content"):
            if hasattr(event, name):
                value = getattr(event, name)
                if isinstance(value, str) and value:
                    return value

        if hasattr(event, "chunk"):
            chunk = getattr(event, "chunk")
            for name in ("delta", "delta_text", "text", "content"):
                if hasattr(chunk, name):
                    value = getattr(chunk, name)
                    if isinstance(value, str) and value:
                        return value
            try:
                choices = getattr(chunk, "choices", None)
                if choices and len(choices) > 0:
                    delta = getattr(choices[0], "delta", None)
                    if delta is not None:
                        content = getattr(delta, "content", None)
                        if isinstance(content, str) and content:
                            return content
            except Exception:
                pass

        try:
            data: Any = event.model_dump()

            def _search(obj: Any) -> str:
                if isinstance(obj, dict):
                    text_value = obj.get("text")
                    content_type = obj.get("type")
                    if (
                        isinstance(text_value, str)
                        and text_value
                        and content_type not in {"reasoning", "thinking"}
                    ):
                        return text_value
                    for key in ("delta", "delta_text", "text", "content"):
                        if key in obj and isinstance(obj[key], str) and obj[key]:
                            return obj[key]
                    for value in obj.values():
                        result = _search(value)
                        if result:
                            return result
                elif isinstance(obj, list):
                    for item in obj:
                        result = _search(item)
                        if result:
                            return result
                return ""

            found = _search(data)
            if found:
                return found
        except Exception:
            pass

        return ""

    def _strip_reasoning_segments(self, text: str, skipping_reasoning: bool) -> Tuple[str, bool]:
        """Remove <think> ... </think> segments from streamed text while preserving other content."""
        if not text:
            return "", skipping_reasoning

        result: list[str] = []
        idx = 0
        while idx < len(text):
            if skipping_reasoning:
                end = text.find("</think>", idx)
                if end == -1:
                    return "".join(result), True
                idx = end + len("</think>")
                skipping_reasoning = False
                continue

            start = text.find("<think>", idx)
            closing = text.find("</think>", idx)
            if closing != -1 and (start == -1 or closing < start):
                idx = closing + len("</think>")
                continue

            if start == -1:
                result.append(text[idx:])
                break

            result.append(text[idx:start])
            idx = start + len("<think>")
            skipping_reasoning = True

        cleaned_text = "".join(result).replace("</think>", "")
        return cleaned_text, skipping_reasoning
